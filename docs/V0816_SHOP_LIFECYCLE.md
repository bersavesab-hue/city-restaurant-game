# V0.8.16 门店生命周期统一

本轮统一门店从签约到退出的完整状态链，保留旧页面和旧测试使用的阶段名称。

统一阶段：

1. awaiting_renovation
2. renovating
3. awaiting_equipment
4. equipment_installing
5. awaiting_permits
6. permits_reviewing
7. awaiting_staff
8. ready_for_trial
9. trial_opening
10. trial_complete
11. formal_open
12. paused
13. closed

核心修复：

- 签约后立即建立生命周期记录。
- 装修开工/完工自动同步生命周期。
- 设备、证照、招聘 readiness 自动同步。
- 试营业、正式开业统一经过状态校验。
- 正式营业门店支持 pause/resume 生命周期 API。
- 租约 terminated/defaulted/expired 被视为终态，强制 closed。
- closed/paused 门店不会被 openingPrep.getReadiness() 意外改回 ready_for_trial。
- 5/26 的开局流程改为读取统一生命周期，不再自己维护第二套阶段判断。
- 每家门店保留最近 48 次阶段变化历史，便于排查状态错乱。

兼容原则：

- `shop.status` 旧字段继续保留，老页面无需重写。
- `shop.lifecycleStage` 继续保留，改由统一状态机维护。
- 原 V0.8.6 租金、贷款、试营业复盘逻辑保留。
- 原 V0.8.14 开局路由保持不变。
