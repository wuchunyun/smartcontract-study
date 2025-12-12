const ethers = require("ethers");
const fs = require("fs-extra");
require("dotenv").config();

async function main() {
  // 1. Establish connection
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL, 1337);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  const connectedWallet = wallet.connect(provider);
  console.log("网络RPC URL:", process.env.RPC_URL);
  console.log("钱包地址:", wallet.address);

  // 2. Network and account validation
  await validateNetwork(provider);
  await validateAccount(provider, wallet.address);

  // 3. Load ABI and bytecode, build ContractFactory
  const { abi, binary } = loadContractArtifacts();
  const contractFactory = new ethers.ContractFactory(abi, binary, connectedWallet);

  // 4. Pre-deployment checks
  await performPreDeploymentChecks(contractFactory, provider, connectedWallet);

  // 5. Deploy contract
  const contractAddress = await deployContract(contractFactory, connectedWallet);

  console.log(`合约部署成功！地址: ${contractAddress}`);
}

async function validateNetwork(provider) {
  try {
    const network = await provider.getNetwork();
    console.log("网络Chain ID:", network.chainId.toString());
  } catch (err) {
    console.error("无法连接到网络,请检查Ganache是否运行及RPC URL是否正确:", err.message);
    process.exit(1);
  }
}

async function validateAccount(provider, address) {
  try {
    const balance = await provider.getBalance(address);
    console.log("账户余额:", ethers.formatEther(balance), "ETH");
    if (balance === 0n) {
      console.warn("账户余额为0,部署可能会失败,请检查Ganache账户");
    }
  } catch (err) {
    console.error("获取余额失败:", err.message);
  }
}

function loadContractArtifacts() {
  // const abi = JSON.parse(fs.readFileSync("./build/contracts_Test_sol_Test.abi", "utf8"));
  // let binary = fs.readFileSync("./build/contracts_Test_sol_Test.bin", "utf8").trim();

  const abi = JSON.parse(fs.readFileSync("./build/contracts_SimpleStorage_sol_SimpleStorage.abi", "utf8"));
  let binary = fs.readFileSync("./build/contracts_SimpleStorage_sol_SimpleStorage.bin", "utf8").trim();


  // Ensure bytecode starts with '0x'
  if (!binary.startsWith('0x')) {
    binary = '0x' + binary;
  }

  console.log("加载的字节码长度(不含0x):", binary.length - 2);
  return { abi, binary };
}

async function performPreDeploymentChecks(contractFactory, provider, connectedWallet) {
  console.log("正在进行部署前检查...");

  // Gas estimation
  try {
    const deployTxRequest = await contractFactory.getDeployTransaction();
    const estimatedGas = await provider.estimateGas(deployTxRequest);
    console.log(`Gas估算成功,预计需要: ${estimatedGas.toString()} 单位`);
  } catch (estimateError) {
    console.error("Gas估算失败,这明确指示问题在合约字节码或构造函数：", estimateError.shortMessage || estimateError.message);
    if (estimateError.info && estimateError.info.error) {
      console.error("底层虚拟机错误:", estimateError.info.error.message);
    }
    process.exit(1);
  }

  // Nonce verification
  console.log("检查当前Nonce状态...");
  const currentNonce = await provider.getTransactionCount(connectedWallet.address);
  console.log(`链上查询的Nonce (下一笔应为): ${currentNonce}`);

  const walletNonce = await connectedWallet.getNonce();
  console.log(`钱包对象内的Nonce (下一笔应为): ${walletNonce}`);

  if (currentNonce !== walletNonce) {
    console.warn(`Nonce不匹配,这可能导致交易被拒绝。`);
  }
}

async function deployContract(contractFactory, connectedWallet) {
  console.log("正在部署, 请稍后...");

  try {
    // Deploy using the contract factory
    const contract = await contractFactory.deploy();
    console.log(`部署交易已发送！哈希: ${contract.deploymentTransaction().hash}`);

    // Wait for deployment confirmation
    console.log(`等待交易确认...`);
    await contract.waitForDeployment();

    // Get contract address
    const contractAddress = await contract.getAddress();
    console.log(`交易已确认！合约地址: ${contractAddress}`);

    return contractAddress;
  } catch (error) {
    console.error("部署失败:");
    console.error(`错误名称: ${error.name}`);
    console.error(`错误信息: ${error.message}`);
    if (error.code) {
      console.error(`错误代码: ${error.code}`);
    }
    console.error(`完整错误:`, error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });