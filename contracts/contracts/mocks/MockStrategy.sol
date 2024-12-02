// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockStrategy {
    using SafeERC20 for IERC20;

    mapping(address => uint256) private _shares;
    uint256 private _totalShares;
    IERC20 public immutable stakingToken;

    constructor(address _stakingToken) {
        require(_stakingToken != address(0), "Invalid token address");
        stakingToken = IERC20(_stakingToken);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Cannot deposit 0");
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        _shares[msg.sender] += amount;
        _totalShares += amount;
    }

    function withdraw(uint256 amount) external {
        require(_shares[msg.sender] >= amount, "Insufficient shares");
        _shares[msg.sender] -= amount;
        _totalShares -= amount;
        stakingToken.safeTransfer(msg.sender, amount);
    }

    function shares(address account) external view returns (uint256) {
        return _shares[account];
    }

    function totalShares() external view returns (uint256) {
        return _totalShares;
    }
} 