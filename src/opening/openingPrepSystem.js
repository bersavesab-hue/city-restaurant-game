'use strict';

const gameState =
  require('../core/gameState.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const renovationSystem =
  require('../renovation/renovationSystem.js');

const config =
  require('./openingConfig.js');

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function hashFloat(text) {
  let h =
    2166136261;

  const source =
    String(text);

  for (
    let i = 0;
    i <
    source.length;
    i++
  ) {
    h ^=
      source.charCodeAt(
        i
      );

    h =
      Math.imul(
        h,
        16777619
      );
  }

  return (
    (
      h >>> 0
    ) %
    100000
  ) /
  100000;
}

function featureOkay(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return true;
  }

  if (
    typeof value ===
    'boolean'
  ) {
    return value;
  }

  const text =
    String(value);

  return !(
    text.indexOf(
      '无'
    ) >= 0 ||
    text.indexOf(
      '不'
    ) >= 0 ||
    text.indexOf(
      '否'
    ) >= 0 ||
    text.indexOf(
      '不足'
    ) >= 0
  );
}

class OpeningPrepSystem {
  getShop(shopId) {
    return gameState
      .getBusiness()
      .shops
      .find(
        item =>
          item.id ===
          shopId
      ) ||
      null;
  }

  getStore() {
    return gameState
      .getOpeningPrep();
  }

  getCurrentDay() {
    return simulationSystem
      .getDayOrdinal(
        gameState
          .getTime()
      );
  }

  getSeats(shopId) {
    const shop =
      this.getShop(
        shopId
      );

    if (!shop) {
      return 0;
    }

    const metrics =
      renovationSystem
        .getMetrics(
          shopId
        );

    if (
      metrics &&
      Number.isFinite(
        Number(
          metrics.totalSeats
        )
      )
    ) {
      return Math.max(
        1,
        Number(
          metrics.totalSeats
        )
      );
    }

    return Math.max(
      1,
      Number(
        shop.seatEstimate
      ) ||
      30
    );
  }

  ensureEquipment(shopId) {
    const prep =
      this.getStore();

    if (
      !prep.equipment[
        shopId
      ]
    ) {
      const seats =
        this.getSeats(
          shopId
        );

      const items =
        {};

      for (
        const item of
        config.equipment
      ) {
        items[
          item.id
        ] = {
          id:
            item.id,

          quantity:
            Math.max(
              1,
              Math.ceil(
                seats /
                item
                  .capacityPerUnit
              )
            ),

          grade:
            'standard'
        };
      }

      prep.equipment[
        shopId
      ] = {
        status:
          'planning',

        items,

        orderDay:
          null,

        deliveryDay:
          null,

        paid:
          0
      };
    }

    return prep
      .equipment[
        shopId
      ];
  }

  getEquipmentState(shopId) {
    return clone(
      this.ensureEquipment(
        shopId
      )
    );
  }

