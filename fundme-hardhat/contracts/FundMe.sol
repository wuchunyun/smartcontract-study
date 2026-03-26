// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Chainlink 集成：用于获取实时 ETH/USD 价格
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
// 自定义库: 导入本地的 PriceConverter.sol 库，用于 ETH 到 USD 转换
import "./PriceConverter.sol";

// 定义自定义错误 NotOwner()，当非所有者尝试访问受保护函数时使用，比 require 更节省 gas
error NotOwner();

//定义事件
event FallbackCalled(address sender,uint256 value);
event ReceiveCalled(address sender,uint256 value);

// 声明 FundMe 合约
contract FundMe {
    // 库扩展: 将 PriceConverter 库的功能扩展到 uint256 类型，允许 uint256 值直接调用库函数
    using PriceConverter for uint256;

    // 映射: 存储每个地址及其资助金额的映射关系，public 会自动生成 getter 函数
    mapping(address => uint256) public addressToAmountFunded;

    // 动态数组: 存储所有资助者的地址列表，public 自动生成 getter 函数
    address[] public funders;

    // 不可变地址: 存储合约所有者地址，一旦设置就不能更改，public 自动生成 getter
    address public immutable i_owner;

    // 常量: 设置最小资助金额为 50 美元，使用 18 位小数精度（wei 级别）
    uint256 public constant MINIMUM_USD = 50 * 10 ** 18;

    // 价格预言机接口: 存储 Chainlink 价格预言机接口实例，public 自动生成 getter
    AggregatorV3Interface public s_priceFeed;

    // 构造函数: 合约部署时执行一次
    // 设置所有者: 将部署合约的地址设为所有者
    // 设置价格预言机: 初始化 Chainlink 价格预言机接口
    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    // 公共可支付函数: 任何人都可以调用并发送 ETH
    function fund() public payable {
        // 条件检查: 验证发送的 ETH 价值是否达到最低美元要求
        // 调用库函数: 使用扩展库函数计算 ETH 对应的美元价值
        require(
            msg.value.getConversionRate(s_priceFeed) >= MINIMUM_USD,
            "You need to spend more ETH!"
        );

        // 记录金额: 保存发送者之前的资助金额，然后累加新的资助金额
        uint256 previousAmount = addressToAmountFunded[msg.sender];
        addressToAmountFunded[msg.sender] += msg.value;

        // 首次资助检查: 如果是第一次资助，将其添加到资助者数组中
        if (previousAmount == 0) {
            funders.push(msg.sender);
        }
    }

    // 视图函数: 不修改状态，返回价格预言机的版本号
    function getVersion() public view returns (uint256) {
        return s_priceFeed.version();
    }

    // 所有者修饰符: 限制只有合约所有者才能调用被修饰的函数
    // 错误处理: 使用自定义错误而不是 require
    // 占位符: _ 表示被修饰函数的主体
    modifier onlyOwner() {
        // require(msg.sender == owner);
        if (msg.sender != i_owner) revert NotOwner();
        //执行被修饰函数
        _;
    }

    //提取
    function withdraw() public onlyOwner {
        // 清零循环: 遍历所有资助者，将其资助金额重置为 0
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex];
            addressToAmountFunded[funder] = 0;
        }
        // 数组重置: 创建一个新的空数组替换原数组，清空所有资助者
        funders = new address[](0);

        //三种转账方式 from：？  to：？
        // transfer
        // payable(msg.sender).transfer(address(this).balance);

        // send
        // bool sendSuccess = payable(msg.sender).send(address(this).balance);
        // require(sendSuccess, "Send failed");

        // 资金转移: 使用 call 方法将合约所有余额转给所有者
        // 安全检查: 验证转账是否成功
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
    fallback() external payable {
        emit FallbackCalled(msg.sender,msg.value);
        fund();
    }

    // 触发条件：
    receive() external payable {
        emit ReceiveCalled(msg.sender,msg.value);
        fund();
    }
    // 在合约末尾添加以下函数，用于测试
    function getFundersLength() public view returns (uint256) {
        return funders.length;
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
