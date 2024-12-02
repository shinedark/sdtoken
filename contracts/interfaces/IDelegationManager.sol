// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDelegationManager {
    function delegate(address operator) external;
    function undelegate(address operator) external;
    function isDelegated(address staker) external view returns (bool);
} 