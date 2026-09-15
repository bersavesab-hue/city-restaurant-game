# V0.8.34–V0.8.35 最终收尾包

完成 25–26/26。

## 25/26 V0.8.34 多店 / 品牌 / 扩张 / 排行榜
- 延续已有 20 级品牌成长。
- 建立集团级品牌状态与门店组合。
- 每家门店自动进入集团经营组合。
- 统计集团门店数、营收、利润、评级、员工。
- 按品牌等级使用原 storeCap 控制门店上限。
- 基于真实城市数据库输出可扩张商圈。
- 扩张商圈同时参考物业基线与动态竞争生态。
- 支持扩张计划、意向保证金、计划与实际门店绑定。
- 动态城市/商圈品牌排行榜，将玩家品牌和真实沙盘竞对放到同一评分体系。
- 新增集团内部门店排行榜。

## 26/26 V0.8.35 全系统整合 / 100局模拟
- 新增 100 局真实系统级经营回归模拟，不再只有“100名玩家静态画像”。
- 每一局使用独立 deterministic master seed。
- 每局覆盖：
  - 新门店运行时
  - 招聘
  - 顾客
  - 营销
  - 会员
  - 评价
  - 监管
  - 持久随机流
  - 存档导出/导入
  - 随机重放
  - 财务状态
  - 成长/成就
  - 多店品牌
  - 动态竞对排行
- 每局检查：
  - 系统调用不抛异常
  - 玩家现金不能小于0
  - 存档能恢复
  - 随机流恢复后必须完全续接
  - 门店运行时能重载
  - 财务快照存在
  - 门店必须进入集团组合
  - 玩家必须进入动态排行榜
- CI 要求 100/100 通过，否则更新失败。

## 新增入口
- brandPortfolioSnapshot
- brandExpansionCatalog
- createBrandExpansionPlan
- commitBrandExpansionPlan
- attachBrandExpansionShop
- brandRankingSnapshot
- storeRankingSnapshot

## 新增模拟器
- `src/simulator/fullIntegrationSimulationV0835.js`
- `simulator/run100GameLoopsV0835.js`

基线：V0.8.33
最终目标：V0.8.35
