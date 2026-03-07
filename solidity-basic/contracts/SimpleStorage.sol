// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

// pragma solidity ^0.8.0;
// pragma solidity >=0.8.0 <0.9.0;

//smart contract
contract SimpleStorage {
    //max length 32
    bytes32 myBytes = "abcd";

    int myAge = -7;
    string myName = "Barleah Thornfield";
    bool flag = true;
    //Solidity 0.5.0之后引入了地址校验和验证，要求地址必须使用正确的大小写格式，以防止输入错误
    address myAddress = 0x5a136e082c9D673C97D26B4f9fF48Bf8890434fA;

    //只支持正数
    uint256 favoriteNumber;

    //结构体
    struct People {
        uint256 favoriteNumber;
        string name;
    }

    //数组
    uint256[] public anArray;

    //结构体数组
    People[] public people;

    mapping(string => uint256) public nameToFavoriteNumber;

    function store(uint256 _favoriteNumber) public virtual {
        favoriteNumber = _favoriteNumber;
    }

    //view:只读 pure：不可读写，一般用于计算
    function retrieve() public view returns (uint256) {
        return favoriteNumber;
    }

    //memory、calldata、storage
    function addPerson(string memory _name, uint256 _favoriteNumber) public {
        people.push(People(_favoriteNumber, _name));
        nameToFavoriteNumber[_name] = _favoriteNumber;
    }
}
