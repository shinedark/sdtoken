// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// OpenZeppelin imports
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

// EigenLayer interface definitions
interface IStrategy {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function shares(address account) external view returns (uint256);
    function totalShares() external view returns (uint256);
}

interface IDelegationManager {
    function delegate(address operator) external;
    function undelegate(address operator) external;
    function isDelegated(address staker) external view returns (bool);
}

/**
 * @title SKJMusicToken
 * @dev A token contract for Shine Dark's music streaming royalties with EigenLayer integration
 * 
 * This contract handles:
 * 1. Monthly streaming royalty distributions
 * 2. EigenLayer staking for network security
 * 3. Reward distribution to stakers
 * 4. Token value appreciation based on streaming performance
 */
contract SKJMusicToken is ERC20, ERC20Snapshot, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // EigenLayer interfaces
    IStrategy public eigenStrategy;
    IDelegationManager public delegationManager;

    // Artist address
    address public constant ARTIST_ADDRESS = 0xfB91A0Dba31ba4d042886C2A0b3AA23BFb23F196;
    
    // Royalty distribution parameters
    uint256 public constant ARTIST_SHARE = 70; // 70% goes to artist
    uint256 public constant STAKERS_SHARE = 30; // 30% goes to stakers
    uint256 public constant BASIS_POINTS = 100;
    uint256 public constant MONTH = 30 days;

    // Monthly royalty tracking
    struct MonthlyRoyalty {
        uint256 totalAmount;
        uint256 streamCount;
        uint256 timestamp;
        bool distributed;
    }

    // Token economics
    struct TokenMetrics {
        uint256 totalStreamCount;
        uint256 totalRoyalties;
        uint256 lastPriceUpdate;
        uint256 basePrice;
    }

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

    // State variables
    mapping(address => uint256) private stakes;
    mapping(address => uint256) private pendingRewards;
    mapping(uint256 => MonthlyRoyalty) public monthlyRoyalties;
    mapping(address => bool) public operators;
    TokenMetrics public tokenMetrics;
    uint256 public currentMonth;
    uint256 private snapshotId;

    constructor(
        address _eigenStrategy,
        address _delegationManager
    ) ERC20("SKJ Token", "SKJ") {
        require(_eigenStrategy != address(0), "Invalid strategy address");
        require(_delegationManager != address(0), "Invalid delegation manager address");
        
        eigenStrategy = IStrategy(_eigenStrategy);
        delegationManager = IDelegationManager(_delegationManager);
        
        tokenMetrics.basePrice = 1e18; // 1 USD in wei
        tokenMetrics.lastPriceUpdate = block.timestamp;
        currentMonth = block.timestamp / MONTH;
        
        // Mint initial supply for the contract owner
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /**
     * @notice Deposit monthly streaming royalties and update token metrics
     * @param streamCount Number of streams for the month
     */
    function depositMonthlyRoyalties(uint256 streamCount) external payable onlyOwner nonReentrant {
        require(msg.value > 0, "No funds provided");
        require(streamCount > 0, "Stream count must be positive");
        
        uint256 monthIndex = block.timestamp / MONTH;
        require(!monthlyRoyalties[monthIndex].distributed, "Month already processed");
        
        // Update monthly royalty data
        monthlyRoyalties[monthIndex] = MonthlyRoyalty({
            totalAmount: msg.value,
            streamCount: streamCount,
            timestamp: block.timestamp,
            distributed: false
        });

        // Update token metrics
        tokenMetrics.totalStreamCount += streamCount;
        tokenMetrics.totalRoyalties += msg.value;
        updateTokenPrice(streamCount, msg.value);
        
        // Take snapshot for the month
        _snapshot();
        emit MonthlyMetricsSnapshot(monthIndex, tokenMetrics.totalStreamCount, tokenMetrics.totalRoyalties);
        
        // Distribute royalties
        distributeMonthlyRoyalties(monthIndex);
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
        
        // Transfer artist's share
        payable(ARTIST_ADDRESS).transfer(artistAmount);
        
        // Distribute stakers' share
        distributeStakersRewards(stakersAmount);
        
        royalty.distributed = true;
        emit RoyaltiesDistributed(artistAmount, stakersAmount, monthIndex);
    }

    /**
     * @notice Update token price based on performance metrics
     * @param newStreams New stream count
     * @param newRoyalties New royalties amount
     */
    function updateTokenPrice(uint256 newStreams, uint256 newRoyalties) internal {
        uint256 timePassed = block.timestamp - tokenMetrics.lastPriceUpdate;
        if (timePassed >= MONTH) {
            // Simple price adjustment based on growth
            uint256 streamGrowth = (newStreams * 1e18) / tokenMetrics.totalStreamCount;
            uint256 royaltyGrowth = (newRoyalties * 1e18) / tokenMetrics.totalRoyalties;
            
            // Average of stream and royalty growth
            uint256 growthFactor = (streamGrowth + royaltyGrowth) / 2;
            tokenMetrics.basePrice = (tokenMetrics.basePrice * growthFactor) / 1e18;
            
            tokenMetrics.lastPriceUpdate = block.timestamp;
            emit TokenPriceUpdated(tokenMetrics.basePrice, newStreams);
        }
    }

    /**
     * @notice Stake tokens through EigenLayer
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(amount > 0, "Cannot stake 0 tokens");

        // Take snapshot before stake
        _snapshot();
        
        // Transfer tokens to this contract
        _transfer(msg.sender, address(this), amount);
        
        // Approve EigenLayer strategy
        IERC20(address(this)).safeApprove(address(eigenStrategy), amount);
        
        // Deposit into EigenLayer
        eigenStrategy.deposit(amount);
        
        stakes[msg.sender] += amount;
        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Unstake tokens from EigenLayer
     * @param amount Amount of tokens to unstake
     */
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        require(stakes[msg.sender] >= amount, "Insufficient staked balance");
        require(amount > 0, "Cannot unstake 0 tokens");

        // Take snapshot before unstake
        _snapshot();
        
        // Withdraw from EigenLayer
        eigenStrategy.withdraw(amount);
        
        stakes[msg.sender] -= amount;
        _transfer(address(this), msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Get current token price
     * @return Current price of the token
     */
    function getCurrentPrice() external view returns (uint256) {
        return tokenMetrics.basePrice;
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
     * @notice Get staked balance at a specific snapshot
     * @param account Address to check
     * @param snapshotId Snapshot ID
     * @return Balance at snapshot
     */
    function stakedBalanceAt(address account, uint256 snapshotId) external view returns (uint256) {
        return balanceOfAt(account, snapshotId);
    }

    // Override required function for ERC20Snapshot
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20, ERC20Snapshot) {
        super._beforeTokenTransfer(from, to, amount);
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
