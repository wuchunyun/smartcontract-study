const ethers = require("ethers")
const fs = require("fs-extra")
require("dotenv").config()

async function main() {
  //1.建立连接

  let provider = new ethers.JsonRpcProvider(process.env.RPC_URL, 1337)
  let wallet = new ethers.Wallet(process.env.PRIVATE_KEY)
  console.log("网络RPC URL:", process.env.RPC_URL);
  console.log("钱包地址:", wallet.address);
  try {
    const network = await provider.getNetwork();
    console.log("网络Chain ID:", network.chainId.toString());
  } catch (err) {
    console.error("无法连接到网络,请检查Ganache是否运行及RPC URL是否正确:", err.message);
    return;
  }

  //2.校验
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log("账户余额:", ethers.formatEther(balance), "ETH");
    if (balance === 0n) {
      console.error("账户余额为0,部署将无法进行,请检查Ganache账户");
    }
  } catch (err) {
    console.error("获取余额失败:", err.message);
  }

  //3.加载abi、bin，并构建ContractFactory
  const abi = JSON.parse(fs.readFileSync("./build/contracts_Test_sol_Test.abi", "utf8"))
  let binary = fs.readFileSync("./build/contracts_Test_sol_Test.bin", "utf8").trim()
  // 确保字节码以 '0x' 开头
  if (!binary.startsWith('0x')) {
    binary = '0x' + binary;
  }
  console.log("加载的字节码长度(不含0x):", binary.length - 2);
  const contractFactory = new ethers.ContractFactory(abi, binary, wallet.connect(provider))

  //4.部署前检查:Gas、Nonce
  console.log("正在进行部署前检查...");
  try {
    const deployTxRequest = await contractFactory.getDeployTransaction();
    const estimatedGas = await provider.estimateGas(deployTxRequest);
    console.log(`Gas估算成功,预计需要: ${estimatedGas.toString()} 单位`);
  } catch (estimateError) {
    console.error("Gas估算失败,这明确指示问题在合约字节码或构造函数：", estimateError.shortMessage || estimateError.message);
    // 如果是无效操作码错误，会在这里被捕获
    if (estimateError.info && estimateError.info.error) {
      console.error("底层虚拟机错误:", estimateError.info.error.message);
    }
    process.exit(1); // 直接退出，因为部署必然失败
  }

  //检查Nonce状态
  console.log("检查当前Nonce状态...");
  const currentNonce = await provider.getTransactionCount(wallet.address);
  console.log(`链上查询的Nonce (下一笔应为): ${currentNonce}`);
  const connectedWallet = wallet.connect(provider);
  const walletNextNonce = await connectedWallet.getNonce(); // 钱包自己认为的下一个Nonce
  console.log(`钱包对象内的Nonce (下一笔应为): ${walletNextNonce}`);
  if (currentNonce !== walletNextNonce) {
    console.warn(`Nonce不匹配,这可能导致交易被拒绝。`);
  }

  console.log("Deploying, please wait...");
  try {
    // 1. 手动获取正确的 nonce（你已经有了）
    const nonce = await provider.getTransactionCount(wallet.address);
    console.log(`将使用 Nonce: ${nonce}`);

    // 2. 手动构建部署交易数据
    const deployTxRequest = await contractFactory.getDeployTransaction();
    console.log(`交易请求构建成功`);

    // 3. 填充交易的必要字段
    const txToSend = {
      data: deployTxRequest.data,
      gasLimit: 4000000,
      nonce: nonce,
      // Ganache 通常会自动处理 chainId 和 gasPrice，但明确指定更安全
      chainId: 1337,
      // 可以设置一个合理的 gasPrice，Ganache 通常接受 0 或一个较低的值
      gasPrice: ethers.parseUnits('20', 'gwei'),
    };
    console.log(`交易对象准备完毕`);

    // 4. 使用已连接 provider 的钱包发送交易（关键！）
    const connectedWallet = wallet.connect(provider);
    const txResponse = await connectedWallet.sendTransaction(txToSend);
    console.log(`部署交易已发送！哈希: ${txResponse.hash}`);

    // 5. 等待交易被确认（挖矿）
    console.log(`等待交易确认...`);
    const receipt = await txResponse.wait(1);
    console.log(`交易已在区块 ${receipt.blockNumber} 确认！`);

    // 6. 从交易收据中获取合约地址
    const contractAddress = receipt.contractAddress;
    if (!contractAddress) {
      throw new Error("交易收据中没有合约地址，部署可能未成功。");
    }
    console.log(`合约部署成功！地址: ${contractAddress}`);

    // （可选）如果你想与合约交互，可以基于地址和ABI创建合约对象
    // const deployedContract = new ethers.Contract(contractAddress, abi, connectedWallet);
    // console.log(`合约对象已创建，可进行后续调用。`);

  } catch (error) {
    console.error("手动部署失败:");
    console.error(`错误名称: ${error.name}`);
    console.error(`错误信息: ${error.message}`);
    if (error.code) {
      console.error(`错误代码: ${error.code}`);
    }
    // 打印完整的错误对象，以便发现隐藏信息
    console.error(`完整错误:`, error);
  }

  // let currentFavoriteNumber = await contract.retrieve()
  // console.log(`Current Favorite Number: ${currentFavoriteNumber}`)
  // console.log("Updating favorite number...")
  // let transactionResponse = await contract.store(7)
  // let transactionReceipt = await transactionResponse.wait()
  // currentFavoriteNumber = await contract.retrieve()
  // console.log(`New Favorite Number: ${currentFavoriteNumber}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

