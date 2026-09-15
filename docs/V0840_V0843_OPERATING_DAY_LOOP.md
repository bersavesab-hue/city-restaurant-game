# V0.8.40–V0.8.43 第二阶段第二包

## V0.8.40 营业日循环
把现有真实营业引擎外再包一层“经营日”：
- 开始营业日
- 顾客成功/失败记录
- 当天订单、顾客、营收、贡献毛利
- 决策引用
- 事件记录
- 日结
- 日结原因
- 明日建议
- 120日历史
- 安全日结，避免没有营业行为时误点连续跳日

## V0.8.41 决策反馈
自动跟踪：
- 菜单调价
- 主推菜
- 招聘
- 营销

每次决策记录执行前基线；日结时比较：
- 营收
- 利润
- 评分
- 会员
- 库存预警
- 员工
- 现金紧张度

生成 positive / neutral / negative 和自然语言复盘。

## V0.8.42 试玩卡死诊断
检查：
- Runtime缺失
- 无可售菜单
- 无主推菜
- 无员工
- 库存风险
- 现金耗尽且无信用
- 现金紧张度极高
- 未整改监管问题
- 主流程状态冲突
- 营业日状态冲突
- 营业门店长期零订单

输出 health score、grade、问题列表和推荐页面。

## V0.8.43 第二轮数值平衡
统一诊断：
- 食材成本率
- 人力成本率
- 租金率
- 利润率
- 现金紧张度

目标区间：
- 食材 24–38%
- 人力 18–32%
- 租金 8–18%
- 利润 2–18%
- 现金紧张度 35–78

附带100组确定性校准场景，限制：
- 硬死锁率 <= 18%
- 过于轻松率 <= 20%
- 合理平衡场景 >= 30%

## operationsStore新增
- startOperatingDay
- operatingDaySnapshot
- operatingDayHistory
- closeOperatingDaySafe
- recordPlayerDecision
- decisionFeedbackSnapshot
- playtestHealthSnapshot
- operatingBalanceSnapshot
- runOperatingBalanceCalibration

基线：0.8.39
目标：0.8.43
