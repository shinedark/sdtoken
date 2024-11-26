// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockEigenStrategy {
    mapping(address => uint256) private _shares;
    uint256 private _totalShares;

    function deposit(uint256 amount) external {
        _shares[msg.sender] += amount;
        _totalShares += amount;
    }

    function withdraw(uint256 amount) external {
        require(_shares[msg.sender] >= amount, "Insufficient shares");
        _shares[msg.sender] -= amount;
        _totalShares -= amount;
    }

    function shares(address account) external view returns (uint256) {
        return _shares[account];
    }

    function totalShares() external view returns (uint256) {
        return _totalShares;
    }
} 