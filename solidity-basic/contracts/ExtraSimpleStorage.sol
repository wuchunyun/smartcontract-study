// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "./SimpleStorage.sol";

contract ExtraSimpleStorage is SimpleStorage {
    function store(uint256 numeber) public override {
        favoriteNumber = numeber + 10;
    }
}
