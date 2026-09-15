# 餐饮 V0.9.5 倍速卡顿稳定修复

V0.9.5 修复 V0.9.4 的最后一个高风险点：自适应候选以前会重复执行仓库原 `pretest`。你的项目历史上存在会生成/修复源码的 `pretest`，重复运行可能产生副作用，导致明明 baseline 可通过却被后续候选污染。

现在流程改为：

1. 不修改 `src/main.js`，先在仓库 baseline 上执行原 `pretest` **一次**；
2. 保存 pretest 完成后的源码/包状态；
3. 只对 `full -> throttle -> resolution -> baseline` 分别执行原 `test`；
4. 只对第一个通过 test 的候选执行原 `posttest` **一次**；
5. 恢复 package.json 到 pretest 完成态，清理临时 runner；
6. 输出 `docs/V095_SELECTED_MODE.txt`。

本包不改 UI，不覆盖 workflow，不直接覆盖 package.json。
