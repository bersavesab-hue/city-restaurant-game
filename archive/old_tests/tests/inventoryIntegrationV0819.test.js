'use strict';

const assert =
  require('assert');

const inventory =
  require('../src/inventory/inventoryEngineV10.js');

const database =
  require('../src/inventory/ingredientInventoryDatabaseV0819.js');

const chilled =
  database
    .queryIngredients({
      storage:'chilled'
    })
    .find(
      item =>
        item.shelfDays >=
        2
    );

const ambient =
  database
    .queryIngredients({
      storage:'ambient'
    })[0];

assert.ok(chilled);
assert.ok(ambient);

const state =
  inventory
    .createInventory({
      day:10,
      ambientKg:20,
      chilledKg:20,
      frozenKg:20
    });

let received =
  inventory.receive(
    state,
    {
      ingredientId:
        chilled.id,
      grams:1000,
      day:10,
      shelfDays:2,
      unitCostPerKg:20,
      quality:88,
      batchNo:'batch_old'
    }
  );

assert.ok(received.ok);
assert.equal(
  received.lot.storage,
  'chilled'
);
assert.equal(
  received.lot.batchNo,
  'batch_old'
);

received =
  inventory.receive(
    state,
    {
      ingredientId:
        chilled.id,
      grams:1000,
      day:10,
      shelfDays:5,
      unitCostPerKg:22,
      quality:90,
      batchNo:'batch_new'
    }
  );

assert.ok(received.ok);

received =
  inventory.receive(
    state,
    {
      ingredientId:
        ambient.id,
      grams:2000,
      day:10,
      unitCostPerKg:8,
      quality:80
    }
  );

assert.ok(received.ok);
assert.equal(
  received.lot.storage,
  'ambient'
);

const beforeOld =
  state.lots
    .find(
      lot =>
        lot.batchNo ===
        'batch_old'
    )
    .grams;

const beforeNew =
  state.lots
    .find(
      lot =>
        lot.batchNo ===
        'batch_new'
    )
    .grams;

const consumed =
  inventory.consume(
    state,
    chilled.id,
    600
  );

assert.ok(consumed.ok);

const afterOld =
  state.lots
    .find(
      lot =>
        lot.batchNo ===
        'batch_old'
    )
    .grams;

const afterNew =
  state.lots
    .find(
      lot =>
        lot.batchNo ===
        'batch_new'
    )
    .grams;

assert.equal(
  beforeOld -
  afterOld,
  600,
  '必须优先消耗更早到期批次'
);

assert.equal(
  afterNew,
  beforeNew,
  '更晚到期批次不应先被消耗'
);

const rows =
  inventory
    .lotRows(
      state
    );

assert.ok(
  rows.length >=
  3
);

assert.ok(
  rows.every(
    row =>
      row.batchNo &&
      row.status &&
      row.status.status
  )
);

const summary =
  inventory
    .stockSummary(
      state
    );

assert.equal(
  summary.databaseVersion,
  '0.8.19'
);

assert.ok(
  summary.capacity
);

assert.ok(
  Array.isArray(
    summary.alerts
  )
);

const health =
  inventory
    .inventoryHealth(
      state
    );

assert.equal(
  health.databaseVersion,
  '0.8.19'
);

assert.equal(
  health.totalLots,
  3
);

state.day =
  12;

const nearRows =
  inventory
    .lotRows(
      state
    );

assert.ok(
  nearRows.some(
    row =>
      row.batchNo ===
        'batch_old' &&
      row.status.status ===
        'expires_today'
  ),
  '到期日当天必须产生到期预警'
);

state.day =
  13;

assert.equal(
  inventory
    .availableGrams(
      state,
      chilled.id
    ),
  1000,
  '过期批次不能计入可用库存'
);

const legacyState =
  inventory
    .createInventory({
      day:20
    });

legacyState.lots.push({
  id:'legacy_001',
  ingredientId:
    ambient.id,
  grams:500,
  receivedDay:18,
  expiryDay:30,
  unitCostPerKg:9,
  quality:75
});

const legacyRows =
  inventory
    .lotRows(
      legacyState
    );

assert.equal(
  legacyRows.length,
  1
);

assert.equal(
  legacyRows[0].batchNo,
  'legacy_001',
  '旧批次缺少batchNo时必须自动兼容'
);

assert.ok(
  legacyRows[0].storage
);

console.log(
  'V0.8.19 inventory integration tests passed'
);
