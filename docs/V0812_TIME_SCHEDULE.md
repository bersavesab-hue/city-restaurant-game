# V0.8.12 时间 / 日期 / 营业日程统一

- 单一日历：闰年、月份天数、日序、星期、绝对分钟统一。
- timeSystem、simulationSystem、businessLifecycle 共用统一日历。
- 营业时间由 operationsSchedule 统一提供。
- restaurantSimulation 不再维护独立的开门/闭店判断。
- 时间推进自动结算装修、设备和证照筹备状态。
- 跨过营业开始/结束时间会产生统一事件。
- 排班、营业时间、休息日变化会进入全局状态总线。
- 保留 V0.8.11 全局状态总线与 V0.8.10 统一路由。