  getEquipmentQuote(shopId) {
    const shop =
      this.getShop(
        shopId
      );

    if (!shop) {
      return null;
    }

    const state =
      this.ensureEquipment(
        shopId
      );

    const day =
      this.getCurrentDay();

    const marketFactor =
      0.94 +
      hashFloat(
        shopId +
        ':equipment-market:' +
        day
      ) *
      0.14;

    const lines =
      [];

    let total =
      0;

    let totalPower =
      0;

    let cookingCapacity =
      0;

    let serviceCapacity =
      Infinity;

    let maxInstallDays =
      1;

    for (
      const item of
      config.equipment
    ) {
      const plan =
        state.items[
          item.id
        ];

      const grade =
        config
          .qualityGrades
          .find(
            entry =>
              entry.id ===
              plan.grade
          ) ||
        config
          .qualityGrades[1];

      const price =
        Math.round(
          item.basePrice *
          plan.quantity *
          grade.priceFactor *
          marketFactor
        );

      const capacity =
        item
          .capacityPerUnit *
        plan.quantity *
        grade.efficiency;

      const power =
        item.powerKw *
        plan.quantity;

      total +=
        price;

      totalPower +=
        power;

      maxInstallDays =
        Math.max(
          maxInstallDays,
          item.installDays
        );

      if (
        item.id ===
        'cooking'
      ) {
        cookingCapacity =
          capacity;
      } else {
        serviceCapacity =
          Math.min(
            serviceCapacity,
            capacity
          );
      }

      lines.push({
        ...item,
        quantity:
          plan.quantity,
        grade:
          grade.id,
        gradeName:
          grade.name,
        price,
        capacity:
          Math.round(
            capacity
          ),
        powerKw:
          Number(
            power.toFixed(
              1
            )
          ),
        reliability:
          grade.reliability
      });
    }

    if (
      serviceCapacity ===
      Infinity
    ) {
      serviceCapacity =
        0;
    }

    const seats =
      this.getSeats(
        shopId
      );

    const capacity =
      Math.min(
        cookingCapacity,
        serviceCapacity
      );

    const capacityRatio =
      capacity /
      Math.max(
        1,
        seats
      );

    const electricLimit =
      Number(
        shop.electricCapacityKw
      );

    const issues =
      [];

    let infrastructureUpgradeCost =
      0;

    if (
      Number.isFinite(
        electricLimit
      ) &&
      electricLimit >
      0 &&
      totalPower >
      electricLimit
    ) {
      infrastructureUpgradeCost =
        Math.round(
          (
            totalPower -
            electricLimit
          ) *
          850
        );
    }

    const shortage =
      Math.max(
        0,
        1 -
        capacityRatio
      );

    const marketDelay =
      Math.floor(
        hashFloat(
          shopId +
          ':equipment-delay:' +
          day
        ) *
        3
      );

    return {
      shopId,
      lines,
      total:
        total +
        infrastructureUpgradeCost,
      equipmentCost:
        total,
      infrastructureUpgradeCost,
      totalPowerKw:
        Number(
          totalPower.toFixed(
            1
          )
        ),
      seats,
      capacity:
        Math.round(
          capacity
        ),
      capacityRatio,
      shortage,
      issues,
      valid:
        capacityRatio >=
          0.9,
      installDays:
        maxInstallDays +
        marketDelay,
      marketFactor
    };
  }

  adjustEquipment(
    shopId,
    itemId,
    delta
  ) {
    const state =
      this.ensureEquipment(
        shopId
      );

    if (
      state.status !==
      'planning'
    ) {
      return false;
    }

    const item =
      state.items[
        itemId
      ];

    if (!item) {
      return false;
    }

    item.quantity =
      clamp(
        item.quantity +
        delta,
        0,
        20
      );

    return true;
  }

  cycleEquipmentGrade(
    shopId,
    itemId
  ) {
    const state =
      this.ensureEquipment(
        shopId
      );

    if (
      state.status !==
      'planning'
    ) {
      return false;
    }

    const item =
      state.items[
        itemId
      ];

    if (!item) {
      return false;
    }

    const ids =
      config
        .qualityGrades
        .map(
          entry =>
            entry.id
        );

    const current =
      ids.indexOf(
        item.grade
      );

    item.grade =
      ids[
        (
          current +
          1
        ) %
        ids.length
      ];

    return true;
  }

  orderEquipment(shopId) {
    const state =
      this.ensureEquipment(
        shopId
      );

    if (
      state.status !==
      'planning'
    ) {
      return {
        ok:
          false,
        message:
          '设备订单已经提交'
      };
    }

    const quote =
      this.getEquipmentQuote(
        shopId
      );

    if (!quote) {
      return {
        ok:
          false,
        message:
          '门店不存在'
      };
    }

    if (!quote.valid) {
      return {
        ok:
          false,
        message:
          quote.issues[0] ||
          '当前设备配置无法满足营业需求'
      };
    }

    if (
      !gameState
        .spendCash(
          quote.total
        )
    ) {
      return {
        ok:
          false,
        message:
          '设备采购资金不足'
      };
    }

    const day =
      this.getCurrentDay();

    state.status =
      'ordered';

    state.orderDay =
      day;

    state.deliveryDay =
      day +
      quote.installDays;

    state.paid =
      quote.total;

    state.quote =
      clone(
        quote
      );

    return {
      ok:
        true,
      deliveryDay:
        state.deliveryDay,
      total:
        quote.total
    };
  }

