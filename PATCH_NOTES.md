# 餐饮经营数据系统 V1.0

本包是增量更新，不直接覆盖 `package.json` 或 GitHub workflow。
上传为仓库根目录 `update.zip` 后，现有 `apply-update.yml` 会解压文件并运行 `scripts/apply-update-patch.js`。

## 本次实际接入

- 新增统一经营数据中枢 `src/analytics/businessDataHub.js`。
- 兼容旧 `store.dailyHistory`；按日最多保留 180 个经营日。
- 同步留存商圈、库存、员工、产能、菜品快照，为后续趋势比较提供底座。
- 新增商圈详情：概览 / 客群需求 / 竞争成本。
- 新增门店详情：今日经营 / 顾客漏斗 / 产能装修 / 预警现金。
- 新增经营数据中枢：总览 / 损益 / 菜品 / 库存人效 / 产能现金。
- 地图“进入商圈”改为先进入商圈详情，不再直接跳找铺。
- “门店”导航：已有门店进入门店详情；未开店进入找铺。
- 旧找铺页面保留，并注册为 `property` 路由。
- 旧 business 页面保留为 `businessLegacy`，新 `business` 入口使用数据中枢。
- 新增新版 `restaurantSimulationV081.js` 运行时桥接，尽可能读取当前经营引擎真实状态。
- 新增数据单元测试；安装器会把它增量追加到现有 `npm test`，不会覆盖原测试。

## 数据原则

1. 同一指标只在数据中枢定义一次，各页面读取同一口径。
2. 营业额、利润、现金流分开，避免“利润增加但现金没增加”的误解。
3. 订单必须能追溯到需求、潜在订单、产能/库存限制、实际成交和流失原因。
4. 经营数字尽量提供昨日或前7日对比；没有历史时不伪造。
5. 旧存档缺失的新字段显示 0 / 未记录，不反推虚假历史。
6. 业务页只展示与当前决策相关的数据；完整账表集中到数据中枢。

详细页面放置规则见 `docs/DATA_SYSTEM.md`。

## V1.0.1 构建修复

- 修复 GitHub Actions `Run all game tests` 失败。
- 原因：旧基线 `scripts/v60-audit.js` 要求 `package.json` 的 `scripts.test` 严格保持 `node scripts/run-ci-tests-v060.js`。
- 本版不再修改 `scripts.test`；数据中枢桥接与 `businessDataHub.test.js` 只追加到 `pretest`。
- 增加保护：安装器执行时禁止数据中枢改写 `scripts.test`。
- 已验证重复安装不会重复追加命令。
