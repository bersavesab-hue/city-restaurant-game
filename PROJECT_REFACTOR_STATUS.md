# 项目全面整理执行状态

## 当前稳定基线

- 版本：0.8.65
- 当前阶段：底层架构第二阶段 / 第一阶段清理进行中
- 原则：停止继续叠加玩法，先处理模块边界、重复代码与目录污染。
- 执行方式：每次只迁移一个依赖簇；每批必须经过底层自动测试与 Android 构建。

## 已完成

1. 恢复完整 tests/ 测试基线并修复历史补丁清单依赖。
2. GitHub Actions 底层自动测试恢复全绿。
3. Android Debug APK 构建与上传恢复成功。
4. 根目录旧 PATCH_MANIFEST 依赖已清除，不再恢复历史补丁文件。
5. 建立 `src/registry/ProjectModuleRegistry.js` 与架构边界审计。
6. `src/core/GameState.js` 已删除，运行时状态统一使用 `src/core/gameState.js`。
7. `animationManager`、`popupManager`、`sceneManager` 的正式实现已迁入 `src/ui/managers/`，生产调用已改走新路径。
8. 重复启动器 `src/core/AppBootstrap.js`、`src/core/bootstrap.js`、旧 `src/bootstrap/AppBootstrap.js` 已删除；实际经营启动职责统一保留在 `src/bootstrap/businessSystemsBootstrap.js`。
9. 前厅服务模拟已迁入 `src/operations/diningServiceEngineV10.js`；单数 `src/service/` 已移除，`src/services/` 专门保留应用服务。
10. 架构注册表不再对白名单方式容忍已解决的大小写冲突和 core 表现层泄漏。

## 当前剩余架构债务

按优先级处理：

1. `src/decoration/` 与 `src/renovation/`：拆清装修领域逻辑、编辑器、表现层和反馈层。
2. `src/person/`、`employee/`、`customer/`、`entities/`：统一共享人物模型，保留顾客/员工各自业务行为。
3. `src/main_refactor_example.js`：确认无运行时和测试依赖后删除。

## 下一批执行

- 先拆 `renovation/decoration` 边界，不改装修玩法规则。
- 每批迁移后继续验证 npm test、Android APK Build、Android Test APK。
- 未确认依赖的文件禁止直接删除。
