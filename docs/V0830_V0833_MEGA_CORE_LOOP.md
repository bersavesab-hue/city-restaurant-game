# V0.8.30–V0.8.33 四合一功能包

一次更新完成 21–24/26。

## 21/26 V0.8.30 监管 / 检查 / 食品安全
- 保留开店前原有许可证系统。
- 增加营业后的持续监管层。
- 8类检查：食品安全、卫生、消防、健康证、采购溯源、网络餐饮、厨余环保、价格公示。
- 每家门店拥有合规分、风险分、检查计划、违规记录、整改记录。
- 检查风险同时参考许可证、卫生、溯源、员工合规、设施和动态世界监管风险。
- 罚款与整改费用进入 V0.8.25 统一财务。
- 日结自动推进监管日程。

## 22/26 V0.8.31 对话 / 弹幕 / 社交关系
- 不重建对白库，继续复用 V0.8.15 对话和弹幕数据库。
- 继续使用 personEngine 的关系、信任、尊重、亲密、竞争、记忆系统。
- 招聘员工自动进入门店社交网络。
- 新生成顾客也可进入门店社交网络。
- 支持人物互动、关系阶段、记忆、对白、门店弹幕、人物关系网和社交概览。

## 23/26 V0.8.32 全局随机引擎
- 在 V0.8.13 master seed 基础上增加持久命名随机流。
- 每个系统可使用 namespace + scope 拥有独立随机序列。
- 随机流 state / seed / draw count 写入存档。
- 存档恢复后从同一随机位置继续。
- 支持 next / float / int / chance / pick / weighted / shuffle / sample。
- 支持 preview（不推进持久状态）。
- 支持单流或整命名空间重置。
- 不破坏现有显式 simulation.seed 兼容逻辑。

## 24/26 V0.8.33 成长 / 解锁 / 成就 / 隐藏内容
- 继续复用原 20 级品牌成长。
- 新增 32 项经营成就。
- 新增 18 项功能/扩张解锁。
- 成就积分与品牌等级共同控制高阶功能。
- 继续复用原隐藏人物和彩蛋系统，不新增第二套隐藏库。
- 隐藏人物和彩蛋改用 V0.8.32 持久随机流。
- 日结自动计算利润天数、最高日营收、累计顾客、评价、会员、员工、营销、供应商、监管等成长指标。

## 新增 operationsStore 入口
监管：
- regulatorySnapshot
- runRegulatoryInspection
- remediateRegulatoryInspection
- processRegulatoryDay

社交：
- registerSocialActor
- socialInteract
- generateSocialDialogue
- generateSocialBarrage
- socialNetwork
- socialSnapshot

随机：
- randomSnapshot
- randomInt
- randomChance
- resetRandomStream

成长：
- growthSnapshot
- evaluateGrowth
- addHiddenClue
- discoverHiddenContent
- rollHiddenEncounter
- rollEasterEggEvent

基线：V0.8.29
目标：V0.8.33
