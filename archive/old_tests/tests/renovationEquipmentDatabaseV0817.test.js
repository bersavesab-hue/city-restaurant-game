'use strict';

const assert =
  require('assert');

const database =
  require('../src/renovation/renovationEquipmentDatabaseV0817.js');

const result =
  database.validate();

assert.ok(
  result.ok,
  result.issues.join('; ')
);

const stats =
  result.stats;

assert.equal(
  stats.constructionPackages,
  12
);

assert.equal(
  stats.materials,
  24
);

assert.equal(
  stats.contractorProfiles,
  12
);

assert.equal(
  stats.hallStyles,
  6
);

assert.equal(
  stats.privateRoomStyles,
  5
);

assert.equal(
  stats.materialGrades,
  4
);

assert.equal(
  stats.lightingLevels,
  4
);

assert.equal(
  stats.decorItems,
  4
);

assert.equal(
  stats.equipmentGroups,
  5
);

assert.equal(
  stats.equipmentSkus,
  25
);

assert.equal(
  stats.equipmentGrades,
  3
);

for (
  const group
  of database
      .getEquipmentGroups()
) {
  const rows =
    database
      .getEquipmentSkus({
        groupId:
          group.id
      });

  assert.equal(
    rows.length,
    5,
    group.id +
    ' 应有5个细分设备型号'
  );
}

const metrics = {
  totalArea:180,
  kitchenArea:46,
  totalCost:168000,
  buildDays:12
};

const a =
  database
    .quoteContractors(
      metrics,
      'shop_db_test',
      8172026
    );

const b =
  database
    .quoteContractors(
      metrics,
      'shop_db_test',
      8172026
    );

assert.equal(
  a.length,
  3,
  '必须继续提供3家施工队报价'
);

assert.deepEqual(
  a,
  b,
  '同seed施工队报价必须确定性可重放'
);

assert.equal(
  new Set(
    a.map(
      item =>
        item.profileId
    )
  ).size,
  3,
  '3家报价必须来自不同施工队档案'
);

assert.ok(
  a.every(
    item =>
      /^contractor_[0-2]$/.test(
        item.id
      ) &&
      item.price >
        0 &&
      item.days >=
        4 &&
      item.reliability >=
        60 &&
      item.quality >=
        60
  )
);

const breakdown =
  database
    .estimateConstructionBreakdown(
      metrics
    );

assert.equal(
  breakdown.length,
  12
);

assert.ok(
  breakdown.every(
    item =>
      item.referenceCost >
        0 &&
      item.referenceDays >
        0
  )
);

console.log(
  'V0.8.17 renovation/equipment database tests passed'
);
