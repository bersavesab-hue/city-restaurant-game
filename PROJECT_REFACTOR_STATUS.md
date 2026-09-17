# 项目全面整理执行状态

## 当前稳定基线

- 版本：0.8.65
- 上一稳定测试基线：88820de03dbc8f78ef02da1e7ee1e41a1f0ba73b
- 当前阶段：底层架构第二阶段
- 原则：停止继续叠加玩法，先处理模块边界、重复代码与目录污染。

## 已完成

1. 恢复完整 tests/ 测试基线并修复历史补丁清单依赖。
2. GitHub Actions 底层自动测试恢复全绿。
3. Android Debug APK 构建与上传恢复成功。
4. 根目录旧 PATCH_MANIFEST 依赖已清除，不再恢复历史补丁文件。
5. 建立 `src/registry/ProjectModuleRegistry.js`，为当前 `src` 一级目录建立逻辑分层。
6. 建立 `scripts/architecture-audit.js`，阻止新增未归类目录、src 根级 JS 污染、未知大小写冲突和新的 core 表现层污染。
7. 新增 `tests/architectureBoundaries.test.js` 并接入 `npm test` 的 pretest 阶段。

## 当前已确认架构债务

按优先级处理：

1. `src/core/GameState.js` 与 `src/core/gameState.js` 大小写重复，必须收敛为一个状态实现。
2. `src/core/animationManager.js`、`popupManager.js`、`sceneManager.js` 属于表现层泄漏，后续迁出 core。
3. `src/bootstrap/` 与 `src/core/AppBootstrap.js`、`src/core/bootstrap.js` 启动职责重叠。
4. `src/service/` 与 `src/services/` 命名和职责重叠。
5. `src/decoration/` 与 `src/renovation/` 混有装修业务逻辑和 UI/反馈代码，需要拆边界。
6. `src/person/`、`employee/`、`customer/`、`entities/` 人物模型边界需要统一。
7. `src/main_refactor_example.js` 为历史重构示例候选，确认无依赖后归档或删除。

## 下一批执行

- 先处理状态模块重复，不直接改业务玩法。
- 每次只迁移一个依赖簇。
- 每批迁移后必须通过底层自动测试与 Android 构建。
- 未确认依赖的文件禁止直接删除。
