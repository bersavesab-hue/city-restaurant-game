'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const operations =
  require('../src/operations/operationsStoreV080.js');

const research =
  require('../src/food/foodResearchSystemV0818.js');

const database =
  require('../src/food/foodResearchDatabaseV0818.js');

gameState.reset();

gameState.addShop({
  id:'shop_v0818',
  name:'菜单研发测试店',
  status:'open',
  districtId:'university',
  usableArea:80,
  seatEstimate:30
});

operations.resetCache();

research.ensureState();

const runtime =
  operations
    .getRuntime(
      'shop_v0818'
    );

assert.equal(
  runtime.menu.length,
  12,
  '新门店必须继续保留12道初始菜'
);

assert.deepEqual(
  runtime
    .menu
    .map(
      item =>
        item.recipeId
    ),
  database
    .STARTER_RECIPE_IDS,
  '初始菜单必须由统一数据库提供'
);

const lockedId =
  'dish_013';

assert.equal(
  research.isUnlocked(
    lockedId
  ),
  false
);

const blocked =
  operations
    .addMenuRecipe(
      'shop_v0818',
      lockedId
    );

assert.equal(
  blocked.ok,
  false,
  '未研发菜品不能直接加入菜单'
);

assert.ok(
  research
    .unlockRecipe(
      lockedId,
      'integration-test'
    )
    .ok
);

const added =
  operations
    .addMenuRecipe(
      'shop_v0818',
      lockedId,
      {
        portionId:'single'
      }
    );

assert.ok(
  added.ok
);

assert.equal(
  operations
    .getRuntime(
      'shop_v0818'
    )
    .menu
    .length,
  13
);

const duplicate =
  operations
    .addMenuRecipe(
      'shop_v0818',
      lockedId,
      {
        portionId:'single'
      }
    );

assert.equal(
  duplicate.ok,
  false,
  '同配方同份量不能重复加入菜单'
);

const available =
  operations
    .getAvailableRecipes(
      'shop_v0818'
    );

assert.ok(
  available.every(
    item =>
      item.unlocked
  )
);

assert.ok(
  !available.some(
    item =>
      item.id ===
      lockedId
  ),
  '已经加入菜单的配方不能继续显示为待添加'
);

const removed =
  operations
    .removeMenuItem(
      'shop_v0818',
      added.item.id
    );

assert.ok(
  removed.ok
);

assert.equal(
  operations
    .getRuntime(
      'shop_v0818'
    )
    .menu
    .length,
  12
);

console.log(
  'V0.8.18 menu/research integration tests passed'
);
