'use strict';

const gameState =
  require('../core/gameState.js');

const openingPrep =
  require('../opening/openingPrepSystem.js');

const dynamicWorld =
  require('../world/dynamicWorldSystemV0815.js');

const seedManager =
  require('../core/seedManagerV0813.js');

const finance =
  require('../finance/completeFinanceSystemV0825.js');

const VERSION =
  '0.8.30';

const INSPECTION_TYPES =
  Object.freeze([
    {
      id:'food_safety',
      name:'食品安全检查',
      baseRisk:0.16,
      fine:[800,6000],
      dimensions:[
        'supplier_trace',
        'cold_chain',
        'storage',
        'labels',
        'retention_sample'
      ]
    },
    {
      id:'hygiene',
      name:'环境卫生检查',
      baseRisk:0.14,
      fine:[500,4200],
      dimensions:[
        'kitchen_clean',
        'tableware',
        'pest_control',
        'waste',
        'staff_hygiene'
      ]
    },
    {
      id:'fire',
      name:'消防安全检查',
      baseRisk:0.10,
      fine:[1000,8000],
      dimensions:[
        'fire_exit',
        'extinguisher',
        'gas',
        'electrical',
        'training'
      ]
    },
    {
      id:'health_cert',
      name:'从业人员健康检查',
      baseRisk:0.08,
      fine:[300,3000],
      dimensions:[
        'health_cert',
        'staff_record',
        'training'
      ]
    },
    {
      id:'traceability',
      name:'采购溯源检查',
      baseRisk:0.09,
      fine:[500,5000],
      dimensions:[
        'supplier_trace',
        'purchase_record',
        'invoice',
        'cold_chain'
      ]
    },
    {
      id:'delivery',
      name:'网络餐饮检查',
      baseRisk:0.07,
      fine:[300,3500],
      dimensions:[
        'packaging',
        'delivery_hygiene',
        'online_disclosure'
      ]
    },
    {
      id:'waste',
      name:'厨余与环保检查',
      baseRisk:0.06,
      fine:[300,4000],
      dimensions:[
        'waste',
        'grease',
        'drainage',
        'noise'
      ]
    },
    {
      id:'price',
      name:'价格与公示检查',
      baseRisk:0.05,
      fine:[200,2500],
      dimensions:[
        'menu_price',
        'promotion_disclosure',
        'receipt'
      ]
    }
  ]);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function clamp(value,min=0,max=100) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0
    )
  );
}

function getRoot() {
  const business =
    gameState.getBusiness();

  business.regulatoryCompliance =
    business.regulatoryCompliance &&
    typeof business.regulatoryCompliance ===
      'object'
      ? business.regulatoryCompliance
      : {
          version:VERSION,
          shops:{}
        };

  business.regulatoryCompliance.version =
    VERSION;

  business.regulatoryCompliance.shops =
    business.regulatoryCompliance.shops ||
    {};

  return business.regulatoryCompliance;
}

function ensureShop(shopId) {
  const root =
    getRoot();

  const id =
    String(shopId);

  if (!root.shops[id]) {
    root.shops[id] = {
      version:VERSION,
      shopId:id,
      complianceScore:78,
      riskScore:22,
      lastInspectionDay:null,
      nextInspectionDay:null,
      inspectionSequence:0,
      inspections:[],
      violations:[],
      remediations:[],
      metrics:{
        inspections:0,
        passed:0,
        warnings:0,
        failed:0,
        fines:0,
        remediationSpend:0
      }
    };
  }

  const state =
    root.shops[id];

  state.version =
    VERSION;

  for (
    const key
    of [
      'inspections',
      'violations',
      'remediations'
    ]
  ) {
    state[key] =
      Array.isArray(state[key])
        ? state[key]
        : [];
  }

  state.metrics =
    state.metrics || {};

  return state;
}

function permitScore(shopId) {
  const overview =
    openingPrep
      .getPermitOverview(
        shopId
      );

  if (
    !overview ||
    !overview.total
  ) {
    return 50;
  }

  return Math.round(
    overview.approved /
    overview.total *
    100
  );
}

function worldInspectionRisk(
  shopId,
  districtId
) {
  const modifiers =
    dynamicWorld
      .getModifiers({
        shopId,
        districtId
      }) ||
    {};

  return clamp(
    (
      Number(
        modifiers.inspectionRisk
      ) ||
      0
    ) *
    100,
    0,
    100
  );
}

