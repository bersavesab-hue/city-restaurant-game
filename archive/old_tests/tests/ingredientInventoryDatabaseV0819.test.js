'use strict';

const assert =
  require('assert');

const database =
  require('../src/inventory/ingredientInventoryDatabaseV0819.js');

const result =
  database.validate();

assert.ok(
  result.ok,
  result.issues.join('; ')
);

const stats =
  result.stats;

assert.equal(
  stats.ingredients,
  243
);

assert.equal(
  stats.categories,
  20
);

assert.equal(
  stats.storageZones,
  3
);

assert.equal(
  stats.ambientIngredients +
  stats.chilledIngredients +
  stats.frozenIngredients,
  243
);

const categories =
  database
    .getCategories();

assert.equal(
  categories.length,
  20
);

assert.ok(
  categories.every(
    item =>
      item.ingredientCount >
      0
  )
);

const zones =
  database
    .getStorageZones();

assert.deepEqual(
  zones
    .map(
      item =>
        item.id
    )
    .sort(),
  [
    'ambient',
    'chilled',
    'frozen'
  ]
);

const frozen =
  database
    .queryIngredients({
      storage:'frozen'
    });

assert.ok(
  frozen.length >
  0
);

assert.ok(
  frozen.every(
    item =>
      item.storageZoneId ===
      'frozen'
  )
);

const ultraFresh =
  database
    .queryIngredients({
      perishability:
        'ultra_fresh'
    });

assert.ok(
  ultraFresh.length >
  0
);

for (
  const item
  of database
      .queryIngredients({})
) {
  assert.ok(
    item.nearExpiryDays >=
    1
  );

  assert.ok(
    item.storageZone
  );

  assert.equal(
    item.inventoryBaseUnit,
    'g'
  );
}

const lot = {
  id:'legacy_lot',
  ingredientId:
    ultraFresh[0].id,
  grams:1000,
  receivedDay:10,
  expiryDay:12,
  quality:82
};

const normalized =
  database
    .normalizeLot(
      lot,
      11
    );

assert.equal(
  normalized.batchNo,
  'legacy_lot'
);

assert.ok(
  normalized.storage
);

assert.ok(
  normalized.status
);

console.log(
  'V0.8.19 ingredient/inventory database tests passed'
);
