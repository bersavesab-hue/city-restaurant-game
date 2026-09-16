# V1.1 Stage 4 — Business Systems Bootstrap

真实源码修改：
- src/main.js：保留旧 require 兼容，同时把经营系统的运行时挂载与恢复后安装统一交给 bootstrap。
- src/bootstrap/businessSystemsBootstrap.js：统一 restaurant / staff / food / finance / rating 初始化。
- src/food/index.js：补齐 quality / generator / researchUpgrade 统一出口。
- src/finance/index.js：补齐 V103 当前财务系统统一出口。
- src/rating/index.js：新增评级系统统一出口。
- tests/businessSystemsBootstrapV111.test.js：新增回归测试。

兼容策略：
- 不删除旧模块。
- 保留 main.js 对 staffCareerV088.js 等原路径 require，避免既有回归测试和旧调用失效。


修复：恢复 src/main.js 中 foodResearchSystem.install() 显式兼容调用，满足 V0.8.18 基础设施回归测试。
- 修复：将 tests/businessSystemsBootstrapV111.test.js 注册到 scripts/run-ci-tests-v060.js，满足测试发现覆盖率门禁。
