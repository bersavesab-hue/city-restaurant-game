'use strict';

const assert =
  require('assert');

const customer =
  require('../src/customer/index.js');

const { SeededRng } =
  require('../src/foundation/rng.js');

const rngA =
  new SeededRng(
    'customer-v0821-repeat'
  );

const rngB =
  new SeededRng(
    'customer-v0821-repeat'
  );

const a =
  customer.engine
    .createSegmentProfile(
      rngA,
      {
        districtId:
          'cbd'
      }
    );

const b =
  customer.engine
    .createSegmentProfile(
      rngB,
      {
        districtId:
          'cbd'
      }
    );

assert.deepEqual(
  a,
  b,
  '相同seed的顾客生成必须可重放'
);

assert.ok(
  a.randomProfile
);

assert.equal(
  a.randomProfile.version,
  '0.8.21'
);

assert.ok(
  a
    .randomProfile
    .priceSensitivityProfileId
);

assert.ok(
  a
    .randomProfile
    .queueProfileId
);

assert.ok(
  a
    .randomProfile
    .loyaltyProfileId
);

const population =
  customer.engine
    .buildDistrictPopulation(
      new SeededRng(
        'customer-v0821-pop'
      ),
      {
        districtId:
          'university',
        count:500
      }
    );

assert.equal(
  population.count,
  500
);

assert.ok(
  population
    .profiles
    .every(
      item =>
        item.randomProfile &&
        item.randomProfile
          .version ===
          '0.8.21'
    )
);

const insights =
  customer.database
    .aggregateProfiles(
      Object.fromEntries(
        population
          .profiles
          .map(
            item => [
              item.id,
              item
            ]
          )
      )
    );

assert.equal(
  insights.customerCount,
  500
);

assert.ok(
  Object.keys(
    insights.segments
  ).length >
  1
);

assert.ok(
  Object.keys(
    insights.incomeBands
  ).length >
  1
);

console.log(
  'V0.8.21 customer engine integration tests passed'
);