function recalculate(
  shopId,
  context
) {
  const state =
    ensureShop(shopId);

  const ctx =
    context || {};

  const permits =
    permitScore(shopId);

  const hygiene =
    clamp(
      ctx.hygiene == null
        ? 78
        : ctx.hygiene
    );

  const traceability =
    clamp(
      ctx.traceability == null
        ? 76
        : ctx.traceability
    );

  const staffCompliance =
    clamp(
      ctx.staffCompliance == null
        ? 80
        : ctx.staffCompliance
    );

  const facility =
    clamp(
      ctx.facility == null
        ? 78
        : ctx.facility
    );

  const worldRisk =
    worldInspectionRisk(
      shopId,
      ctx.districtId
    );

  const score =
    permits * 0.22 +
    hygiene * 0.24 +
    traceability * 0.20 +
    staffCompliance * 0.16 +
    facility * 0.18;

  state.complianceScore =
    Math.round(
      clamp(score)
    );

  state.riskScore =
    Math.round(
      clamp(
        100 -
        state.complianceScore +
        worldRisk *
        0.45,
        0,
        100
      )
    );

  return {
    complianceScore:
      state.complianceScore,
    riskScore:
      state.riskScore,
    permitScore:
      permits,
    worldInspectionRisk:
      worldRisk
  };
}

function scheduleNextInspection(
  shopId,
  day,
  options
) {
  const state =
    ensureShop(shopId);

  const opts =
    options || {};

  const now =
    Math.max(
      1,
      Number(day) || 1
    );

  const rng =
    seedManager
      .createRng(
        'regulatory_schedule',
        [
          shopId,
          now,
          state.inspectionSequence
        ].join(':')
      );

  const minDays =
    Math.max(
      2,
      Number(
        opts.minDays
      ) || 7
    );

  const maxDays =
    Math.max(
      minDays,
      Number(
        opts.maxDays
      ) || 24
    );

  const riskAdjustment =
    Math.round(
      state.riskScore /
      100 *
      Math.max(
        0,
        maxDays -
        minDays
      ) *
      0.55
    );

  const offset =
    Math.max(
      2,
      rng.int(
        minDays,
        maxDays
      ) -
      riskAdjustment
    );

  state.nextInspectionDay =
    now +
    offset;

  return state.nextInspectionDay;
}

function inspectionType(typeId) {
  return (
    INSPECTION_TYPES
      .find(
        item =>
          item.id ===
          typeId
      ) ||
    null
  );
}

function chooseInspectionType(
  shopId,
  day,
  sequence
) {
  const rng =
    seedManager
      .createRng(
        'regulatory_type',
        [
          shopId,
          day,
          sequence
        ].join(':')
      );

  return rng.weighted(
    INSPECTION_TYPES,
    item =>
      item.baseRisk
  );
}

function runInspection(
  shopId,
  day,
  options
) {
  const state =
    ensureShop(shopId);

  const opts =
    options || {};

  recalculate(
    shopId,
    opts
  );

  state.inspectionSequence +=
    1;

  const type =
    inspectionType(
      opts.typeId
    ) ||
    chooseInspectionType(
      shopId,
      day,
      state.inspectionSequence
    );

  const rng =
    seedManager
      .createRng(
        'regulatory_inspection',
        [
          shopId,
          day,
          state.inspectionSequence,
          type.id
        ].join(':')
      );

  const baseFailure =
    type.baseRisk;

  const scoreRisk =
    (
      100 -
      state.complianceScore
    ) /
    100 *
    0.56;

  const worldRisk =
    worldInspectionRisk(
      shopId,
      opts.districtId
    ) /
    100 *
    0.28;

  const failProbability =
    Math.max(
      0.02,
      Math.min(
        0.82,
        baseFailure +
        scoreRisk +
        worldRisk
      )
    );

  const roll =
    rng.next();

  let result =
    'pass';

  if (
    roll <
    failProbability *
    0.38
  ) {
    result =
      'fail';
  } else if (
    roll <
    failProbability
  ) {
    result =
      'warning';
  }

  const findings = [];

  if (
    result !==
    'pass'
  ) {
    const count =
      result ===
      'fail'
        ? rng.int(2,4)
        : rng.int(1,2);

    const pool =
      type.dimensions.slice();

    for (
      let i = 0;
      i < count &&
      pool.length;
      i++
    ) {
      const index =
        rng.int(
          0,
          pool.length - 1
        );

      findings.push(
        pool.splice(
          index,
          1
        )[0]
      );
    }
  }

  let fine = 0;

  if (
    result ===
    'fail'
  ) {
    fine =
      rng.int(
        type.fine[0],
        type.fine[1]
      );

    const paid =
      finance
        .recordExternalExpense(
          shopId,
          'compliance',
          fine,
          {
            day:
              Number(day) || 1,
            referenceId:
              [
                'inspection',
                shopId,
                day,
                state.inspectionSequence
              ].join(':'),
            applyCash:true,
            note:type.name
          }
        );

    if (
      !paid.ok
    ) {
      fine = 0;
    }
  }

  const inspection = {
    id:
      [
        'inspection',
        shopId,
        day,
        state.inspectionSequence
      ].join('_'),
    version:VERSION,
    typeId:type.id,
    typeName:type.name,
    day:
      Number(day) || 1,
    result,
    complianceScore:
      state.complianceScore,
    riskScore:
      state.riskScore,
    findings,
    fine,
    status:
      result ===
      'pass'
        ? 'closed'
        : 'needs_remediation'
  };

  state.inspections.push(
    inspection
  );

  state.inspections =
    state.inspections
      .slice(-180);

  if (
    result !==
    'pass'
  ) {
    state.violations.push({
      inspectionId:
        inspection.id,
      day:
        inspection.day,
      typeId:
        type.id,
      findings:
        findings.slice(),
      status:'open',
      severity:
        result
    });
  }

  state.metrics.inspections =
    (
      Number(
        state.metrics.inspections
      ) ||
      0
    ) +
    1;

  if (
    result ===
    'pass'
  ) {
    state.metrics.passed =
      (
        Number(
          state.metrics.passed
        ) ||
        0
      ) +
      1;
  } else if (
    result ===
    'warning'
  ) {
    state.metrics.warnings =
      (
        Number(
          state.metrics.warnings
        ) ||
        0
      ) +
      1;
  } else {
    state.metrics.failed =
      (
        Number(
          state.metrics.failed
        ) ||
        0
      ) +
      1;
  }

  state.metrics.fines =
    (
      Number(
        state.metrics.fines
      ) ||
      0
    ) +
    fine;

  state.lastInspectionDay =
    inspection.day;

  scheduleNextInspection(
    shopId,
    inspection.day,
    opts
  );

  return {
    ok:true,
    inspection:
      clone(inspection)
  };
}

