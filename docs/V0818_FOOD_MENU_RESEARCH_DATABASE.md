# V0.8.18 菜品 / 菜单 / 研发数据库统一

本轮不重复扩充现有菜谱数量，而是把已经存在的完整菜品包真正接入经营和研发流程。

现有数据继续保留：
- 190+ 食材
- 96 个基础菜品/饮品配方
- 288+ 份量变体
- 30+ 烹饪方式
- 24 个菜品分类
- 20+ 菜单策略
- 顾客口味、过敏、成本、库存消耗、菜单工程算法全部保留

新增：
- 8 条品牌研发路线
- 前 12 道菜保持开局直接掌握
- 其余 84 道进入研发池
- 每道菜自动生成研发难度、资金成本、游戏内工期
- 品牌级研发状态写入 business.foodResearch
- 老存档中已经出现在任何门店菜单里的菜自动接管为已掌握
- 同一时间最多 1 个研发项目
- 研发随游戏时间推进，不使用现实时间
- 完成研发后发出 food.research.completed 全局事件
- 新增菜单接口：
  - addMenuRecipe
  - removeMenuItem
  - getAvailableRecipes
  - getFoodResearchCatalog
  - startRecipeResearch
  - getFoodResearchOverview
- 新门店初始 12 菜改为统一数据库 STARTER_RECIPE_IDS，不再在 operationsStore 里重复写规则

兼容原则：
- foodPackV10.js 不删除、不重写
- recipeEngineV10.js 不改配方消耗逻辑
- menuEngineV10.js 不改顾客选菜/菜单工程算法
- 原有门店菜单存档继续可读
- 研发只限制“新增菜品”，不会把旧存档菜单里的菜锁掉
