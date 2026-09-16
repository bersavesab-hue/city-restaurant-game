# Migration Batch 001

状态：执行中

处理范围：
- PATCH_MANIFEST 历史补丁文件
- PATCH_NOTES 更新记录
- UNIQUE 测试记录

目标：
- 根目录只保留当前开发需要文件
- 历史开发文件进入 archive
- 设计资料进入 docs

注意：迁移采用先复制、校验、后删除原则，避免破坏构建。
