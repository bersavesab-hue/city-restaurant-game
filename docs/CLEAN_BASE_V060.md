# CLEAN BASE V0.6.0

本包不是继续叠加界面补丁，而是对当前项目做版本收口。

处理内容：
- 修复 V48 装修平面图 `floorGeometry / geometry` 运行时变量错误
- 删除主页 V21-V28 多层覆盖链，保留 V29 + V32 + V33 + V34 + V35 当前稳定层
- 删除旧 apply-vXX 补丁器
- 删除 V0.5.2 recovery/postinstall 硬重置体系
- 删除根目录错误文件 `update .zip`
- 删除已无引用的 V21 / V24 图片目录
- 删除旧版本补丁说明文档和 V18-V31 补丁型测试
- Android JS 构建失败立即失败，禁止复用旧 game.bundle.js
- 新 CI 对全部 src/scripts 做语法检查，并运行当前经营、房源、装修、NPC、竞品、顾客等核心测试

保留：
- V29 当前图标
- V32 当前主页
- V33 当前全局导航
- V34 当前资金格式
- V35 当前顶部 HUD
- V43/V44 当前房源视觉资源
- library_store 当前门店/装修资源

历史版本仍可通过 Git 历史查看，不再把历史补丁器留在正式运行树。
