'use strict';

const assert =
  require('assert');

const supplierEngine =
  require('../src/supplier/supplierEngineV10.js');

const procurement =
  require('../src/supplier/procurementEngineV10.js');

const inventory =
  require('../src/inventory/inventoryEngineV10.js');

const ingredientDatabase =
  require('../src/inventory/ingredientInventoryDatabaseV0819.js');

const network =
  supplierEngine
    .createSupplierNetwork(
      'v0820-procurement'
    );

const state =
  procurement
    .createProcurementState();

const stock =
  inventory
    .createInventory({
      day:10,
      ambientKg:200,
      chilledKg:200,
      frozenKg:200
    });

const ingredient =
  ingredientDatabase
    .queryIngredients({})[0];

assert.ok(ingredient);

const supplier =
  network.find(
    row =>
      row.ingredientIds
        .includes(
          ingredient.id
        )
  );

assert.ok(supplier);

const quote =
  supplierEngine
    .quote(
      supplier,
      ingredient.id,
      Math.max(
        20,
        require('../src/supplier/supplierRulesV10.js')
          .minOrderKg(
            supplier
          )
      ),
      {
        day:10
      }
    );

assert.ok(quote.ok);

quote.leadDays =
  2;

const created =
  procurement
    .createPurchaseOrder(
      state,
      quote,
      {
        day:10,
        network,
        source:'integration_test'
      }
    );

assert.ok(created.ok);

const po =
  created.po;

assert.equal(
  po.databaseVersion,
  '0.8.20'
);

assert.equal(
  po.shipmentStatus,
  'ordered'
);

assert.equal(
  po.expectedDay,
  12
);

assert.ok(
  Number.isFinite(
    Number(
      po.paymentDueDay
    )
  )
);

assert.equal(
  supplier.history.orders,
  1
);

procurement
  .updatePurchaseOrderStatuses(
    state,
    11
  );

assert.equal(
  po.shipmentStatus,
  'in_transit'
);

const early =
  procurement
    .receivePurchaseOrder(
      state,
      po.id,
      stock,
      {
        day:11,
        network,
        enforceArrival:true
      }
    );

assert.equal(
  early.ok,
  false,
  '未到预计到货日不能强制收货'
);

procurement
  .updatePurchaseOrderStatuses(
    state,
    12
  );

assert.equal(
  po.shipmentStatus,
  'due'
);

const received =
  procurement
    .receivePurchaseOrder(
      state,
      po.id,
      stock,
      {
        day:12,
        network,
        enforceArrival:true
      }
    );

assert.ok(received.ok);

assert.equal(
  po.status,
  'received'
);

assert.equal(
  po.shipmentStatus,
  'received'
);

assert.equal(
  received.lot.batchNo,
  po.id,
  '采购单ID必须进入库存批次，形成追溯链'
);

assert.equal(
  supplier.history.onTime,
  1
);

assert.equal(
  supplier.history.late,
  0
);

assert.ok(
  supplier.relationship >
  50
);

const overview =
  procurement
    .procurementOverview(
      state,
      network,
      12
    );

assert.equal(
  overview.databaseVersion,
  '0.8.20'
);

assert.equal(
  overview.orderCount,
  1
);

assert.equal(
  overview.receivedOrderCount,
  1
);

assert.equal(
  overview.openOrderCount,
  0
);

const secondQuote = {
  ...quote,
  leadDays:1
};

const second =
  procurement
    .createPurchaseOrder(
      state,
      secondQuote,
      {
        day:20,
        network
      }
    );

assert.ok(second.ok);

procurement
  .updatePurchaseOrderStatuses(
    state,
    22
  );

assert.equal(
  second.po.shipmentStatus,
  'overdue'
);

const late =
  procurement
    .receivePurchaseOrder(
      state,
      second.po.id,
      stock,
      {
        day:22,
        network,
        enforceArrival:true
      }
    );

assert.ok(late.ok);

assert.equal(
  supplier.history.late,
  1,
  '迟到收货必须记录供应商履约'
);

const cancelQuote = {
  ...quote,
  leadDays:3
};

const cancelOrder =
  procurement
    .createPurchaseOrder(
      state,
      cancelQuote,
      {
        day:30,
        network
      }
    );

assert.ok(cancelOrder.ok);

const cancelled =
  procurement
    .cancelPurchaseOrder(
      state,
      cancelOrder.po.id,
      {
        day:30,
        reason:'test_cancel'
      }
    );

assert.ok(cancelled.ok);

assert.equal(
  cancelOrder.po.status,
  'cancelled'
);

console.log(
  'V0.8.20 procurement/logistics integration tests passed'
);
