// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStrategy {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function shares(address account) external view returns (uint256);
    function totalShares() external view returns (uint256);
} 