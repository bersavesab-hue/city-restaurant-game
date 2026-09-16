'use strict';

const assert =
  require('assert');

const database =
  require('../src/property/cityPropertyDatabaseV0815.js');

const validation =
  database.validate();

assert.equal(
  database.VERSION,
  '0.8.15'
);

assert.ok(
  validation.ok,
  '城市/商圈/房源关系必须完整: ' +
  validation.issues.join('; ')
);

const stats =
  validation.stats;

assert.equal(
  stats.cityCount,
  1
);

assert.equal(
  stats.districtCount,
  7
);

assert.equal(
  stats.streetCount,
  42
);

assert.equal(
  stats.potentialAddressCount,
  756
);

assert.equal(
  stats.staticBaselineListingCount,
  336
);

assert.equal(
  stats.categoryCount,
  16
);

assert.equal(
  stats.subtypeCount,
  96
);

assert.equal(
  stats.structureTemplateCount,
  240
);

assert.equal(
  stats.sizeBandCount,
  7
);

for (
  const district
  of database
      .getDistricts(
        'yunzhou'
      )
) {
  assert.equal(
    database
      .getStreets(
        district.id
      )
      .length,
    6,
    district.id +
    ' 必须严格对应6条街道'
  );
}

const graph =
  database
    .getCityGraph(
      'yunzhou'
    );

assert.ok(graph);
assert.equal(
  graph.districts.length,
  7
);

assert.ok(
  graph.districts
    .every(
      district =>
        district.streets.length ===
        6
    )
);

const categories =
  database
    .getPropertyCategories();

assert.equal(
  categories.length,
  16
);

const sampleCategory =
  categories[0];

assert.ok(
  database
    .getPropertySubtypes({
      categoryId:
        sampleCategory.id
    })
    .length >
    0
);

assert.ok(
  database
    .getPropertySubtypes({
      minArea:6,
      maxArea:25
    })
    .length >
    0,
  '微型铺位必须可以按面积检索'
);

console.log(
  'V0.8.15 city/property database tests passed'
);
