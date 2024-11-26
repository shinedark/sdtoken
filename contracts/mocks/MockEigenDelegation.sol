// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockEigenDelegation {
    mapping(address => address) private _delegations;
    mapping(address => bool) private _isDelegated;

    function delegate(address operator) external {
        _delegations[msg.sender] = operator;
        _isDelegated[msg.sender] = true;
    }

    function undelegate(address operator) external {
        require(_delegations[msg.sender] == operator, "Not delegated to this operator");
        delete _delegations[msg.sender];
        _isDelegated[msg.sender] = false;
    }

    function isDelegated(address staker) external view returns (bool) {
        return _isDelegated[staker];
    }

    function getDelegatedOperator(address staker) external view returns (address) {
        return _delegations[staker];
    }
} 