  updateEquipment(shopId) {
    const state =
      this.ensureEquipment(
        shopId
      );

    if (
      state.status !==
      'ordered'
    ) {
      return false;
    }

    if (
      this.getCurrentDay() <
      state.deliveryDay
    ) {
      return false;
    }

    state.status =
      'installed';

    return true;
  }

  getPermitState(shopId) {
    const prep =
      this.getStore();

    if (
      !prep.permits[
        shopId
      ]
    ) {
      const items =
        {};

      for (
        const permit of
        config.permits
      ) {
        items[
          permit.id
        ] = {
          id:
            permit.id,
          status:
            'not_applied',
          appliedDay:
            null,
          finishDay:
            null,
          paid:
            0,
          issue:
            null
        };
      }

      prep.permits[
        shopId
      ] = {
        items,
        remediated: {}
      };
    }

    return prep
      .permits[
        shopId
      ];
  }

  getPermitRequirements(
    shopId,
    permitId
  ) {
    const shop =
      this.getShop(
        shopId
      );

    const equipment =
      this.ensureEquipment(
        shopId
      );

    const permitState =
      this.getPermitState(
        shopId
      );

    const renovation =
      renovationSystem
        .ensurePlan(
          shopId
        );

    const reasons =
      [];

    if (
      permitId ===
      'food'
    ) {
      if (
        !renovation ||
        renovation.status !==
          'completed'
      ) {
        reasons.push(
          '装修尚未完成'
        );
      }

      if (
        equipment.status !==
        'installed'
      ) {
        reasons.push(
          '主要设备尚未安装'
        );
      }

      if (
        shop &&
        !featureOkay(
          shop.greaseTrap
        ) &&
        !permitState
          .remediated
          .food
      ) {
        reasons.push(
          '隔油设施需整改'
        );
      }
    }

    if (
      permitId ===
      'fire'
    ) {
      if (
        !renovation ||
        renovation.status !==
          'completed'
      ) {
        reasons.push(
          '装修尚未完成'
        );
      }

      if (
        shop &&
        !featureOkay(
          shop.fireSprinkler
        ) &&
        !permitState
          .remediated
          .fire
      ) {
        reasons.push(
          '消防喷淋需整改'
        );
      }
    }

    return {
      ready:
        reasons.length ===
        0,
      reasons
    };
  }

  getPermitOverview(shopId) {
    const shop =
      this.getShop(
        shopId
      );

    if (!shop) {
      return null;
    }

    const state =
      this.getPermitState(
        shopId
      );

    const day =
      this.getCurrentDay();

    const rows =
      [];

    for (
      const permit of
      config.permits
    ) {
      const item =
        state.items[
          permit.id
        ];

      const req =
        this.getPermitRequirements(
          shopId,
          permit.id
        );

      const volatility =
        0.92 +
        hashFloat(
          shopId +
          ':permit:' +
          permit.id +
          ':' +
          day
        ) *
        0.22;

      const fee =
        Math.round(
          permit.baseFee *
          volatility
        );

      const days =
        Math.max(
          1,
          Math.round(
            permit.baseDays *
            (
              0.85 +
              volatility *
                0.18
            )
          )
        );

      const remediableReason =
        req.reasons.find(
          reason =>
            reason.indexOf(
              '整改'
            ) >=
            0
        ) ||
        null;

      const remediationCost =
        Math.round(
          (
            permit.id ===
              'fire'
              ? 6800
              : permit.id ===
                  'food'
                ? 4200
                : 1800
          ) *
          (
            0.88 +
            hashFloat(
              shopId +
              ':remediation:' +
              permit.id +
              ':' +
              day
            ) *
            0.28
          )
        );

      rows.push({
        ...permit,
        fee,
        days,
        ready:
          req.ready,
        reasons:
          req.reasons,
        status:
          item.status,
        finishDay:
          item.finishDay,
        issue:
          item.issue,
        remediable:
          !!remediableReason ||
          item.status ===
            'needs_fix',
        remediationCost
      });
    }

    return {
      shopId,
      rows,
      approved:
        rows.filter(
          item =>
            item.status ===
            'approved'
        ).length,
      total:
        rows.length
    };
  }

