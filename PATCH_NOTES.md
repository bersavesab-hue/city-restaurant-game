# 餐饮模拟器 V0.9.3 自适应倍速稳定补丁

本包只处理倍速卡顿及其导致的构建兼容问题，不改 UI，不覆盖 workflow，也不直接携带 package.json。

核心变化：不再改游戏时间推进频率，不再改 sceneManager/timeSystem 更新节奏；只优化昂贵的 Canvas 全屏重绘和 Android 高分屏绘制负担。

为避免旧测试再次把构建卡死，本包会在 GitHub Actions 的原 `npm test` 阶段自动用仓库原测试验证候选方案：

1. full：重绘节流 + 分辨率/缓存降载
2. throttle：仅重绘节流
3. resolution：仅分辨率/缓存降载
4. baseline：完整恢复原 `src/main.js`

第一个通过仓库原测试的方案会被保留，并写入 `docs/V093_SELECTED_MODE.txt`。失败候选会自动撤销。

如果连 baseline 都失败，Actions 会显示原仓库自身真实的 AssertionError；这时可以确认失败与本轮倍速补丁无关。
