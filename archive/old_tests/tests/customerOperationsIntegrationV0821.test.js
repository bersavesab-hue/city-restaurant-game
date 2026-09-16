'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const operations =
  require('../src/operations/operationsStoreV080.js');

gameState.reset();

gameState.addShop({
  id:'shop_v0821',
  name:'顾客数据库测试店',
  districtId:'university',
  status:'open',
  usableArea:100,
  seatEstimate:36
});

operations.resetCache();

const generated =
  operations
    .generateCustomer(
      'shop_v0821',
      {
        districtId:
          'university'
      }
    );

assert.ok(
  generated.ok
);

assert.ok(
  generated.customer
);

assert.ok(
  generated
    .customer
    .randomProfile
);

const rows =
  operations
    .customerRows(
      'shop_v0821',
      {}
    );

assert.equal(
  rows.length,
  1
);

assert.equal(
  rows[0].id,
  generated.customer.id
);

assert.ok(
  rows[0].segment
);

const insights =
  operations
    .customerInsights(
      'shop_v0821'
    );

assert.equal(
  insights.customerCount,
  1
);

operations.persist(
  'shop_v0821'
);

operations.resetCache();

const rowsAfterReload =
  operations
    .customerRows(
      'shop_v0821',
      {}
    );

assert.equal(
  rowsAfterReload.length,
  1
);

assert.deepEqual(
  rowsAfterReload[0]
    .randomProfile,
  rows[0]
    .randomProfile,
  '存档重载后顾客随机特征必须保持'
);

const second =
  operations
    .generateCustomer(
      'shop_v0821',
      {
        districtId:
          'university'
      }
    );

assert.ok(
  second.ok
);

assert.notEqual(
  second.customer.id,
  generated.customer.id,
  '同一门店连续产生顾客不能写死为同一人'
);

const all =
  operations
    .customerRows(
      'shop_v0821',
      {}
    );

assert.equal(
  all.length,
  2
);

console.log(
  'V0.8.21 customer operations integration tests passed'
);
