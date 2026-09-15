'use strict';

const assert =
  require('assert');

const runtimeEngine =
  require('../src/operations/restaurantRuntimeV10.js');

const live =
  require('../src/operations/liveOperationsCoordinatorV0824.js');

const runtime =
  runtimeEngine
    .createRuntime({
      seed:'live-v0824',
      shopId:'shop_live_v0824',
      day:10
    });

const normalized =
  live
    .ensureRuntime(
      runtime
    );

assert.equal(
  normalized
    .simulation
    .version,
  '0.8.24'
);

assert.ok(
  normalized.customers
);

const customer =
  live
    .resolveCustomer(
      runtime,
      null,
      {
        districtId:'cbd'
      }
    );

assert.ok(
  customer
);

assert.ok(
  runtime.customers[
    customer.id
  ]
);

const snapshot =
  live
    .snapshot(
      runtime,
      {
        staff:{
          headcount:0
        }
      }
    );

assert.equal(
  snapshot.version,
  '0.8.24'
);

assert.equal(
  snapshot.shopId,
  'shop_live_v0824'
);

assert.ok(
  snapshot.menu.total >=
  0
);

assert.ok(
  snapshot.customers
);

assert.ok(
  snapshot.finance
);

console.log(
  'V0.8.24 live operations coordinator tests passed'
);
