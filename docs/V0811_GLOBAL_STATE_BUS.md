# V0.8.11 全局状态与交互总线

本补丁是 26 步功能整合计划的第 2 步。

新增统一事件总线与状态桥接层，不改 UI，不重写现有经营系统。玩家资金、时间控制、天气、商圈、门店、页面路由等关键变化会进入统一事件通道；旧模块直接修改嵌套状态时，由主循环运行时同步补抓变化。

更新包不包含 package.json，不修改 GitHub workflow。版本与永久 CI 清单由一次性 scripts/apply-update-patch.js 增量更新；工作流执行后会删除该脚本。

为兼容新版 GitHub Ubuntu Runner，本包的一次性安装器会在当前 CI 临时环境中忽略 Android SDK 已废弃的 `tools` 包请求；该处理仅作用于本次 Runner，不修改仓库 workflow，也不会写入正式项目文件。
