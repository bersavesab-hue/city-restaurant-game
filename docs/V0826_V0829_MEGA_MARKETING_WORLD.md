# V0.8.26–V0.8.29 四合一功能包

一次更新连续完成 17–20/26。

## 17/26 V0.8.26 营销 / 平台 / 会员
- 继续复用现有 24 种营销活动。
- 新增 8 类经营渠道配置。
- 新增 5 级会员成长体系。
- 营销预算接入 V0.8.25 完整财务。
- 会员累计消费、访问次数、积分、等级、兑换。
- 运行时营销活动继续使用原 `runtime.campaigns`，所以原需求提升与每日活动递减逻辑完全保留。

## 18/26 V0.8.27 口碑 / 评价 / 谣言 / 媒体
- 继续使用原八维评价系统。
- 支持门店独立评价历史、正负评价统计。
- 支持舆情热度、可信度、正负倾向、自然衰减和澄清。
- 支持 8 类媒体/讨论来源与传播触达。
- 日常顾客消费产生评价时自动同步至统一口碑系统。
- 动态世界已有对白/弹幕仍直接汇入门店讨论概览。

## 19/26 V0.8.28 竞争对手 / 城市商业生态
- 继续使用现有 64 种竞对经营原型。
- 继续复用 LiveWorld 的城市竞对人口、开业/闭店、竞争动作。
- 新增统一商圈生态快照。
- 输出商圈竞争强度、核心/本地/背景竞对数量、头部竞对、市场机会分、威胁分、近期市场事件。
- 保留 300–800 经营主体的既有城市商业生态规模设计。

## 20/26 V0.8.29 事件 / 政策 / 天气 / 季节
- 继续使用现有 360 个事件模板与 160 个政策模板。
- 统一天气、温度、季节、事件、政策、经营修正项入口。
- 四季按月份自动识别。
- 雨雪、高温、低温分别影响到店/外卖/水电成本参考系数。
- 关店日结时自动推进口碑衰减、竞对商业生态和动态世界；现有每日世界推进仍保持幂等，不会重复推进同一天。

## operationsStore 新增入口
- marketingCatalog
- marketingPlatformCatalog
- configureMarketingPlatform
- startMarketingCampaign
- enrollMember
- recordMemberSpend
- redeemMemberPoints
- marketingMembershipSnapshot
- reputationSnapshot
- recordManualReview
- createReputationRumor
- resolveReputationRumor
- publishReputationMedia
- commercialEcologySnapshot
- processCommercialEcologyDay
- environmentSnapshot
- processEnvironmentDay

基线：V0.8.25
目标：V0.8.29
