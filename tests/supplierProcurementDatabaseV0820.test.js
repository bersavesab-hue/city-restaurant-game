'use strict';

const assert =
  require('assert');

const database =
  require('../src/supplier/supplierProcurementDatabaseV0820.js');

const supplierEngine =
  require('../src/supplier/supplierEngineV10.js');

const validation =
  database.validate();

assert.ok(
  validation.ok,
  validation.issues.join('; ')
);

const stats =
  validation.stats;

assert.deepEqual(
  {
    categories:
      stats.categories,
    archetypes:
      stats.archetypes,
    cooperationModes:
      stats.cooperationModes,
    paymentTerms:
      stats.paymentTerms,
    deliveryModes:
      stats.deliveryModes,
    quoteStrategies:
      stats.quoteStrategies,
    negotiationStyles:
      stats.negotiationStyles,
    risks:
      stats.risks,
    relationshipEvents:
      stats.relationshipEvents,
    contractTypes:
      stats.contractTypes
  },
  {
    categories:18,
    archetypes:126,
    cooperationModes:22,
    paymentTerms:18,
    deliveryModes:20,
    quoteStrategies:30,
    negotiationStyles:24,
    risks:36,
    relationshipEvents:30,
    contractTypes:16
  }
);

const networkA =
  supplierEngine
    .createSupplierNetwork(
      'v0820-test-seed'
    );

const networkB =
  supplierEngine
    .createSupplierNetwork(
      'v0820-test-seed'
    );

assert.equal(
  networkA.length,
  126
);

assert.deepEqual(
  networkA.slice(0, 5),
  networkB.slice(0, 5),
  '相同seed必须生成相同供应商网络'
);

const first =
  database
    .enrichSupplier(
      networkA[0]
    );

assert.equal(
  first.databaseVersion,
  '0.8.20'
);

assert.ok(first.category);
assert.ok(first.paymentTerm);
assert.ok(first.deliveryMode);
assert.ok(first.quoteStrategy);
assert.ok(first.negotiationStyle);
assert.ok(
  first.ingredientCount >
  0
);

const ingredientId =
  first.ingredientIds[0];

const supporting =
  database
    .querySuppliers(
      networkA,
      {
        ingredientId
      }
    );

assert.ok(
  supporting.length >
  0
);

assert.ok(
  supporting.every(
    item =>
      item.ingredientIds
        .includes(
          ingredientId
        )
  )
);

const quote =
  supplierEngine
    .quote(
      networkA[0],
      ingredientId,
      Math.max(
        20,
        database
          .minimumOrderKg(
            networkA[0]
          )
      ),
      {
        day:10
      }
    );

assert.ok(quote.ok);

const enrichedQuote =
  database
    .enrichQuote(
      quote,
      networkA[0]
    );

assert.equal(
  enrichedQuote.databaseVersion,
  '0.8.20'
);

assert.ok(
  enrichedQuote.supplierName
);

assert.ok(
  enrichedQuote.paymentTerm
);

assert.ok(
  enrichedQuote.deliveryMode
);

assert.ok(
  enrichedQuote.score >
  0
);

assert.equal(
  database.deliveryState(
    {
      status:'ordered',
      orderedDay:10,
      expectedDay:12
    },
    10
  ),
  'ordered'
);

assert.equal(
  database.deliveryState(
    {
      status:'ordered',
      orderedDay:10,
      expectedDay:12
    },
    11
  ),
  'in_transit'
);

assert.equal(
  database.deliveryState(
    {
      status:'ordered',
      orderedDay:10,
      expectedDay:12
    },
    12
  ),
  'due'
);

assert.equal(
  database.deliveryState(
    {
      status:'ordered',
      orderedDay:10,
      expectedDay:12
    },
    13
  ),
  'overdue'
);

console.log(
  'V0.8.20 supplier/procurement database tests passed'
);
