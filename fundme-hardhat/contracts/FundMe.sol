// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

//Chainlink 集成：用于获取实时 ETH/USD 价格
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

//自定义异常
error NotOwner();

contract FundMe {
    //使用library
    using PriceConverter for uint256;

    //类似java HashMap
    mapping(address => uint256) public addressToAmountFunded;

    //转账人数组
    address[] public funders;

    // Could we make this constant?  /* hint: no! We should make it immutable! */
    //合约所有者
    address public immutable i_owner;

    //可转账的最小USD ？
    uint256 public constant MINIMUM_USD = 50 * 10 ** 18;

    //构造函数：初始化i_owner为合约部署的用户
    constructor() {
        i_owner = msg.sender;
    }

    //资助
    function fund() public payable {
        //校验最小转账金额
        require(
            msg.value.getConversionRate() >= MINIMUM_USD,
            "You need to spend more ETH!"
        );
        // require(PriceConverter.getConversionRate(msg.value) >= MINIMUM_USD, "You need to spend more ETH!");

        //资助人--累计转账金额
        addressToAmountFunded[msg.sender] += msg.value;

        //资助人名单，如果是新捐赠者才添加到数组
        if (addressToAmountFunded[msg.sender] == 0) {
            funders.push(msg.sender);
        }
    }

    //返回 Chainlink 价格源的版本号
    //用于测试和验证价格源连接
    function getVersion() public view returns (uint256) {
        // ETH/USD price feed address of Sepolia Network.
        // chainlink官方文档：https://docs.chain.link/data-feeds/price-feeds/addresses
        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            0x694AA1769357215DE4FAC081bf1f309aDC325306
        );
        return priceFeed.version();
    }

    //所有者修饰器：校验当前提取人是否为合约所有者
    modifier onlyOwner() {
        // require(msg.sender == owner);
        if (msg.sender != i_owner) revert NotOwner();
        //执行被修饰函数
        _;
    }

    //提取
    function withdraw() public onlyOwner {
        //for循环：转账人累计金额置为0
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex];
            addressToAmountFunded[funder] = 0;
        }
        //转账人数组重置
        funders = new address[](0);

        //三种转账方式 from：？  to：？
        // transfer
        // payable(msg.sender).transfer(address(this).balance);

        // send
        // bool sendSuccess = payable(msg.sender).send(address(this).balance);
        // require(sendSuccess, "Send failed");

        // call 提取资金
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }

    // Explainer from: https://solidity-by-example.org/fallback/
    // Ether is sent to contract
    //      is msg.data empty?
    //          /   \
    //         yes  no
    //         /     \
    //    receive()?  fallback()
    //     /   \
    //   yes   no
    //  /        \
    //receive()  fallback()

    // 触发条件：
    // 纯 ETH 转账（无 msg.data）
    // 直接向合约地址发送 ETH
    fallback() external payable {
        fund();
    }

    // 触发条件：
    // 调用不存在的函数
    // ETH 转账带有 msg.data
    // 任何不匹配的函数调用
    receive() external payable {
        fund();
    }
}

// 三种转账方式对比：
// 方式	            语法	                  Gas 限制	        失败处理
// transfer	payable(to).transfer(amount)	2300 Gas	        自动回滚
// send	    payable(to).send(amount)	    2300 Gas	        返回 bool
// call	    to.call{value: amount}("")	    所有 Gas	        返回 (bool, bytes)

// 为什么选择 call？
// 没有 Gas 限制
// 更灵活，可以调用任意函数
// 当前推荐的最佳实践

// this 代表当前合约实例的地址
// 获取合约自身的以太币余额：address(this).balance
// msg.sender是当前函数调用（或交易）的发送者的地址。它属于address类型。始终是 外部账户地址（EOA）或 合约地址
// msg.value是随交易发送的以太币的数量，以wei为单位。它属于uint256类型。
// msg.data 包含完整的函数调用数据

// Concepts we didn't cover yet (will cover in later sections)
// 1. Enum
// 2. Events
// 3. Try / Catch
// 4. Function Selector
// 5. abi.encode / decode
// 6. Hash with keccak256
// 7. Yul / Assembly
