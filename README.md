# KiteAI Passport + LayerZero

独立 Node.js 集成项目：

- Agent Passport：实现 x402 `402 Payment Required`、X-PAYMENT 验证和 facilitator 结算。
- 幂等结算：为支付授权生成 SHA-256 指纹，合并并发重试并缓存成功回执，避免重复结算。
- LayerZero：为 Kite 上已有 PYUSD0 准备 OFT Adapter，并连接 Arbitrum。

当前跨链部分只创建 Adapter 合约和配置校验，不会猜测代币地址、Endpoint 或 EID。确认官方地址后，需部署 Adapter、设置 LayerZero peer/DVN/Executor/enforced options，再开放真实转账。LayerZero OFT 的标准流程参考官方文档：https://docs.layerzero.network/v2/developers/evm/oft/quickstart

Agent Passport 服务提供方流程参考：https://docs.gokite.ai/kite-agent-passport/service-provider-guide

```bash
cp .env.example .env
npm install
npm run dev
npm test
```

## 幂等支付处理

`/api/paid-resource` 会先严格解码 `X-PAYMENT`，并使用解码后授权内容的
SHA-256 指纹作为本地 `paymentId`。同一个支付授权的并发请求只会触发一次
facilitator 结算；成功回执默认缓存 5 分钟，失败请求不会缓存，因此可以安全重试。
缓存时间可通过 `SETTLEMENT_CACHE_MS` 调整。该缓存用于单进程演示；生产环境的
多实例部署应将相同语义迁移到 Redis 等共享存储。
