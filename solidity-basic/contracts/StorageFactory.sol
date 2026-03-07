// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "./SimpleStorage.sol";

contract StorageFactory {
    SimpleStorage[] internal simpleStorageArray;

    function createSimpleStorage() public {
        simpleStorageArray.push(new SimpleStorage());
    }

    function sfStore(uint256 index, uint256 number) public {
        simpleStorageArray[index].store(number);
    }

    function sfGet(uint256 index) public view returns (uint256) {
        return simpleStorageArray[index].retrieve();
    }
}
