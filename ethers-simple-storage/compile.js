const solc = require('solc');
const fs = require('fs');
const path = require('path');

async function main() {
    // 1. 指定你的Solidity文件路径
    const contractName = 'SimpleStorage'; // 替换为你的合约名
    const solidityFilePath = path.resolve(__dirname, 'SimpleStorage.sol'); // 替换为你的Solidity文件路径
    console.log('__dirname='+__dirname);
    console.log(path.basename(solidityFilePath));
    // 2. 读取Solidity源代码
    const sourceCode = fs.readFileSync(solidityFilePath, 'utf8');

    // 3. 设置编译输入
    const input = {
        language: 'Solidity',
        sources: {
            // 使用文件名作为key，或者直接使用合约名
            [path.basename(solidityFilePath)]: {
                content: sourceCode,
            },
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode.object'], // 指定输出ABI和字节码
                },
            },
        },
    };

    // 4. 编译合约
    console.log('开始编译合约...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    // 5. 处理编译错误
    if (output.errors) {
        const errors = output.errors.filter(err => err.severity === 'error');
        if (errors.length > 0) {
            console.error('编译错误:');
            errors.forEach(err => console.error(err.formattedMessage));
            throw new Error('编译失败，请检查合约代码。');
        } else {
            // 输出警告信息
            output.errors.forEach(warning => console.warn(warning.formattedMessage));
        }
    }

    // 6. 提取编译结果
    // 获取编译后的合约，这里假设Solidity文件与合约名一致，且只有一个合约
    // 如果有多个合约或文件名不同，需要调整这里的逻辑
    const contracts = output.contracts[path.basename(solidityFilePath)];
    if (!contracts || Object.keys(contracts).length === 0) {
        throw new Error('未找到编译后的合约，请检查合约名称或文件路径。');
    }

    // 7. 保存ABI和BIN文件
    for (const [name, contract] of Object.entries(contracts)) {
        // 生成ABI文件
        const abi = contract.abi;
        fs.writeFileSync(path.resolve(__dirname, `${name}.abi`), JSON.stringify(abi, null, 2));
        console.log(`ABI已保存至: ${name}.abi`);

        // 生成BIN文件 (字节码)
        const bytecode = contract.evm.bytecode.object;
        fs.writeFileSync(path.resolve(__dirname, `${name}.bin`), bytecode);
        console.log(`BIN已保存至: ${name}.bin`);
    }

    console.log('编译完成！');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })