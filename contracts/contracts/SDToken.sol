// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IDelegationManager.sol";

contract SDToken is ERC20, ERC20Snapshot, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // EigenLayer interfaces
    IStrategy public eigenStrategy;
    IDelegationManager public delegationManager;

    // Constants
    address public constant ARTIST_ADDRESS = 0xfB91A0Dba31ba4d042886C2A0b3AA23BFb23F196;
    uint256 public constant ARTIST_SHARE = 70;
    uint256 public constant STAKERS_SHARE = 30;
    uint256 public constant BASIS_POINTS = 100;
    uint256 public constant MONTH = 30 days;

    // Structs
    struct MonthlyRoyalty {
        uint256 totalAmount;
        uint256 streamCount;
        uint256 timestamp;
        bool distributed;
    }

    struct TokenMetrics {
        uint256 totalStreamCount;
        uint256 totalRoyalties;
        uint256 lastPriceUpdate;
        uint256 basePrice;
    }

    // State variables
    mapping(address => uint256) private stakes;
    mapping(address => uint256) private pendingRewards;
    mapping(uint256 => MonthlyRoyalty) public monthlyRoyalties;
    mapping(address => bool) public operators;
    TokenMetrics public tokenMetrics;
    uint256 public currentMonth;
    uint256 private _currentSnapshotId;

    // Staker tracking
    address[] private stakers;
    mapping(address => bool) private isStaker;
    uint256 public artistWithdrawableBalance;

    // Events
    event StreamingFundingRoyaltiesDeposited(address indexed from, uint256 amount, uint256 streamCount);
    event RoyaltiesWithdrawn(address indexed to, uint256 amount);
    event Staked(address indexed staker, uint256 amount);
    event Unstaked(address indexed staker, uint256 amount);
    event RoyaltiesDistributed(uint256 artistAmount, uint256 stakersAmount, uint256 monthIndex);
    event EigenLayerStrategyUpdated(address indexed newStrategy);
    event DelegationManagerUpdated(address indexed newManager);
    event TokenPriceUpdated(uint256 newPrice, uint256 streamCount);
    event MonthlyMetricsSnapshot(uint256 indexed monthIndex, uint256 totalStreams, uint256 totalRoyalties);
    event ArtistWithdrawal(uint256 amount, uint256 timestamp);

    constructor() ERC20("SKJ Token", "SKJ") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function initialize(address _eigenStrategy, address _delegationManager) external onlyOwner {
        require(_eigenStrategy != address(0), "Invalid strategy address");
        require(_delegationManager != address(0), "Invalid delegation manager address");
        
        eigenStrategy = IStrategy(_eigenStrategy);
        delegationManager = IDelegationManager(_delegationManager);
        
        tokenMetrics.basePrice = 1e18; // 1 USD in wei
        tokenMetrics.lastPriceUpdate = block.timestamp;
        currentMonth = block.timestamp / MONTH;
        
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /**
     * @notice Update token price based on performance metrics
     * @param newStreams New stream count
     * @param newRoyalties New royalties amount
     */
    function updateTokenPrice(uint256 newStreams, uint256 newRoyalties) internal {
        uint256 timePassed = block.timestamp - tokenMetrics.lastPriceUpdate;
        if (timePassed >= MONTH) {
            // Calculate growth factors with higher precision
            uint256 streamGrowth = tokenMetrics.totalStreamCount > 0 
                ? (newStreams * 1e18 * 1e9) / tokenMetrics.totalStreamCount 
                : 2e18 * 1e9; // 2x growth for first month
                
            uint256 royaltyGrowth = tokenMetrics.totalRoyalties > 0
                ? (newRoyalties * 1e18 * 1e9) / tokenMetrics.totalRoyalties
                : 2e18 * 1e9; // 2x growth for first month
            
            // Average of stream and royalty growth
            uint256 growthFactor = (streamGrowth + royaltyGrowth) / 2;
            
            // Apply growth factor with higher precision, minimum 1.1x growth if performance improved
            if (growthFactor > 1e27) { // 1e18 * 1e9
                tokenMetrics.basePrice = (tokenMetrics.basePrice * growthFactor) / 1e27;
            } else {
                tokenMetrics.basePrice = (tokenMetrics.basePrice * 11) / 10; // 1.1x minimum growth
            }
            
            tokenMetrics.lastPriceUpdate = block.timestamp;
            emit TokenPriceUpdated(tokenMetrics.basePrice, newStreams);
        }
    }

    /**
     * @notice Distribute monthly royalties between artist and stakers
     * @param monthIndex The month index to process
     */
    function distributeMonthlyRoyalties(uint256 monthIndex) internal {
        MonthlyRoyalty storage royalty = monthlyRoyalties[monthIndex];
        require(!royalty.distributed, "Already distributed");
        
        uint256 artistAmount = (royalty.totalAmount * ARTIST_SHARE) / BASIS_POINTS;
        uint256 stakersAmount = royalty.totalAmount - artistAmount;
        
        // Add artist's share to withdrawable balance
        artistWithdrawableBalance += artistAmount;
        
        // Distribute stakers' share if there are stakers
        uint256 totalStaked = eigenStrategy.totalShares();
        if (totalStaked > 0) {
            distributeStakersRewards(stakersAmount);
        }
        
        royalty.distributed = true;
        emit RoyaltiesDistributed(artistAmount, stakersAmount, monthIndex);
    }

    /**
     * @notice Allow artist to withdraw their available balance
     */
    function artistWithdraw() external {
        require(msg.sender == ARTIST_ADDRESS, "Only artist can withdraw");
        require(artistWithdrawableBalance > 0, "No funds available");
        
        uint256 amount = artistWithdrawableBalance;
        artistWithdrawableBalance = 0;
        
        payable(ARTIST_ADDRESS).transfer(amount);
        emit ArtistWithdrawal(amount, block.timestamp);
    }

    /**
     * @notice Get monthly royalty data
     * @param monthIndex Month to query
     * @return MonthlyRoyalty data
     */
    function getMonthlyRoyalty(uint256 monthIndex) external view returns (MonthlyRoyalty memory) {
        return monthlyRoyalties[monthIndex];
    }

    /**
     * @notice Create a new snapshot
     */
    function _snapshot() internal override returns (uint256) {
        _currentSnapshotId++;
        emit Snapshot(_currentSnapshotId);
        return _currentSnapshotId;
    }

    /**
     * @notice Distribute rewards to stakers based on their stake
     */
    function distributeStakersRewards(uint256 amount) internal {
        uint256 totalStaked = eigenStrategy.totalShares();
        require(totalStaked > 0, "No stakes to distribute to");

        for (uint256 i = 0; i < getStakersCount(); i++) {
            address staker = getStakerAtIndex(i);
            uint256 stakerShare = eigenStrategy.shares(staker);
            uint256 reward = (amount * stakerShare) / totalStaked;
            pendingRewards[staker] += reward;
        }
    }

    /**
     * @notice Deposit monthly streaming royalties and update token metrics
     */
    function depositMonthlyRoyalties(uint256 streamCount) external payable onlyOwner nonReentrant {
        require(msg.value > 0, "No funds provided");
        require(streamCount > 0, "Stream count must be positive");
        
        uint256 monthIndex = block.timestamp / MONTH;
        require(!monthlyRoyalties[monthIndex].distributed, "Month already processed");
        
        monthlyRoyalties[monthIndex] = MonthlyRoyalty({
            totalAmount: msg.value,
            streamCount: streamCount,
            timestamp: block.timestamp,
            distributed: false
        });

        tokenMetrics.totalStreamCount += streamCount;
        tokenMetrics.totalRoyalties += msg.value;
        updateTokenPrice(streamCount, msg.value);
        
        _snapshot();
        emit MonthlyMetricsSnapshot(monthIndex, tokenMetrics.totalStreamCount, tokenMetrics.totalRoyalties);
        
        distributeMonthlyRoyalties(monthIndex);
    }

    /**
     * @notice Stake tokens through EigenLayer
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(amount > 0, "Cannot stake 0 tokens");

        _snapshot();
        _transfer(msg.sender, address(this), amount);
        IERC20(address(this)).safeApprove(address(eigenStrategy), amount);
        eigenStrategy.deposit(amount);
        
        stakes[msg.sender] += amount;
        if (!isStaker[msg.sender]) {
            _addStaker(msg.sender);
        }
        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Unstake tokens from EigenLayer
     */
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        require(stakes[msg.sender] >= amount, "Insufficient staked balance");
        require(amount > 0, "Cannot unstake 0 tokens");

        _snapshot();
        eigenStrategy.withdraw(amount);
        stakes[msg.sender] -= amount;
        _transfer(address(this), msg.sender, amount);
        
        _removeStaker(msg.sender);
        emit Unstaked(msg.sender, amount);
    }

    // Override required functions
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20, ERC20Snapshot) {
        super._beforeTokenTransfer(from, to, amount);
    }

    // Helper functions
    function _addStaker(address staker) internal {
        if (!isStaker[staker]) {
            isStaker[staker] = true;
            stakers.push(staker);
        }
    }

    function _removeStaker(address staker) internal {
        uint256 shares = eigenStrategy.shares(staker);
        if (isStaker[staker] && shares == 0) {
            isStaker[staker] = false;
            for (uint256 i = 0; i < stakers.length; i++) {
                if (stakers[i] == staker) {
                    stakers[i] = stakers[stakers.length - 1];
                    stakers.pop();
                    break;
                }
            }
        }
    }

    // View functions
    function getCurrentPrice() external view returns (uint256) {
        return tokenMetrics.basePrice;
    }

    function getStakedBalance(address account) external view returns (uint256) {
        return stakes[account];
    }

    function getStakersCount() public view returns (uint256) {
        return stakers.length;
    }

    function getStakerAtIndex(uint256 index) public view returns (address) {
        require(index < stakers.length, "Index out of bounds");
        return stakers[index];
    }

    // Emergency functions
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Receive function to accept ETH
    receive() external payable {}
} 