'use strict';

const assert =
  require('assert');

const market =
  require('../src/property/propertyMarketSystem.js');

market.reset({
  seed:8152026,
  currentDay:1
});

const overview =
  market.initialize();

assert.equal(
  overview.potentialPropertyCount,
  756
);

const listings =
  market.getLiveListings();

assert.ok(
  listings.length >
  0
);

for (
  const item
  of listings.slice(
    0,
    Math.min(
      40,
      listings.length
    )
  )
) {
  assert.equal(
    item.databaseVersion,
    '0.8.15'
  );

  assert.equal(
    item.propertyV02,
    true
  );

  assert.ok(
    item.propertySubtypeId,
    '动态挂牌必须拥有96铺型体系中的二级铺型'
  );

  assert.ok(
    item.propertyCategoryId,
    '动态挂牌必须拥有一级物业大类'
  );

  assert.ok(
    item.scaleBandId,
    '动态挂牌必须拥有面积规模档'
  );

  assert.ok(
    item.districtName,
    '动态挂牌必须能回查商圈名称'
  );

  assert.ok(
    item.streetName,
    '动态挂牌必须能回查街道名称'
  );

  assert.equal(
    typeof item.askingMonthlyRent,
    'number'
  );

  assert.equal(
    typeof item.daysOnMarket,
    'number'
  );

  assert.ok(
    Array.isArray(
      item.competingTenants
    )
  );
}

const first =
  listings[0];

const subtypeFiltered =
  market.getLiveListings({
    propertySubtypeId:
      first.propertySubtypeId
  });

assert.ok(
  subtypeFiltered.length >
  0
);

assert.ok(
  subtypeFiltered
    .every(
      item =>
        item.propertySubtypeId ===
          first.propertySubtypeId
    )
);

const snapshot = {
  key:first.marketKey,
  subtype:
    first.propertySubtypeId,
  category:
    first.propertyCategoryId,
  structure:
    first.structureTemplateId,
  scale:
    first.scaleBandId
};

market.reset({
  seed:8152026,
  currentDay:1
});

market.initialize();

const replay =
  market
    .getLiveListings()
    .find(
      item =>
        item.marketKey ===
          snapshot.key
    );

assert.ok(
  replay,
  '相同seed必须重新生成相同挂牌'
);

assert.deepEqual(
  {
    key:replay.marketKey,
    subtype:
      replay.propertySubtypeId,
    category:
      replay.propertyCategoryId,
    structure:
      replay.structureTemplateId,
    scale:
      replay.scaleBandId
  },
  snapshot,
  '动态挂牌完整房源字段必须确定性可重放'
);

console.log(
  'V0.8.15 dynamic listing database integration tests passed'
);
