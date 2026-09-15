'use strict';

const pack =
  require('./supplierPackV10.js');

const rules =
  require('./supplierRulesV10.js');

const ingredientDatabase =
  require('../inventory/ingredientInventoryDatabaseV0819.js');

const VERSION =
  '0.8.20';

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function byId(
  list,
  id
) {
  return (
    (list || [])
      .find(
        item =>
          item.id === id
      ) ||
    null
  );
}

function getCategory(id) {
  const item =
    byId(
      pack.SUPPLIER_CATEGORIES,
      id
    );

  return item
    ? clone(item)
    : null;
}

function getTier(id) {
  const item =
    byId(
      pack.SCALE_TIERS ||
      [],
      id
    );

  if (item) {
    return clone(item);
  }

  const archetype =
    pack.SUPPLIER_ARCHETYPES
      .find(
        row =>
          row.tierId === id
      );

  if (!archetype) {
    return null;
  }

  return {
    id,
    name:id
  };
}

function getPaymentTerm(id) {
  const item =
    byId(
      pack.PAYMENT_TERMS,
      id
    );

  return item
    ? clone(item)
    : null;
}

function getDeliveryMode(id) {
  const item =
    byId(
      pack.DELIVERY_MODES,
      id
    );

  return item
    ? clone(item)
    : null;
}

function getQuoteStrategy(id) {
  const item =
    byId(
      pack.QUOTE_STRATEGIES,
      id
    );

  return item
    ? clone(item)
    : null;
}

function getNegotiationStyle(id) {
  const item =
    byId(
      pack.NEGOTIATION_STYLES,
      id
    );

  return item
    ? clone(item)
    : null;
}

function getCooperationMode(id) {
  const item =
    byId(
      pack.COOPERATION_MODES,
      id
    );

  return item
    ? clone(item)
    : null;
}

function getContractType(id) {
  const item =
    byId(
      pack.CONTRACT_TYPES,
      id
    );

  return item
    ? clone(item)
    : null;
}

function enrichSupplier(
  supplier
) {
  if (!supplier) {
    return null;
  }

  const category =
    getCategory(
      supplier.categoryId
    );

  const paymentTerm =
    getPaymentTerm(
      supplier.paymentTermId
    );

  const deliveryMode =
    getDeliveryMode(
      supplier.deliveryModeId
    );

  const quoteStrategy =
    getQuoteStrategy(
      supplier.quoteStrategyId
    );

  const negotiationStyle =
    getNegotiationStyle(
      supplier.negotiationStyleId
    );

  const ingredientIds =
    Array.isArray(
      supplier.ingredientIds
    )
      ? supplier.ingredientIds
      : [];

  const storageCoverage =
    Array.from(
      new Set(
        ingredientIds
          .map(
            id => {
              const ingredient =
                ingredientDatabase
                  .getIngredient(
                    id
                  );

              return ingredient
                ? ingredient
                    .storageZoneId
                : null;
            }
          )
          .filter(Boolean)
      )
    );

  return {
    ...clone(supplier),
    databaseVersion:VERSION,
    category:
      category,
    paymentTerm,
    deliveryMode,
    quoteStrategy,
    negotiationStyle,
    ingredientCount:
      ingredientIds.length,
    storageCoverage
  };
}

function querySuppliers(
  network,
  filters
) {
  const f =
    filters ||
    {};

  return (
    network ||
    []
  )
    .filter(
      supplier =>
        (
          !f.categoryId ||
          supplier.categoryId ===
            f.categoryId
        ) &&
        (
          !f.tierId ||
          supplier.tierId ===
            f.tierId
        ) &&
        (
          !f.ingredientId ||
          (
            supplier.ingredientIds ||
            []
          ).includes(
            f.ingredientId
          )
        ) &&
        (
          f.active == null ||
          (
            supplier.active !==
            false
          ) ===
            !!f.active
        ) &&
        (
          f.minReliability == null ||
          Number(
            supplier.reliability
          ) >=
            Number(
              f.minReliability
            )
        ) &&
        (
          f.minQuality == null ||
          Number(
            supplier.quality
          ) >=
            Number(
              f.minQuality
            )
        ) &&
        (
          !f.paymentTermId ||
          supplier.paymentTermId ===
            f.paymentTermId
        ) &&
        (
          !f.deliveryModeId ||
          supplier.deliveryModeId ===
            f.deliveryModeId
        )
    )
    .map(
      enrichSupplier
    );
}

function minimumOrderKg(
  supplier
) {
  return rules
    .minOrderKg(
      supplier
    );
}

