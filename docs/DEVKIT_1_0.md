# 餐饮项目 DevKit 1.0

这是项目正式开发工具箱，不是游戏内开发者菜单。

## 常用命令

### 一次性全局开发体检
`npm run dev:audit`

检查：
- 旧补丁/备份脚本
- 核心函数覆盖链
- 相对依赖缺失
- 图片路径缺失
- JSON损坏
- 同数组重复ID
- 测试覆盖入口
- 项目体积

报告输出到：
`reports/devkit/`

### 发布前完整检查
`npm run dev:release`

顺序：
1. DevKit自身语法检查
2. 全局开发体检
3. npm test
4. 重新构建Android JS
5. 检查bundle是否比源码新
6. 生成源码SHA256和Bundle SHA256
7. 生成仓库快照

只有全部通过才显示：
`RELEASE CHECK PASS`

### update.zip预检
`npm run dev:preflight -- update.zip`

检查：
- ZIP是否可读
- 路径穿越
- .git内容
- 是否覆盖apply-update工作流
- package版本倒退
- PATCH_MANIFEST是否合法
- 包内全部JS语法

### 修改影响范围
`npm run dev:impact -- src/renovation/renovationSystem.js`

会列出：
- 哪些文件引用它
- 哪些测试与它相关

### 资源生命周期
`npm run assets:audit`
`npm run assets:pools`
`npm run assets:cleanup:dry`
`npm run assets:cleanup`

原则：
“当前没引用”绝不等于垃圾。

备用图、动态池、共享图、归档图和未登记图都会受到保护。
只有明确登记为 retired，且存在替代图、旧存档安全、当前无引用、
退出动态池并达到退休版本后，才允许自动删除。

### 其他工具
- `npm run dev:hygiene` 代码卫生
- `npm run dev:deps` 依赖关系
- `npm run dev:data` 数据检查
- `npm run dev:tests` 测试发现
- `npm run dev:size` 体积报告
- `npm run dev:build-verify` Bundle一致性
- `npm run dev:snapshot` 仓库快照

## 安全设计

普通 `npm test` 前会自动：
1. 重建动态资源池索引
2. 验证资源保护逻辑
3. 执行“明确退休资源”的安全GC
4. 输出资源生命周期报告
5. 检查DevKit自身语法
6. 跑DevKit回归测试
7. 再进入项目正式测试

如果后续测试失败，Apply Update ZIP不会提交工作区删除结果。
因此不会出现“自动清理失败但垃圾回收已经写入main”的情况。
