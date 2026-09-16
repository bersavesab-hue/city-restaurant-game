'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const renovationSystem =
  require('../src/renovation/renovationSystem.js');

const customizationSystem =
  require('../src/ui/customizationSystem.js');

function addShop(
  id,
  area,
  floor
) {
  gameState.addShop({
    id,
    name:
      '测试酒楼',
    districtId:
      'university',
    streetId:
      'test_street',
    address:
      '测试地址',
    status:
      'leased_pending_renovation',
    grossArea:
      area,
    usableArea:
      area,
    seatEstimate:
      40,
    floor,
    monthlyRent:
      10000,
    freeRentDays:
      10,
    depositMonths:
      2,
    paymentMonths:
      3,
    leaseYears:
      5,
    transferFee:
      0,
    brokerFee:
      0,
    upfrontPaid:
      50000
  });
}

function run() {
  gameState.reset();

  addShop(
    'shop_custom_a',
    160,
    '1-2层'
  );

  renovationSystem
    .ensurePlan(
      'shop_custom_a'
    );

  renovationSystem
    .addPrivateRoom(
      'shop_custom_a',
      0
    );

  let plan =
    renovationSystem
      .ensurePlan(
        'shop_custom_a'
      );

  const roomId =
    plan
      .floors[0]
      .privateRooms[0]
      .id;

  const shopRename =
    customizationSystem
      .renameShop(
        'shop_custom_a',
        '春风酒楼'
      );

  assert.ok(
    shopRename.ok
  );

  assert.strictEqual(
    renovationSystem
      .getShop(
        'shop_custom_a'
      )
      .name,
    '春风酒楼'
  );

  const roomRename =
    customizationSystem
      .renameRoom(
        'shop_custom_a',
        roomId,
        '牡丹厅'
      );

  assert.ok(
    roomRename.ok
  );

  plan =
    renovationSystem
      .ensurePlan(
        'shop_custom_a'
      );

  assert.strictEqual(
    plan
      .floors[0]
      .privateRooms[0]
      .name,
    '牡丹厅'
  );

  renovationSystem
    .adjustTable(
      'shop_custom_a',
      0,
      4,
      3
    );

  const save =
    customizationSystem
      .saveTemplate(
        'shop_custom_a',
        '春风标准店'
      );

  assert.ok(
    save.ok
  );

  assert.strictEqual(
    customizationSystem
      .getTemplateList()
      .length,
    1
  );

  const templateId =
    save.template.id;

  addShop(
    'shop_custom_b',
    240,
    '1-3层'
  );

  renovationSystem
    .ensurePlan(
      'shop_custom_b'
    );

  const apply =
    customizationSystem
      .applyTemplate(
        'shop_custom_b',
        templateId
      );

  assert.ok(
    apply.ok,
    '模板必须可套用到面积和楼层不同的门店'
  );

  const applied =
    renovationSystem
      .ensurePlan(
        'shop_custom_b'
      );

  assert.strictEqual(
    applied
      .floors
      .length,
    3
  );

  assert.ok(
    applied
      .floors[0]
      .tables['4'] >
      0,
    '桌椅应按目标门店面积动态适配'
  );

  assert.ok(
    applied
      .floors[0]
      .privateRooms
      .some(
        room =>
          room.name ===
          '牡丹厅'
      ),
    '包厢名称应随模板保存并恢复'
  );

  const renamed =
    customizationSystem
      .renameTemplate(
        templateId,
        '城市旗舰模板'
      );

  assert.ok(
    renamed.ok
  );

  assert.strictEqual(
    customizationSystem
      .getTemplateList()[0]
      .name,
    '城市旗舰模板'
  );

  const savedState =
    gameState
      .exportSave();

  gameState.reset();

  assert.ok(
    gameState
      .importSave(
        savedState
      ),
    '存档导入必须成功'
  );

  assert.strictEqual(
    customizationSystem
      .getTemplateList()
      .length,
    1,
    '装修模板必须进入存档持久化'
  );

  assert.strictEqual(
    renovationSystem
      .getShop(
        'shop_custom_a'
      )
      .name,
    '春风酒楼',
    '自定义酒楼名称必须进入存档'
  );

  const deleted =
    customizationSystem
      .deleteTemplate(
        templateId
      );

  assert.ok(
    deleted.ok
  );

  assert.strictEqual(
    customizationSystem
      .getTemplateList()
      .length,
    0
  );

  console.log(
    'custom names and renovation template tests passed'
  );
}

run();