function enrichQuote(
  quote,
  supplier
) {
  if (!quote) {
    return null;
  }

  const supplierView =
    supplier
      ? enrichSupplier(
          supplier
        )
      : null;

  const paymentTerm =
    getPaymentTerm(
      quote.paymentTermId
    );

  const deliveryMode =
    getDeliveryMode(
      quote.deliveryModeId
    );

  const total =
    Number(
      quote.total
    ) ||
    0;

  const reliability =
    Number(
      quote.reliability
    ) ||
    0;

  const quality =
    Number(
      quote.quality
    ) ||
    0;

  const score =
    total *
    (
      1 +
      (
        100 -
        reliability
      ) *
      0.003 +
      (
        100 -
        quality
      ) *
      0.0018
    );

  return {
    ...clone(quote),
    databaseVersion:VERSION,
    supplierName:
      supplierView
        ? supplierView.name
        : null,
    supplierCategory:
      supplierView
        ? supplierView.category
        : null,
    supplierTierId:
      supplierView
        ? supplierView.tierId
        : null,
    relationship:
      supplierView
        ? Number(
            supplierView.relationship
          ) || 0
        : null,
    minimumKg:
      supplier
        ? minimumOrderKg(
            supplier
          )
        : null,
    paymentTerm,
    deliveryMode,
    score:
      Number(
        score.toFixed(2)
      )
  };
}

function paymentDueDay(
  orderedDay,
  paymentTermId
) {
  const day =
    Number(
      orderedDay
    ) ||
    0;

  const term =
    getPaymentTerm(
      paymentTermId
    );

  if (!term) {
    return day;
  }

  const days =
    Number(
      term.days
    ) ||
    0;

  return day +
    Math.max(
      0,
      days
    );
}

function deliveryState(
  po,
  day
) {
  if (!po) {
    return 'missing';
  }

  const status =
    String(
      po.status ||
      ''
    );

  if (
    [
      'received',
      'cancelled',
      'payment_failed',
      'returned'
    ].includes(
      status
    )
  ) {
    return status;
  }

  const current =
    Number(
      day
    ) ||
    Number(
      po.orderedDay
    ) ||
    0;

  const ordered =
    Number(
      po.orderedDay
    ) ||
    current;

  const expected =
    Number(
      po.expectedDay
    );

  if (
    !Number.isFinite(
      expected
    )
  ) {
    return 'ordered';
  }

  if (
    current <=
    ordered &&
    expected >
    ordered
  ) {
    return 'ordered';
  }

  if (
    current <
    expected
  ) {
    return 'in_transit';
  }

  if (
    current ===
    expected
  ) {
    return 'due';
  }

  return 'overdue';
}

function enrichPurchaseOrder(
  po,
  network,
  day
) {
  if (!po) {
    return null;
  }

  const supplier =
    (
      network ||
      []
    ).find(
      item =>
        item.id ===
        po.supplierId
    ) ||
    null;

  return {
    ...clone(po),
    databaseVersion:VERSION,
    shipmentStatus:
      deliveryState(
        po,
        day
      ),
    supplier:
      supplier
        ? enrichSupplier(
            supplier
          )
        : null,
    paymentTerm:
      getPaymentTerm(
        po.paymentTermId
      ),
    deliveryMode:
      getDeliveryMode(
        po.deliveryModeId
      ),
    paymentDueDay:
      po.paymentDueDay ==
        null
        ? paymentDueDay(
            po.orderedDay,
            po.paymentTermId
          )
        : Number(
            po.paymentDueDay
          )
  };
}

function procurementOverview(
  state,
  network,
  day
) {
  const purchaseOrders =
    state &&
    Array.isArray(
      state.purchaseOrders
    )
      ? state.purchaseOrders
      : [];

  const rows =
    purchaseOrders
      .map(
        po =>
          enrichPurchaseOrder(
            po,
            network,
            day
          )
      );

  const byStatus = {};

  for (
    const row
    of rows
  ) {
    byStatus[
      row.shipmentStatus
    ] =
      (
        byStatus[
          row.shipmentStatus
        ] ||
        0
      ) +
      1;
  }

  const openRows =
    rows.filter(
      row =>
        ![
          'received',
          'cancelled',
          'payment_failed',
          'returned'
        ].includes(
          row.shipmentStatus
        )
    );

  return {
    databaseVersion:VERSION,
    orderCount:
      rows.length,
    openOrderCount:
      openRows.length,
    receivedOrderCount:
      byStatus.received ||
      0,
    overdueOrderCount:
      byStatus.overdue ||
      0,
    orderedValue:
      Number(
        (
          Number(
            state &&
            state.spend
          ) ||
          rows.reduce(
            (
              sum,
              row
            ) =>
              sum +
              (
                Number(
                  row.total
                ) ||
                0
              ),
            0
          )
        ).toFixed(2)
      ),
    receivedValue:
      Number(
        (
          Number(
            state &&
            state.receivedValue
          ) ||
          0
        ).toFixed(2)
      ),
    byStatus,
    rows
  };
}

function supplierById(
  network,
  supplierId
) {
  return (
    (
      network ||
      []
    ).find(
      item =>
        item.id ===
        supplierId
    ) ||
    null
  );
}