  applyPermit(
    shopId,
    permitId
  ) {
    const state =
      this.getPermitState(
        shopId
      );

    const item =
      state.items[
        permitId
      ];

    if (!item) {
      return {
        ok:
          false,
        message:
          '证照项目不存在'
      };
    }

    if (
      item.status ===
      'applying' ||
      item.status ===
      'approved'
    ) {
      return {
        ok:
          false,
        message:
          '该项目已提交'
      };
    }

    const overview =
      this.getPermitOverview(
        shopId
      );

    const row =
      overview.rows.find(
        permit =>
          permit.id ===
          permitId
      );

    if (!row.ready) {
      return {
        ok:
          false,
        message:
          row.reasons[0] ||
          '当前条件不满足'
      };
    }

    if (
      !gameState
        .spendCash(
          row.fee
        )
    ) {
      return {
        ok:
          false,
        message:
          '办理费用不足'
      };
    }

    const day =
      this.getCurrentDay();

    item.status =
      'applying';

    item.appliedDay =
      day;

    item.finishDay =
      day +
      row.days;

    item.paid +=
      row.fee;

    item.issue =
      null;

    return {
      ok:
        true,
      finishDay:
        item.finishDay,
      fee:
        row.fee
    };
  }

  remediatePermit(
    shopId,
    permitId
  ) {
    const state =
      this.getPermitState(
        shopId
      );

    const item =
      state.items[
        permitId
      ];

    if (!item) {
      return {
        ok:
          false,
        message:
          '证照项目不存在'
      };
    }

    const overview =
      this.getPermitOverview(
        shopId
      );

    const row =
      overview.rows.find(
        entry =>
          entry.id ===
          permitId
      );

    if (
      !row ||
      !row.remediable
    ) {
      return {
        ok:
          false,
        message:
          '当前没有可执行的整改项目'
      };
    }

    if (
      !gameState
        .spendCash(
          row.remediationCost
        )
    ) {
      return {
        ok:
          false,
        message:
          '整改资金不足'
      };
    }

    state.remediated[
      permitId
    ] =
      true;

    item.status =
      'not_applied';

    item.issue =
      null;

    item.finishDay =
      null;

    return {
      ok:
        true,
      cost:
        row.remediationCost
    };
  }

  updatePermits(shopId) {
    const shop =
      this.getShop(
        shopId
      );

    if (!shop) {
      return false;
    }

    const state =
      this.getPermitState(
        shopId
      );

    const day =
      this.getCurrentDay();

    let changed =
      false;

    for (
      const permit of
      config.permits
    ) {
      const item =
        state.items[
          permit.id
        ];

      if (
        item.status !==
          'applying' ||
        day <
          item.finishDay
      ) {
        continue;
      }

      const req =
        this.getPermitRequirements(
          shopId,
          permit.id
        );

      if (!req.ready) {
        item.status =
          'needs_fix';

        item.issue =
          req.reasons[0];

        changed =
          true;

        continue;
      }

      const inspection =
        hashFloat(
          shopId +
          ':inspection:' +
          permit.id +
          ':' +
          item.appliedDay
        );

      const failRisk =
        permit.id ===
          'food'
          ? 0.10
          : permit.id ===
              'fire'
            ? 0.08
            : 0.035;

      if (
        inspection <
        failRisk
      ) {
        item.status =
          'needs_fix';

        item.issue =
          permit.id ===
            'food'
            ? '现场卫生细节需补充整改'
            : permit.id ===
                'fire'
              ? '消防标识与通道细节需补充'
              : '资料存在缺项';
      } else {
        item.status =
          'approved';

        item.issue =
          null;
      }

      changed =
        true;
    }

    return changed;
  }