function remediate(
  shopId,
  inspectionId,
  options
) {
  const state =
    ensureShop(shopId);

  const violation =
    state.violations
      .find(
        item =>
          item.inspectionId ===
          inspectionId &&
          item.status ===
          'open'
      );

  if (!violation) {
    return {
      ok:false,
      reason:'没有待整改项目'
    };
  }

  const opts =
    options || {};

  const cost =
    Math.max(
      200,
      Math.round(
        Number(
          opts.cost
        ) ||
        (
          violation.findings.length *
          650
        )
      )
    );

  const paid =
    finance
      .recordExternalExpense(
        shopId,
        'compliance',
        cost,
        {
          day:
            Number(
              opts.day
            ) ||
            1,
          referenceId:
            'remediation:' +
            inspectionId,
          applyCash:true,
          note:'监管整改'
        }
      );

  if (!paid.ok) {
    return paid;
  }

  violation.status =
    'resolved';

  violation.resolvedDay =
    Number(
      opts.day
    ) ||
    1;

  state.remediations.push({
    inspectionId,
    day:
      violation.resolvedDay,
    cost,
    findings:
      violation.findings.slice()
  });

  state.metrics
    .remediationSpend =
    (
      Number(
        state.metrics
          .remediationSpend
      ) ||
      0
    ) +
    cost;

  state.complianceScore =
    Math.min(
      100,
      state.complianceScore +
      Math.min(
        12,
        violation.findings.length *
        3
      )
    );

  state.riskScore =
    Math.max(
      0,
      state.riskScore -
      Math.min(
        15,
        violation.findings.length *
        4
      )
    );

  const inspection =
    state.inspections
      .find(
        item =>
          item.id ===
          inspectionId
      );

  if (inspection) {
    inspection.status =
      'closed';

    inspection.remediatedDay =
      violation.resolvedDay;
  }

  return {
    ok:true,
    cost,
    complianceScore:
      state.complianceScore,
    riskScore:
      state.riskScore
  };
}

function processDay(
  shopId,
  day,
  context
) {
  const state =
    ensureShop(shopId);

  const now =
    Math.max(
      1,
      Number(day) || 1
    );

  recalculate(
    shopId,
    context
  );

  if (
    state.nextInspectionDay ==
    null
  ) {
    scheduleNextInspection(
      shopId,
      now,
      context
    );

    return {
      changed:true,
      scheduled:true,
      inspection:null
    };
  }

  if (
    now <
    state.nextInspectionDay
  ) {
    return {
      changed:false,
      scheduled:false,
      inspection:null
    };
  }

  const result =
    runInspection(
      shopId,
      now,
      context
    );

  return {
    changed:true,
    scheduled:false,
    inspection:
      result.inspection
  };
}

function overview(shopId) {
  const state =
    ensureShop(shopId);

  const permitOverview =
    openingPrep
      .getPermitOverview(
        shopId
      );

  return {
    version:VERSION,
    shopId,
    complianceScore:
      state.complianceScore,
    riskScore:
      state.riskScore,
    permitOverview:
      clone(permitOverview),
    nextInspectionDay:
      state.nextInspectionDay,
    lastInspectionDay:
      state.lastInspectionDay,
    openViolations:
      state.violations
        .filter(
          item =>
            item.status ===
            'open'
        )
        .map(clone),
    latestInspections:
      state.inspections
        .slice(-20)
        .reverse()
        .map(clone),
    metrics:
      clone(state.metrics),
    inspectionTypes:
      INSPECTION_TYPES
        .map(clone)
  };
}

module.exports = {
  VERSION,
  INSPECTION_TYPES,
  getRoot,
  ensureShop,
  permitScore,
  recalculate,
  scheduleNextInspection,
  runInspection,
  remediate,
  processDay,
  overview
};
