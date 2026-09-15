'use strict';

const supplierEngine =
  require('./supplierEngineV10.js');

const supplierRules =
  require('./supplierRulesV10.js');

const database =
  require('./supplierProcurementDatabaseV0820.js');

const inventoryEngine =
  require('../inventory/inventoryEngineV10.js');

const ingredientDatabase =
  require('../inventory/ingredientInventoryDatabaseV0819.js');

function createProcurementState() {
  return {
    version:'0.8.20',
    sequence:0,
    purchaseOrders:[],
    spend:0,
    receivedValue:0,
    returns:0
  };
}

function ensureState(state) {
  state.version =
    '0.8.20';

  state.sequence =
    Math.max(
      0,
      Number(
        state.sequence
      ) || 0
    );

  state.purchaseOrders =
    Array.isArray(
      state.purchaseOrders
    )
      ? state.purchaseOrders
      : [];

  state.spend =
    Math.max(
      0,
      Number(
        state.spend
      ) || 0
    );

  state.receivedValue =
    Math.max(
      0,
      Number(
        state.receivedValue
      ) || 0
    );

  state.returns =
    Math.max(
      0,
      Number(
        state.returns
      ) || 0
    );

  return state;
}

function bestQuote(
  network,
  ingredientId,
  qtyKg,
  ctx
) {
  const context =
    ctx ||
    {};

  const requestedKg =
    Math.max(
      0.1,
      Number(
        qtyKg
      ) || 0
    );

  const quotes = [];

  for (
    const supplier
    of network ||
      []
  ) {
    if (
      !supplierEngine
        .supports(
          supplier,
          ingredientId
        )
    ) {
      continue;
    }

    const orderKg =
      Math.max(
        requestedKg,
        supplierRules
          .minOrderKg(
            supplier
          )
      );

    const q =
      supplierEngine
        .quote(
          supplier,
          ingredientId,
          orderKg,
          context
        );

    if (
      q &&
      q.ok
    ) {
      q.requestedKg =
        requestedKg;

      q.moqAdjusted =
        orderKg >
        requestedKg +
          0.0001;

      quotes.push(
        database
          .enrichQuote(
            q,
            supplier
          )
      );
    }
  }

  quotes.sort(
    (
      a,
      b
    ) =>
      a.score -
      b.score
  );

  return (
    quotes[0] ||
    null
  );
}

function createPurchaseOrder(
  state,
  quote,
  ctx
) {
  ensureState(
    state
  );

  const context =
    ctx ||
    {};

  if (
    !quote ||
    !quote.ok
  ) {
    return {
      ok:false,
      reason:'报价无效'
    };
  }

  const orderedDay =
    Number(
      context.day
    ) || 1;

  const expectedDay =
    orderedDay +
    Math.max(
      0,
      Number(
        quote.leadDays
      ) || 0
    );

  const po = {
    id:
      `po_${++state.sequence}`,
    databaseVersion:
      database.VERSION,
    supplierId:
      quote.supplierId,
    ingredientId:
      quote.ingredientId,
    ingredientName:
      quote.ingredientName,
    qtyKg:
      quote.qtyKg,
    requestedKg:
      quote.requestedKg ==
        null
        ? quote.qtyKg
        : quote.requestedKg,
    moqAdjusted:
      !!quote.moqAdjusted,
    unitPrice:
      quote.unitPrice,
    total:
      quote.total,
    freight:
      quote.freight,
    status:'ordered',
    shipmentStatus:'ordered',
    paymentStatus:'pending',
    orderedDay,
    expectedDay,
    paymentDueDay:
      database
        .paymentDueDay(
          orderedDay,
          quote.paymentTermId
        ),
    paymentTermId:
      quote.paymentTermId,
    deliveryModeId:
      quote.deliveryModeId,
    quality:
      quote.quality,
    reliability:
      quote.reliability,
    source:
      context.source ||
      'manual',
    negotiated:
      !!quote.negotiated
  };

  state.purchaseOrders
    .push(
      po
    );

  state.spend +=
    Number(
      po.total
    ) || 0;

  database
    .recordOrder(
      context.network,
      po
    );

  return {
    ok:true,
    po
  };
}

function getPurchaseOrder(
  state,
  poId
) {
  ensureState(
    state
  );

  return (
    state
      .purchaseOrders
      .find(
        item =>
          item.id ===
          poId
      ) ||
    null
  );
}

function updatePurchaseOrderStatuses(
  state,
  day
) {
  ensureState(
    state
  );

  const current =
    Number(
      day
    ) || 0;

  let changed =
    0;

  for (
    const po
    of state.purchaseOrders
  ) {
    const next =
      database
        .deliveryState(
          po,
          current
        );

    if (
      po.shipmentStatus !==
      next
    ) {
      po.shipmentStatus =
        next;

      changed +=
        1;
    }

    if (
      po.paymentDueDay ==
      null
    ) {
      po.paymentDueDay =
        database
          .paymentDueDay(
            po.orderedDay,
            po.paymentTermId
          );
    }
  }

  return {
    changed:
      changed >
      0,
    changedCount:
      changed
  };
}