  getStaffState(shopId) {
    const prep =
      this.getStore();

    if (
      !prep.staffing[
        shopId
      ]
    ) {
      prep.staffing[
        shopId
      ] = {
        hired: [],
        candidateDay:
          null,
        candidates: []
      };
    }

    return prep
      .staffing[
        shopId
      ];
  }

  getRequiredStaff(shopId) {
    const seats =
      this.getSeats(
        shopId
      );

    const result =
      {};

    for (
      const role of
      config.roles
    ) {
      result[
        role.id
      ] =
        role.id ===
          'manager'
          ? 1
          : Math.max(
              1,
              Math.ceil(
                seats /
                role
                  .seatsPerWorker
              )
            );
    }

    return result;
  }

  generateCandidate(
    shopId,
    role,
    index,
    day
  ) {
    const seed =
      gameState
        .getSimulation()
        .seed ||
      1;

    const base =
      shopId +
      ':' +
      role.id +
      ':' +
      day +
      ':' +
      index +
      ':' +
      seed;

    const r1 =
      hashFloat(
        base +
        ':a'
      );

    const r2 =
      hashFloat(
        base +
        ':b'
      );

    const r3 =
      hashFloat(
        base +
        ':c'
      );

    const surname =
      config.surnames[
        Math.floor(
          r1 *
          config.surnames.length
        ) %
        config.surnames.length
      ];

    const given =
      config.givenNames[
        Math.floor(
          r2 *
          config.givenNames.length
        ) %
        config.givenNames.length
      ];

    const skill =
      Math.round(
        48 +
        r1 *
        48
      );

    const stability =
      Math.round(
        45 +
        r2 *
        52
      );

    const experience =
      Math.round(
        r3 *
        10
      );

    const wage =
      Math.round(
        role.baseWage *
        (
          0.84 +
          skill /
          250 +
          experience /
          100
        ) /
        100
      ) *
      100;

    return {
      id:
        'candidate_' +
        role.id +
        '_' +
        day +
        '_' +
        index,

      roleId:
        role.id,

      roleName:
        role.name,

      name:
        surname +
        given,

      age:
        20 +
        Math.floor(
          r3 *
          25
        ),

      skill,
      stability,
      experience,
      wage,

      score:
        Math.round(
          skill *
          0.55 +
          stability *
          0.30 +
          Math.min(
            100,
            experience *
            10
          ) *
          0.15
        )
    };
  }

  refreshCandidates(shopId) {
    const state =
      this.getStaffState(
        shopId
      );

    const day =
      this.getCurrentDay();

    if (
      state.candidateDay ===
      day &&
      state.candidates.length
    ) {
      return;
    }

    const candidates =
      [];

    for (
      const role of
      config.roles
    ) {
      for (
        let i = 0;
        i <
        3;
        i++
      ) {
        candidates.push(
          this.generateCandidate(
            shopId,
            role,
            i,
            day
          )
        );
      }
    }

    state.candidateDay =
      day;

    state.candidates =
      candidates;
  }

  getStaffOverview(shopId) {
    this.refreshCandidates(
      shopId
    );

    const state =
      this.getStaffState(
        shopId
      );

    const required =
      this.getRequiredStaff(
        shopId
      );

    const current =
      {};

    for (
      const role of
      config.roles
    ) {
      current[
        role.id
      ] =
        state.hired.filter(
          staff =>
            staff.roleId ===
            role.id
        ).length;
    }

    let requiredTotal =
      0;

    let currentTotal =
      0;

    for (
      const role of
      config.roles
    ) {
      requiredTotal +=
        required[
          role.id
        ];

      currentTotal +=
        Math.min(
          required[
            role.id
          ],
          current[
            role.id
          ]
        );
    }

    const payroll =
      state.hired.reduce(
        (
          total,
          staff
        ) =>
          total +
          staff.wage,
        0
      );

    return {
      required,
      current,
      hired:
        clone(
          state.hired
        ),
      candidates:
        clone(
          state.candidates
        ),
      payroll,
      coverage:
        currentTotal /
        Math.max(
          1,
          requiredTotal
        )
    };
  }

