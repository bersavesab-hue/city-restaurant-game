# 100名玩家实验室

这是独立开发测试工具，不进入正式游戏运行逻辑。

## 100个玩家画像
由25类核心玩家 × 4种设备/耐心变体组成，覆盖抖音碎片化玩家、TapTap核心玩家、数值党、装修党、零氪/轻氪、低端机、小屏、平板、长线经营、漏洞猎人等。

## 检测内容
UI、字体、点击热区、界面结构、流程、新手引导、玩法深度、经济软锁、数值平衡、广告体验、性能、稳定性、无障碍、内容量、耐玩性、自定义和反馈感。

## 手机查看报告
继续使用现有 `Apply Update ZIP` 一键工作流即可，不需要新增GitHub Workflow权限。

每次上传 `update.zip`：
1. 现有工作流运行 `npm test`
2. 自动执行100名玩家实验室
3. 自动生成 `reports/player-lab/latest/`
4. 测试和APK构建成功后，报告随bot提交一起进入main

手机GitHub直接打开：
`reports → player-lab → latest`

优先看：
- `report.md`：GitHub直接阅读
- `report.html`：下载后浏览器查看完整可视化报告
- `summary.json`：总体结果
- `issues.csv`：问题优先级
- `players.csv`：100名玩家逐人反馈
- `优化结果.md`：本轮前后对比

## 正式游戏隔离
- `src/main.js` 不引用 `simulator/`
- `android/entry.js` 不引用 `simulator/`
- 模拟玩家不会注册到 sceneManager
- APK不会显示测试菜单或测试玩家