function receivePurchaseOrder(
  state,
  poId,
  inventory,
  ctx
) {
  ensureState(
    state
  );

  const context =
    ctx ||
    {};

  const po =
    getPurchaseOrder(
      state,
      poId
    );

  if (!po) {
    return {
      ok:false,
      reason:'采购单不存在'
    };
  }

  if (
    po.status ===
    'received'
  ) {
    return {
      ok:false,
      reason:'采购单已收货'
    };
  }

  if (
    [
      'cancelled',
      'returned'
    ].includes(
      po.status
    )
  ) {
    return {
      ok:false,
      reason:'采购单已终止'
    };
  }

  const day =
    Number(
      context.day ??
      po.expectedDay
    );

  if (
    context.enforceArrival ===
      true &&
    context.allowEarly !==
      true &&
    day <
      Number(
        po.expectedDay
      )
  ) {
    po.shipmentStatus =
      database
        .deliveryState(
          po,
          day
        );

    return {
      ok:false,
      reason:'货物尚未到达',
      expectedDay:
        po.expectedDay,
      currentDay:
        day
    };
  }

  const ingredient =
    ingredientDatabase
      .getIngredient(
        po.ingredientId
      );

  if (!ingredient) {
    return {
      ok:false,
      reason:'食材不存在'
    };
  }

  const result =
    inventoryEngine
      .receive(
        inventory,
        {
          ingredientId:
            po.ingredientId,
          grams:
            po.qtyKg *
            1000,
          unitCostPerKg:
            po.unitPrice,
          shelfDays:
            ingredient
              .shelfDays,
          day,
          supplierId:
            po.supplierId,
          quality:
            po.quality,
          batchNo:
            po.id
        }
      );

  if (!result.ok) {
    return result;
  }

  po.status =
    'received';

  po.shipmentStatus =
    'received';

  po.receivedDay =
    day;

  state.receivedValue +=
    Number(
      po.total
    ) || 0;

  database
    .recordDelivery(
      context.network,
      po,
      day,
      {
        qualityIncident:
          Number(
            po.quality
          ) <
          55
      }
    );

  return {
    ok:true,
    po,
    lot:
      result.lot
  };
}

function cancelPurchaseOrder(
  state,
  poId,
  ctx
) {
  ensureState(
    state
  );

  const po =
    getPurchaseOrder(
      state,
      poId
    );

  if (!po) {
    return {
      ok:false,
      reason:'采购单不存在'
    };
  }

  if (
    po.status ===
    'received'
  ) {
    return {
      ok:false,
      reason:'已收货采购单不能取消'
    };
  }

  if (
    po.status ===
    'cancelled'
  ) {
    return {
      ok:false,
      reason:'采购单已经取消'
    };
  }

  const context =
    ctx ||
    {};

  po.status =
    'cancelled';

  po.shipmentStatus =
    'cancelled';

  po.cancelledDay =
    Number(
      context.day
    ) || null;

  po.cancelReason =
    String(
      context.reason ||
      'manual'
    );

  return {
    ok:true,
    po
  };
}

function procurementOverview(
  state,
  network,
  day
) {
  ensureState(
    state
  );

  updatePurchaseOrderStatuses(
    state,
    day
  );

  return (
    database
      .procurementOverview(
        state,
        network,
        day
      )
  );
}

function autoProcure(
  state,
  network,
  inventory,
  targets,
  ctx
) {
  ensureState(
    state
  );

  const context =
    ctx ||
    {};

  const suggestions =
    inventoryEngine
      .reorderSuggestions(
        inventory,
        targets
      );

  const created = [];

  for (
    const suggestion
    of suggestions
  ) {
    const kg =
      Math.max(
        2,
        Math.ceil(
          suggestion
            .reorderGrams /
          1000
        )
      );

    const q =
      bestQuote(
        network,
        suggestion.ingredientId,
        kg,
        context
      );

    if (!q) {
      continue;
    }

    const r =
      createPurchaseOrder(
        state,
        q,
        {
          ...context,
          network,
          source:
            context.source ||
            'auto_procure'
        }
      );

    if (r.ok) {
      created.push(
        r.po
      );
    }
  }

  return created;
}

module.exports = {
  createProcurementState,
  ensureState,
  bestQuote,
  createPurchaseOrder,
  getPurchaseOrder,
  updatePurchaseOrderStatuses,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  procurementOverview,
  autoProcure
};
