# KiteAI Passport + LayerZero

独立 Node.js 集成项目：

- Agent Passport：实现 x402 `402 Payment Required`、X-PAYMENT 验证和 facilitator 结算。
- LayerZero：为 Kite 上已有 PYUSD0 准备 OFT Adapter，并连接 Arbitrum。

当前跨链部分只创建 Adapter 合约和配置校验，不会猜测代币地址、Endpoint 或 EID。确认官方地址后，需部署 Adapter、设置 LayerZero peer/DVN/Executor/enforced options，再开放真实转账。LayerZero OFT 的标准流程参考官方文档：https://docs.layerzero.network/v2/developers/evm/oft/quickstart

Agent Passport 服务提供方流程参考：https://docs.gokite.ai/kite-agent-passport/service-provider-guide

```bash
cp .env.example .env
npm install
npm run dev
```