function ensureSupplierHistory(
  supplier
) {
  if (!supplier) {
    return null;
  }

  supplier.history =
    supplier.history &&
    typeof supplier.history ===
      'object'
      ? supplier.history
      : {};

  for (
    const key
    of [
      'orders',
      'onTime',
      'late',
      'qualityIncidents',
      'totalSpend'
    ]
  ) {
    supplier.history[
      key
    ] =
      Math.max(
        0,
        Number(
          supplier.history[
            key
          ]
        ) ||
        0
      );
  }

  return supplier.history;
}

function recordOrder(
  network,
  po
) {
  if (
    !po ||
    po.supplierHistoryRecorded
  ) {
    return false;
  }

  const supplier =
    supplierById(
      network,
      po.supplierId
    );

  if (!supplier) {
    return false;
  }

  const history =
    ensureSupplierHistory(
      supplier
    );

  history.orders +=
    1;

  history.totalSpend +=
    Number(
      po.total
    ) ||
    0;

  po.supplierHistoryRecorded =
    true;

  return true;
}

function recordDelivery(
  network,
  po,
  receivedDay,
  options
) {
  if (
    !po ||
    po.deliveryHistoryRecorded
  ) {
    return false;
  }

  const supplier =
    supplierById(
      network,
      po.supplierId
    );

  if (!supplier) {
    return false;
  }

  const history =
    ensureSupplierHistory(
      supplier
    );

  const day =
    Number(
      receivedDay
    ) ||
    Number(
      po.expectedDay
    ) ||
    0;

  const expected =
    Number(
      po.expectedDay
    ) ||
    day;

  const late =
    day >
    expected;

  if (late) {
    history.late +=
      1;

    supplier.relationship =
      rules.clamp(
        (
          Number(
            supplier.relationship
          ) ||
          50
        ) -
        2
      );
  } else {
    history.onTime +=
      1;

    supplier.relationship =
      rules.clamp(
        (
          Number(
            supplier.relationship
          ) ||
          50
        ) +
        1
      );
  }

  if (
    options &&
    options.qualityIncident
  ) {
    history.qualityIncidents +=
      1;

    supplier.relationship =
      rules.clamp(
        supplier.relationship -
        3
      );
  }

  po.deliveryHistoryRecorded =
    true;

  return true;
}

function getStats() {
  const packStats =
    pack.stats();

  return {
    version:VERSION,
    categories:
      packStats.categories,
    archetypes:
      packStats.archetypes,
    cooperationModes:
      packStats.cooperationModes,
    paymentTerms:
      packStats.paymentTerms,
    deliveryModes:
      packStats.deliveryModes,
    quoteStrategies:
      packStats.quoteStrategies,
    negotiationStyles:
      packStats.negotiationStyles,
    risks:
      packStats.risks,
    relationshipEvents:
      packStats.relationshipEvents,
    contractTypes:
      packStats.contractTypes
  };
}

function validate() {
  const issues = [];

  const stats =
    getStats();

  const expected = {
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
  };

  for (
    const key
    of Object.keys(
      expected
    )
  ) {
    if (
      stats[
        key
      ] !==
      expected[
        key
      ]
    ) {
      issues.push(
        key +
        ' 数量异常，期望=' +
        expected[
          key
        ] +
        ' 实际=' +
        stats[
          key
        ]
      );
    }
  }

  const archetypeIds =
    pack.SUPPLIER_ARCHETYPES
      .map(
        item =>
          item.id
      );

  if (
    new Set(
      archetypeIds
    ).size !==
    archetypeIds.length
  ) {
    issues.push(
      '供应商原型ID存在重复'
    );
  }

  const ingredientIds =
    new Set(
      ingredientDatabase
        .foodPack
        .INGREDIENTS
        .map(
          item =>
            item.id
        )
    );

  for (
    const category
    of pack.SUPPLIER_CATEGORIES
  ) {
    for (
      const ingredientCategory
      of category
          .ingredientCategories
    ) {
      const ids =
        pack
          .INGREDIENTS_BY_CATEGORY[
            ingredientCategory
          ] ||
        [];

      if (!ids.length) {
        issues.push(
          category.id +
          ' 引用空食材分类 ' +
          ingredientCategory
        );
      }

      for (
        const id
        of ids
      ) {
        if (
          !ingredientIds.has(
            id
          )
        ) {
          issues.push(
            category.id +
            ' 引用不存在食材 ' +
            id
          );
        }
      }
    }
  }

  return {
    ok:
      issues.length ===
      0,
    issues,
    stats
  };
}

module.exports = {
  VERSION,
  pack,
  getCategory,
  getTier,
  getPaymentTerm,
  getDeliveryMode,
  getQuoteStrategy,
  getNegotiationStyle,
  getCooperationMode,
  getContractType,
  enrichSupplier,
  querySuppliers,
  minimumOrderKg,
  enrichQuote,
  paymentDueDay,
  deliveryState,
  enrichPurchaseOrder,
  procurementOverview,
  recordOrder,
  recordDelivery,
  getStats,
  validate
};
