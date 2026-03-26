// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockV3Aggregator {
    uint256 public latestAnswer;
    uint8 public decimals;
    uint256 public version;
    uint256 public roundId;
    int256 public answer;

    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals = _decimals;
        updateAnswer(_initialAnswer);
        version = 2500000000;
    }

    function updateAnswer(int256 _answer) public {
        roundId++;
        answer = _answer;
        latestAnswer = uint256(_answer);
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            uint80(roundId),
            answer,
            block.timestamp,
            block.timestamp,
            uint80(roundId)
        );
    }

    function getRoundData(
        uint80 _roundId
    )
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, answer, block.timestamp, block.timestamp, _roundId);
    }
}