  hireCandidate(
    shopId,
    candidateId
  ) {
    this.refreshCandidates(
      shopId
    );

    const state =
      this.getStaffState(
        shopId
      );

    const candidate =
      state.candidates.find(
        item =>
          item.id ===
          candidateId
      );

    if (!candidate) {
      return {
        ok:
          false,
        message:
          '候选人已失效'
      };
    }

    const signOnCost =
      Math.round(
        candidate.wage *
        0.18
      );

    if (
      !gameState
        .spendCash(
          signOnCost
        )
    ) {
      return {
        ok:
          false,
        message:
          '招聘入职成本不足'
      };
    }

    state.hired.push({
      id:
        'staff_' +
        candidate.id,
      ...clone(
        candidate
      ),
      hiredDay:
        this.getCurrentDay(),
      signOnCost
    });

    state.candidates =
      state.candidates.filter(
        item =>
          item.id !==
          candidateId
      );

    return {
      ok:
        true,
      staff:
        clone(
          state.hired[
            state
              .hired
              .length -
              1
          ]
        ),
      signOnCost
    };
  }

  dismissStaff(
    shopId,
    staffId
  ) {
    const state =
      this.getStaffState(
        shopId
      );

    const index =
      state.hired.findIndex(
        item =>
          item.id ===
          staffId
      );

    if (
      index <
      0
    ) {
      return false;
    }

    state.hired.splice(
      index,
      1
    );

    return true;
  }

  getReadiness(shopId) {
    this.updateEquipment(
      shopId
    );

    this.updatePermits(
      shopId
    );

    const renovation =
      renovationSystem
        .ensurePlan(
          shopId
        );

    const equipment =
      this.ensureEquipment(
        shopId
      );

    const permits =
      this.getPermitOverview(
        shopId
      );

    const staffing =
      this.getStaffOverview(
        shopId
      );

    const renovationReady =
      !!renovation &&
      renovation.status ===
        'completed';

    const equipmentReady =
      equipment.status ===
        'installed';

    const permitsReady =
      permits.approved ===
      permits.total;

    const staffingReady =
      staffing.coverage >=
      0.9;

    const score =
      (
        renovationReady
          ? 25
          : 0
      ) +
      (
        equipmentReady
          ? 25
          : 0
      ) +
      (
        permitsReady
          ? 25
          : 0
      ) +
      Math.round(
        clamp(
          staffing.coverage,
          0,
          1
        ) *
        25
      );

    const ready =
      renovationReady &&
      equipmentReady &&
      permitsReady &&
      staffingReady;

    const shop =
      this.getShop(
        shopId
      );

    if (
      shop &&
      ready &&
      shop.status !==
        'open'
    ) {
      shop.status =
        'ready_for_trial';
    }

    return {
      renovationReady,
      equipmentReady,
      permitsReady,
      staffingReady,
      score,
      ready,
      equipment,
      permits,
      staffing
    };
  }

  startTrialOpening(shopId) {
    const shop =
      this.getShop(
        shopId
      );

    if (!shop) {
      return {
        ok:
          false,
        message:
          '门店不存在'
      };
    }

    const readiness =
      this.getReadiness(
        shopId
      );

    if (
      !readiness.ready
    ) {
      return {
        ok:
          false,
        message:
          '装修、设备、证照和基础班组尚未全部完成'
      };
    }

    shop.status =
      'open';

    shop.trialOpenedDay =
      this.getCurrentDay();

    return {
      ok:
        true,
      day:
        shop.trialOpenedDay
    };
  }

  updateShop(shopId) {
    this.updateEquipment(
      shopId
    );

    this.updatePermits(
      shopId
    );

    return this.getReadiness(
      shopId
    );
  }
}

module.exports =
  new OpeningPrepSystem();
