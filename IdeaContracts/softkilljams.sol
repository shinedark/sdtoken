// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SKJMusicToken is ERC20, Ownable {
    // Event for royalties deposited into the contract
    event StreamingFundingRoyaltiesDeposited(address indexed from, uint256 amount);
    event RoyaltiesWithdrawn(address indexed to, uint256 amount);
    event Staked(address indexed staker, uint256 amount);
    event Unstaked(address indexed staker, uint256 amount);

    // Mapping to store staked balances
    mapping(address => uint256) private stakes;

    // Constructor to initialize the token
    constructor() ERC20("SKJ Token", "SKJ") {
        // Mint an initial supply for the contract owner
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /**
     * @notice Deposit streaming royalties into the contract
     */
    function depositStreamingFundingRoyalties() external payable onlyOwner {
        require(msg.value > 0, "No funds provided");
        emit StreamingFundingRoyaltiesDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw royalties from the contract
     * @param recipient Address to receive the royalties
     * @param amount Amount to withdraw
     */
    function withdrawStreamingFundingRoyalties(address payable recipient, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient funds");
        recipient.transfer(amount);
        emit RoyaltiesWithdrawn(recipient, amount);
    }

    /**
     * @notice Stake SKJ tokens
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        stakes[msg.sender] += amount;
        _burn(msg.sender, amount);
        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Unstake SKJ tokens
     * @param amount Amount of tokens to unstake
     */
    function unstake(uint256 amount) external {
        require(stakes[msg.sender] >= amount, "Insufficient staked balance");
        stakes[msg.sender] -= amount;
        _mint(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Get the staked balance of an address
     * @param staker Address to check the staked balance
     * @return Staked balance
     */
    function getStakedBalance(address staker) external view returns (uint256) {
        return stakes[staker];
    }
}
