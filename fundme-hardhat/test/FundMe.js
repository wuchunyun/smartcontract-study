const { assert, expect } = require("chai");
const { ethers, network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

describe("FundMe", function () {
  let fundMe;
  let mockV3Aggregator;
  let deployer;
  let account2;
  let account3;
  const sendValue = ethers.utils.parseEther("1"); // 1 ETH

  // 只在开发链上运行的测试（如本地节点或 hardhat network）
  beforeEach(async function () {
    // 多账户测试，使用connect()方法切换账户
    [deployer, account2, account3] = await ethers.getSigners();
    // deployer = signers[0] (第一个默认账户)

    if (developmentChains.includes(network.name)) {
      // 如果在开发链上运行，部署模拟的 Chainlink 预言机
      // 必须先编译: 在使用 getContractFactory 之前，必须先运行 npx hardhat compile
      // 大小写敏感: 合约名称区分大小写
      // 完整路径: Hardhat 会自动处理嵌套目录结构，你只需要提供合约名称
      const MockV3Aggregator = await ethers.getContractFactory(
        "MockV3Aggregator"
      );
      // 隐式部署者: 如果不使用 .connect()，则使用默认的第一个账户作为部署者
      mockV3Aggregator = await MockV3Aggregator.deploy(8, 200000000000); // 8位小数，价格为2000

      const FundMe = await ethers.getContractFactory("FundMe");
      fundMe = await FundMe.deploy(mockV3Aggregator.address);
    } else {
      // 如果在测试网（如 Sepolia）上运行，使用真实的 Chainlink 预言机地址
      const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Sepolia 测试网
      const FundMe = await ethers.getContractFactory("FundMe");
      fundMe = await FundMe.deploy(priceFeedAddress);
    }
    await fundMe.deployed();
  });


  describe("constructor", function () {
    // 测试目的：确保构造函数正确设置了价格预言机地址。
    it("sets the aggregator addresses correctly", async function () {
      const response = await fundMe.s_priceFeed();
      assert.equal(response, mockV3Aggregator ? mockV3Aggregator.address : "0x694AA1769357215DE4FAC081bf1f309aDC325306");
    });

    // 测试目的：确保构造函数正确将部署者设置为合约所有者。
    it("should set the owner correctly", async function () {
      const response = await fundMe.i_owner();
      assert.equal(response, deployer.address);
    });
  });

  describe("fund", function () {
    it("fails if you don't send enough ETH", async function () {
      await expect(fundMe.fund()).to.be.revertedWith("You need to spend more ETH!");
    });

    it("updated the amount funded data structure", async function () {
      await fundMe.fund({ value: sendValue });
      const response = await fundMe.addressToAmountFunded(deployer.address);
      assert.equal(response.toString(), sendValue.toString());
    });

    it("adds funder to array of funders", async function () {
      await fundMe.fund({ value: sendValue });
      const funder = await fundMe.funders(0);
      assert.equal(funder, deployer.address);
    });

    it("doesn't add funder to array if already funded", async function () {
      await fundMe.fund({ value: sendValue });
      await fundMe.fund({ value: sendValue });

      const funderCount = await fundMe.getFundersLength();
      assert.equal(funderCount.toString(), "1");
    });
  });

  describe("withdraw", function () {
    beforeEach(async function () {
      await fundMe.fund({ value: sendValue });
    });

    it("withdraws ETH from a single funder", async function () {
      // Arrange
      const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
      const startingDeployerBalance = await fundMe.provider.getBalance(deployer.address);

      // Act
      const transactionResponse = await fundMe.withdraw();
      const transactionReceipt = await transactionResponse.wait();
      const { gasUsed, effectiveGasPrice } = transactionReceipt;
      const gasCost = gasUsed.mul(effectiveGasPrice);

      const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
      const endingDeployerBalance = await fundMe.provider.getBalance(deployer.address);

      // Assert
      assert.equal(endingFundMeBalance, 0);
      assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(),
        endingDeployerBalance.add(gasCost).toString());
    });

    it("is allows us to withdraw with multiple funders", async function () {
      // Arrange
      const accounts = await ethers.getSigners();
      for (let i = 1; i < 6; i++) {
        const fundMeConnectedContract = await fundMe.connect(accounts[i]);
        await fundMeConnectedContract.fund({ value: sendValue });
      }
      const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
      const startingDeployerBalance = await fundMe.provider.getBalance(deployer.address);

      // Act
      const transactionResponse = await fundMe.withdraw();
      const transactionReceipt = await transactionResponse.wait();
      const { gasUsed, effectiveGasPrice } = transactionReceipt;
      const gasCost = gasUsed.mul(effectiveGasPrice);

      const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
      const endingDeployerBalance = await fundMe.provider.getBalance(deployer.address);

      // Assert
      assert.equal(endingFundMeBalance, 0);
      assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(),
        endingDeployerBalance.add(gasCost).toString());

      // Make sure that the funders are reset properly
      await expect(fundMe.funders(0)).to.be.reverted;

      for (let i = 1; i < 6; i++) {
        assert.equal(await fundMe.addressToAmountFunded(accounts[i].address), 0);
      }
    });

    it("only allows the owner to withdraw", async function () {
      const accounts = await ethers.getSigners();
      const fundMeConnectedContract = await fundMe.connect(accounts[1]);
      await expect(fundMeConnectedContract.withdraw()).to.be.revertedWithCustomError(fundMe, "NotOwner");
    });
  });

  describe("cheaperWithdraw", function () {
    beforeEach(async function () {
      await fundMe.fund({ value: sendValue });
    });

    it("withdraws ETH from a single funder", async function () {
      // Arrange
      const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
      const startingDeployerBalance = await fundMe.provider.getBalance(deployer.address);

      // Act
      const transactionResponse = await fundMe.cheaperWithdraw();
      const transactionReceipt = await transactionResponse.wait();
      const { gasUsed, effectiveGasPrice } = transactionReceipt;
      const gasCost = gasUsed.mul(effectiveGasPrice);

      const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
      const endingDeployerBalance = await fundMe.provider.getBalance(deployer.address);

      // Assert
      assert.equal(endingFundMeBalance, 0);
      assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(),
        endingDeployerBalance.add(gasCost).toString());
    });
  });

  describe("fallback and receive functions", function () {
    it("Should trigger fallback when sending data with ETH", async function () {
      await expect(
        deployer.sendTransaction({
          to: fundMe.address,
          value: sendValue,
          data: "0x123456"  // 添加一些数据，会触发 fallback
        })
      ).to.emit(fundMe, "FallbackCalled")
        .withArgs(deployer.address, sendValue);
    });

    it("Should trigger receive when sending ETH without data", async function () {
      await expect(
        deployer.sendTransaction({
          to: fundMe.address,
          value: sendValue
          // 不包含 data 字段，会触发 receive
        })
      ).to.emit(fundMe, "ReceiveCalled")
        .withArgs(deployer.address, sendValue);
    });
  });
});