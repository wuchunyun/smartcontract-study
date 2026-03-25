// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

library PriceConverter {
    uint256 private constant PRECISION = 10 ** 18;

    function getPrice(
        AggregatorV3Interface priceFeed
    ) internal view returns (uint256) {
        // Sepolia ETH / USD Address
        // https://docs.chain.link/data-feeds/price-feeds/addresses?networkType=testnet&testnetPage=2
        // AggregatorV3Interface priceFeed = AggregatorV3Interface(
        //     0x694AA1769357215DE4FAC081bf1f309aDC325306
        // );
        // answer 是 Chainlink 返回的价格（带8位小数）
        // 例如，如果 ETH/USD 价格是 2000.50，则返回 2000.50*10^8=200050000000
        // 乘以 10^10 后，变成了带 18 位小数的值,这是为了与 ETH 的精度（18 位小数，即 wei）保持一致
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        return uint256(answer * 10 ** 10);
    }

    // 整体流程：
    // 用户发送 ETH → msg.value (以 wei 为单位) → 调用库函数 getConversionRate → 通过 Chainlink 预言机获取汇率 → 返回 USD 等值

    // 计算步骤分解：
    // 假设：
    // 用户发送了 0.1 ETH (msg.value = 0.1 * 10^18 = 10^17 wei)
    // ETH 价格为 $2000.50 (answer = 2000.5*10^8，带8位小数)
    // getPrice() 返回：200050000000 * 10^10 = 2000.5*10^18（带18位小数的ETH价格）
    // 计算 (ethPrice * ethAmount)：
    // 2000.5*10^18 * 10^17 = 2000.5*10^35
    // 除以 10^18：2000.5*10^35 / 10^18 = 2000.5*10^17
    // 结果 2000.5*10^17 表示 $200.05 * 10^18，即 $200.05
    function getConversionRate(
        uint256 ethAmount,
        AggregatorV3Interface priceFeed
    ) internal view returns (uint256) {
        uint256 ethPrice = getPrice(priceFeed);
        uint256 ethAmountInUsd = (ethPrice * ethAmount) / PRECISION;
        return ethAmountInUsd;
    }
}

// 重要注意事项
// 测试网地址：代码中使用的是 Sepolia 测试网 地址，主网需要使用不同的地址
// 精度处理：Solidity 不支持小数，所有计算都使用整数运算
// Gas 优化：函数标记为 internal 以减少部署成本
// 错误处理：实际项目中应添加对 latestRoundData() 返回值的完整检查

// 性能对比结果
// 写法	编译时计算	运行时性能	可读性	维护性	    推荐度
// 10 ** 18	是	        高	    高	    高	    ⭐⭐⭐⭐⭐
// 10^18	-	-	            低	    低	    ⭐ (错误写法)
// 1000000000000000000	否	    最高	低	    低	⭐⭐⭐
