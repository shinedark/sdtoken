// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MockDelegationManager is Ownable {
    // Mapping of operator => delegator => is approved
    mapping(address => mapping(address => bool)) public operatorDelegations;
    
    // Mapping to track if an address is registered as an operator
    mapping(address => bool) public isOperator;

    event OperatorRegistered(address indexed operator);
    event DelegationApproved(address indexed operator, address indexed delegator);
    event DelegationRevoked(address indexed operator, address indexed delegator);

    function registerAsOperator() external {
        require(!isOperator[msg.sender], "Already registered as operator");
        isOperator[msg.sender] = true;
        emit OperatorRegistered(msg.sender);
    }

    function approveOperator(address operator) external {
        require(isOperator[operator], "Not a registered operator");
        operatorDelegations[operator][msg.sender] = true;
        emit DelegationApproved(operator, msg.sender);
    }

    function revokeOperator(address operator) external {
        operatorDelegations[operator][msg.sender] = false;
        emit DelegationRevoked(operator, msg.sender);
    }

    function isDelegated(address delegator, address operator) external view returns (bool) {
        return operatorDelegations[operator][delegator];
    }

    function isOperatorRegistered(address operator) external view returns (bool) {
        return isOperator[operator];
    }
} 