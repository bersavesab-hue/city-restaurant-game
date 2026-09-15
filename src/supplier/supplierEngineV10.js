'use strict';

const pack =
  require('./supplierPackV10.js');

const rules =
  require('./supplierRulesV10.js');

const database =
  require('./supplierProcurementDatabaseV0820.js');

const ingredientDatabase =
  require('../inventory/ingredientInventoryDatabaseV0819.js');

const { SeededRng } =
  require('../foundation/rng.js');

function ingredientIdsForArchetype(
  archetype
) {
  const ids = [];

  for (
    const category
    of archetype.ingredientCategories ||
      []
  ) {
    ids.push(
      ...(
        pack
          .INGREDIENTS_BY_CATEGORY[
            category
          ] ||
        []
      )
    );
  }

  return [
    ...new Set(
      ids
    )
  ];
}

function createSupplier(
  archetype,
  index,
  rng
) {
  const quote =
    pack
      .QUOTE_STRATEGIES[
        index %
        pack
          .QUOTE_STRATEGIES
          .length
      ];

  const negotiation =
    pack
      .NEGOTIATION_STYLES[
        (
          index *
          5
        ) %
        pack
          .NEGOTIATION_STYLES
          .length
      ];

  const payment =
    pack
      .PAYMENT_TERMS[
        (
          index *
          7
        ) %
        pack
          .PAYMENT_TERMS
          .length
      ];

  const delivery =
    pack
      .DELIVERY_MODES[
        (
          index *
          11
        ) %
        pack
          .DELIVERY_MODES
          .length
      ];

  return {
    id:
      `supplier_instance_${String(
        index + 1
      ).padStart(
        3,
        '0'
      )}`,
    name:
      `${archetype.name.split(
        '·'
      )[0]}${index + 1}号`,
    archetypeId:
      archetype.id,
    categoryId:
      archetype.categoryId,
    tierId:
      archetype.tierId,
    ingredientIds:
      ingredientIdsForArchetype(
        archetype
      ),
    reliability:
      rules.clamp(
        archetype
          .baseReliability +
        rng.int(
          -7,
          7
        )
      ),
    quality:
      rules.clamp(
        archetype
          .baseQuality +
        rng.int(
          -6,
          8
        )
      ),
    service:
      rules.clamp(
        68 +
        rng.int(
          -12,
          16
        )
      ),
    relationship:50,
    negotiationPatience:
      rules.clamp(
        52 +
        rng.int(
          -16,
          18
        )
      ),
    capacityIndex:
      Number(
        (
          archetype
            .capacityIndex *
          rng.float(
            0.88,
            1.13
          )
        ).toFixed(
          2
        )
      ),
    priceIndex:
      Number(
        (
          archetype
            .priceIndex *
          rng.float(
            0.94,
            1.07
          )
        ).toFixed(
          3
        )
      ),
    minimumOrderIndex:
      archetype
        .minimumOrderIndex,
    quoteStrategyId:
      quote.id,
    negotiationStyleId:
      negotiation.id,
    paymentTermId:
      payment.id,
    deliveryModeId:
      delivery.id,
    active:true,
    history:{
      orders:0,
      onTime:0,
      late:0,
      qualityIncidents:0,
      totalSpend:0
    }
  };
}

function createSupplierNetwork(
  seed
) {
  const rng =
    new SeededRng(
      seed ||
      'supplier-network-v1'
    );

  return pack
    .SUPPLIER_ARCHETYPES
    .map(
      (
        archetype,
        index
      ) =>
        createSupplier(
          archetype,
          index,
          rng
        )
    );
}

function supports(
  supplier,
  ingredientId
) {
  return !!(
    supplier &&
    supplier.active !==
      false &&
    (
      supplier.ingredientIds ||
      []
    ).includes(
      ingredientId
    )
  );
}

function quote(
  supplier,
  ingredientId,
  qtyKg,
  ctx
) {
  const context =
    ctx ||
    {};

  const ingredient =
    ingredientDatabase
      .getIngredient(
        ingredientId
      );

  if (
    !ingredient ||
    !supports(
      supplier,
      ingredientId
    )
  ) {
    return {
      ok:false,
      reason:
        '该供应商不供应此食材'
    };
  }

  const minKg =
    rules
      .minOrderKg(
        supplier
      );

  const qty =
    Math.max(
      0.1,
      Number(
        qtyKg
      ) || 0
    );

  if (
    qty <
    minKg
  ) {
    return {
      ok:false,
      reason:
        `未达到起订量 ${minKg}kg`,
      minimumKg:
        minKg
    };
  }

  const unitPrice =
    rules
      .pricePerKg(
        ingredient,
        supplier,
        context
      );

  const freight =
    qty >=
    Math.max(
      30,
      minKg *
      2
    )
      ? 0
      : Math.round(
          (
            8 +
            qty *
            0.45
          ) *
          100
        ) /
        100;

  const raw = {
    ok:true,
    supplierId:
      supplier.id,
    ingredientId,
    ingredientName:
      ingredient.name,
    qtyKg:qty,
    unitPrice,
    total:
      Number(
        (
          qty *
          unitPrice +
          freight
        ).toFixed(
          2
        )
      ),
    freight,
    quality:
      supplier.quality,
    reliability:
      supplier.reliability,
    paymentTermId:
      supplier.paymentTermId,
    deliveryModeId:
      supplier.deliveryModeId,
    leadDays:
      Math.max(
        0,
        Math.round(
          3 -
          supplier
            .reliability /
          40 +
          (
            context.emergency
              ? 0
              : -0.5
          )
        )
      )
  };

  return (
    database
      .enrichQuote(
        raw,
        supplier
      )
  );
}

function compareQuotes(
  network,
  ingredientId,
  qtyKg,
  ctx
) {
  return (
    network ||
    []
  )
    .map(
      supplier =>
        quote(
          supplier,
          ingredientId,
          qtyKg,
          ctx
        )
    )
    .filter(
      item =>
        item.ok
    )
    .sort(
      (
        a,
        b
      ) =>
        a.score -
        b.score
    );
}

function negotiateQuote(
  supplier,
  ingredientId,
  qtyKg,
  ctx
) {
  const context =
    ctx ||
    {};

  const base =
    quote(
      supplier,
      ingredientId,
      qtyKg,
      context
    );

  if (!base.ok) {
    return base;
  }

  const unitPrice =
    rules
      .negotiatePrice(
        base.unitPrice,
        supplier,
        context.buyerPower ==
          null
          ? 50
          : context
              .buyerPower,
        context.rounds ==
          null
          ? 1
          : context
              .rounds
      );

  const result = {
    ...base,
    unitPrice,
    total:
      Number(
        (
          unitPrice *
          base.qtyKg +
          (
            Number(
              base.freight
            ) ||
            0
          )
        ).toFixed(
          2
        )
      ),
    negotiated:true,
    negotiationRounds:
      Math.max(
        1,
        Number(
          context.rounds
        ) || 1
      )
  };

  return (
    database
      .enrichQuote(
        result,
        supplier
      )
  );
}

function getSupplierCatalog(
  network,
  filters
) {
  return (
    database
      .querySuppliers(
        network,
        filters
      )
  );
}

function updateRelationship(
  supplier,
  delta
) {
  supplier.relationship =
    rules.clamp(
      (
        supplier.relationship ||
        50
      ) +
      Number(
        delta ||
        0
      )
    );

  return supplier
    .relationship;
}

module.exports = {
  createSupplierNetwork,
  createSupplier,
  supports,
  quote,
  compareQuotes,
  negotiateQuote,
  getSupplierCatalog,
  updateRelationship
};
