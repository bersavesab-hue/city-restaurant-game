'use strict';

const gameState =
  require('../core/gameState.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const renovationSystem =
  require('../renovation/renovationSystem.js');

const shopLifecycle =
  require('../core/shopLifecycleV0816.js');

const equipmentDatabase =
  require('../renovation/renovationEquipmentDatabaseV0817.js');

const config =
  equipmentDatabase.openingConfig;

const personRules =
  require('../person/personRulesV10.js');

const personPack =
  require('../person/personPackV10.js');

const { SeededRng } =
  require('../foundation/rng.js');
// V084_PERSON_CANDIDATES
// V0861_PREPARATION_COMMAND_CENTER_SYSTEM


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
          grade.reliability,

        availableModels:
          equipmentDatabase
            .getEquipmentSkus({
              groupId:
                item.id
            })
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
      databaseVersion:
        equipmentDatabase.VERSION,
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

  getEquipmentCatalog(
    groupId
  ) {
    return (
      equipmentDatabase
        .getEquipmentSkus(
          groupId
            ? {
                groupId
              }
            : {}
        )
    );
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
    // V084_PERSON_CANDIDATE_GENERATOR
    const seed =
      gameState
        .getSimulation()
        .seed ||
      1;

    const rng =
      new SeededRng(
        'candidate:' +
        seed +
        ':' +
        shopId +
        ':' +
        role.id +
        ':' +
        day +
        ':' +
        index
      );

    const profile =
      personRules
        .createPersonProfile(
          rng,
          {
            age:
              rng.int(
                20,
                49
              )
          }
        );

    profile.id =
      'person_candidate_' +
      role.id +
      '_' +
      day +
      '_' +
      index;

    const roleMap = {
      manager:'manager',
      chef:'chef',
      server:'waiter',
      cashier:'cashier'
    };

    const npcRoleId =
      roleMap[
        role.id
      ] ||
      'waiter';

    personRules
      .assignRole(
        profile,
        npcRoleId,
        {
          allowLowFit:true,
          employerId:null
        }
      );

    const roleDef =
      personPack
        .NPC_ROLES
        .find(
          item =>
            item.id ===
            npcRoleId
        );

    const fit =
      personRules
        .roleFit(
          profile,
          roleDef
        );

    const skillKeys = {
      manager:[
        'management',
        'operations',
        'leadership'
      ],
      chef:[
        'cooking',
        'prep',
        'foodSafety'
      ],
      server:[
        'service',
        'sales'
      ],
      cashier:[
        'cashier',
        'service',
        'digital'
      ]
    };

    const keys =
      skillKeys[
        role.id
      ] ||
      [
        'operations'
      ];

    const skill =
      Math.round(
        keys.reduce(
          (
            sum,
            key
          ) =>
            sum +
            (
              Number(
                profile.skills[
                  key
                ]
              ) ||
              0
            ),
          0
        ) /
        keys.length
      );

    const stability =
      Math.round(
        (
          Number(
            profile
              .personality
              .stability
          ) ||
          50
        ) *
          0.62 +
        (
          Number(
            profile
              .personality
              .conscientiousness
          ) ||
          50
        ) *
          0.38
      );

    const experience =
      Math.max(
        0,
        Math.min(
          16,
          Math.round(
            (
              profile.age -
              18
            ) *
            (
              0.18 +
              rng.next() *
              0.34
            )
          )
        )
      );

    const wage =
      Math.round(
        role.baseWage *
        (
          0.82 +
          skill /
            260 +
          experience /
            120 +
          (
            fit.score ||
            50
          ) /
            500
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
        profile.name,
      age:
        profile.age,
      skill,
      stability,
      experience,
      wage,
      score:
        Math.round(
          (
            fit.score ||
            skill
          ) *
            0.45 +
          skill *
            0.30 +
          stability *
            0.15 +
          Math.min(
            100,
            experience *
              8
          ) *
            0.10
        ),
      personalityLabels:
        (
          profile
            .personalityLabels ||
          []
        ).slice(
          0,
          3
        ),
      personProfile:
        profile
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

    // V084_STAFF_OVERVIEW
    const people =
      state.hired.map(
        staff =>
          staff.live ||
          staff.personProfile &&
          staff.personProfile.state ||
          {}
      );

    const peopleSummary =
      people.length
        ? {
            count:
              people.length,
            avgMood:
              Math.round(
                people.reduce(
                  (
                    sum,
                    row
                  ) =>
                    sum +
                    (
                      Number(
                        row.mood
                      ) ||
                      65
                    ),
                  0
                ) /
                people.length
              ),
            avgStress:
              Math.round(
                people.reduce(
                  (
                    sum,
                    row
                  ) =>
                    sum +
                    (
                      Number(
                        row.stress
                      ) ||
                      25
                    ),
                  0
                ) /
                people.length
              ),
            avgLoyalty:
              Math.round(
                people.reduce(
                  (
                    sum,
                    row
                  ) =>
                    sum +
                    (
                      Number(
                        row.loyalty
                      ) ||
                      55
                    ),
                  0
                ) /
                people.length
              ),
            highTurnoverRisk:
              people.filter(
                row =>
                  Number(
                    row.turnoverRisk
                  ) >=
                  68
              ).length
          }
        : {
            count:0,
            avgMood:0,
            avgStress:0,
            avgLoyalty:0,
            highTurnoverRisk:0
          };


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
      peopleSummary,
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

    // V084_HIRE_PERSON_ID
    state.hired.push({
      ...clone(
        candidate
      ),
      id:
        'staff_' +
        candidate.id,
      personId:
        candidate
          .personProfile &&
        candidate
          .personProfile
          .id ||
        candidate.id,
      hiredDay:
        this.getCurrentDay(),
      signOnCost,
      live:
        candidate
          .personProfile &&
        candidate
          .personProfile
          .state
          ? {
              ...clone(
                candidate
                  .personProfile
                  .state
              ),
              turnoverRisk:0,
              entrepreneurship:0,
              lastUpdatedDay:
                this.getCurrentDay()
            }
          : null
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
        'open' &&
      shop.status !==
        'trial_opening' &&
      shop.status !==
        'trial_complete' &&
      shop.status !==
        'closed' &&
      shop.status !==
        'paused'
    ) {
      shop.status =
        'ready_for_trial';
    }

    if (shop) {
      shopLifecycle
        .syncShop(
          shop,
          {
            renovationStatus:
              renovation &&
              renovation.status ||
              null,
            equipmentStatus:
              equipment &&
              equipment.status ||
              null,
            permitTotal:
              Number(
                permits.total
              ) ||
              0,
            permitsApproved:
              Number(
                permits.approved
              ) ||
              0,
            permitsApplying:
              !!(
                Array.isArray(
                  permits.rows
                ) &&
                permits.rows.some(
                  row =>
                    row.status ===
                      'applying'
                )
              ),
            staffCoverage:
              Number(
                staffing.coverage
              ) ||
              0
          },
          {
            reason:
              'opening-readiness'
          }
        );
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


  getPreparationBoard(
    shopId,
    readinessInput
  ) {
    const readiness =
      readinessInput ||
      this.getReadiness(
        shopId
      );

    const day =
      this.getCurrentDay();

    const cash =
      Number(
        gameState
          .getPlayer()
          .cash
      ) || 0;

    const renovation =
      renovationSystem
        .ensurePlan(
          shopId
        );

    const equipment =
      readiness.equipment ||
      this.ensureEquipment(
        shopId
      );

    const permits =
      readiness.permits ||
      this.getPermitOverview(
        shopId
      );

    const staffing =
      readiness.staffing ||
      this.getStaffOverview(
        shopId
      );

    const permitRows =
      Array.isArray(
        permits &&
        permits.rows
      )
        ? permits.rows
        : [];

    const applyingRows =
      permitRows.filter(
        row =>
          row.status ===
          'applying'
      );

    const actionableRows =
      permitRows.filter(
        row =>
          row.status ===
            'not_applied' &&
          row.ready
      );

    const fixableRows =
      permitRows.filter(
        row =>
          row.remediable &&
          (
            row.status ===
              'needs_fix' ||
            !row.ready
          )
      );

    const blockedPermitRows =
      permitRows.filter(
        row =>
          row.status ===
            'not_applied' &&
          !row.ready &&
          !row.remediable
      );

    const requiredTotal =
      staffing &&
      staffing.required
        ? Object.values(
            staffing.required
          ).reduce(
            (sum, value) =>
              sum +
              Math.max(
                0,
                Number(value) || 0
              ),
            0
          )
        : 0;

    const hiredCount =
      staffing &&
      Array.isArray(
        staffing.hired
      )
        ? staffing.hired.length
        : 0;

    const candidates =
      staffing &&
      Array.isArray(
        staffing.candidates
      )
        ? staffing.candidates
        : [];

    const bestCandidate =
      candidates
        .slice()
        .sort(
          (a, b) =>
            Number(b.score || 0) -
            Number(a.score || 0)
        )[0] ||
      null;

    const equipmentQuote =
      equipment.status ===
        'planning'
        ? this.getEquipmentQuote(
            shopId
          )
        : equipment.quote ||
          null;

    const equipmentEta =
      equipment.status ===
        'ordered'
        ? Math.max(
            0,
            Number(
              equipment.deliveryDay
            ) -
            day
          )
        : 0;

    const permitEta =
      applyingRows.length
        ? Math.max(
            0,
            Math.min(
              ...applyingRows.map(
                row =>
                  Number(
                    row.finishDay
                  ) ||
                  day
              )
            ) -
            day
          )
        : 0;

    const staffingCoverage =
      clamp(
        Number(
          staffing &&
          staffing.coverage
        ) || 0,
        0,
        1
      );

    const permitProgress =
      permits &&
      Number(permits.total) > 0
        ? clamp(
            (
              Number(
                permits.approved
              ) || 0
            ) /
            Number(
              permits.total
            ),
            0,
            1
          )
        : 0;

    let renovationProgress =
      readiness.renovationReady
        ? 1
        : 0;

    if (
      !readiness.renovationReady &&
      typeof renovationSystem
        .getConstructionProgress ===
        'function'
    ) {
      try {
        const construction =
          renovationSystem
            .getConstructionProgress(
              shopId
            );

        renovationProgress =
          clamp(
            Number(
              construction &&
              construction.progress
            ) || 0,
            0,
            1
          );
      } catch (error) {
        renovationProgress = 0;
      }
    }

    const equipmentProgress =
      readiness.equipmentReady
        ? 1
        : equipment.status ===
            'ordered'
          ? 0.62
          : 0;

    const equipmentState =
      readiness.equipmentReady
        ? 'done'
        : equipment.status ===
            'ordered'
          ? 'waiting'
          : 'available';

    const permitState =
      readiness.permitsReady
        ? 'done'
        : actionableRows.length ||
          fixableRows.length
          ? 'available'
          : applyingRows.length
            ? 'waiting'
            : 'blocked';

    const workstreams = [
      {
        id:'renovation',
        title:'装修',
        state:
          readiness.renovationReady
            ? 'done'
            : 'available',
        progress:
          renovationProgress,
        statusText:
          readiness.renovationReady
            ? '已完成'
            : '可立即推进',
        detail:
          readiness.renovationReady
            ? '空间方案已具备开业条件'
            : '餐位、动线和许可条件仍需推进',
        action:'进入装修',
        priority:95,
        estimatedCost:0,
        blockingOpening:
          !readiness.renovationReady
      },
      {
        id:'equipment',
        title:'设备',
        state:
          equipmentState,
        progress:
          equipmentProgress,
        statusText:
          readiness.equipmentReady
            ? '已安装'
            : equipment.status ===
                'ordered'
              ? '等待到货 · ' +
                equipmentEta +
                '天'
              : '可提前采购',
        detail:
          readiness.equipmentReady
            ? '后厨与前厅设备已经到位'
            : equipment.status ===
                'ordered'
              ? '订单已锁定，等待到货安装'
              : '现在下单可与装修同步等待交期',
        action:
          equipment.status ===
            'planning'
            ? '配置设备'
            : '查看设备',
        priority:
          equipment.status ===
            'planning' &&
          equipmentQuote &&
          Number(
            equipmentQuote.installDays
          ) >= 3
            ? 98
            : 90,
        estimatedCost:
          equipment.status ===
            'planning' &&
          equipmentQuote
            ? Number(
                equipmentQuote.total
              ) || 0
            : 0,
        etaDays:
          equipmentEta,
        blockingOpening:
          !readiness.equipmentReady
      },
      {
        id:'license',
        title:'证照',
        state:
          permitState,
        progress:
          permitProgress,
        statusText:
          readiness.permitsReady
            ? '已齐全'
            : applyingRows.length
              ? '审核中 ' +
                applyingRows.length +
                '项'
              : actionableRows.length
                ? '可提交 ' +
                  actionableRows.length +
                  '项'
                : fixableRows.length
                  ? '可整改 ' +
                    fixableRows.length +
                    '项'
                  : '等待前置条件',
        detail:
          readiness.permitsReady
            ? '全部开业证照已完成'
            : actionableRows.length
              ? '已有证照可先办理，不必等全部筹备完成'
              : fixableRows.length
                ? '先完成整改即可继续办理'
                : applyingRows.length
                  ? '审批进行中，可同时处理其他事项'
                  : blockedPermitRows[0] &&
                    blockedPermitRows[0]
                      .reasons &&
                    blockedPermitRows[0]
                      .reasons[0] ||
                    '等待装修或设备条件',
        action:'办理证照',
        priority:88,
        estimatedCost:
          actionableRows.reduce(
            (sum, row) =>
              sum +
              Math.max(
                0,
                Number(row.fee) || 0
              ),
            0
          ) +
          (
            fixableRows[0]
              ? Math.max(
                  0,
                  Number(
                    fixableRows[0]
                      .remediationCost
                  ) || 0
                )
              : 0
          ),
        etaDays:
          permitEta,
        blockingOpening:
          !readiness.permitsReady
      },
      {
        id:'staff',
        title:'招聘',
        state:
          readiness.staffingReady
            ? 'done'
            : 'available',
        progress:
          staffingCoverage,
        statusText:
          readiness.staffingReady
            ? '班组齐备'
            : '到岗 ' +
              hiredCount +
              '/' +
              requiredTotal,
        detail:
          readiness.staffingReady
            ? '基础班组覆盖已达标'
            : candidates.length
              ? '今日有' +
                candidates.length +
                '名候选，可提前锁定核心岗位'
              : '等待人才市场刷新',
        action:'去招聘',
        priority:82,
        estimatedCost:
          bestCandidate
            ? Math.round(
                Number(
                  bestCandidate.wage
                ) *
                0.18
              )
            : 0,
        blockingOpening:
          !readiness.staffingReady
      }
    ];

    const available =
      workstreams
        .filter(
          row =>
            row.state ===
            'available'
        )
        .sort(
          (a, b) =>
            b.priority -
            a.priority
        );

    const waiting = [];

    if (
      equipment.status ===
      'ordered'
    ) {
      waiting.push({
        id:'equipment',
        moduleId:'equipment',
        title:'设备到货',
        days:equipmentEta,
        detail:
          equipmentEta > 0
            ? '设备还有' +
              equipmentEta +
              '天到货，可同时推进装修/招聘/证照'
            : '设备今天到货，进入设备页查看安装状态'
      });
    }

    if (applyingRows.length) {
      waiting.push({
        id:'license',
        moduleId:'license',
        title:'证照审核',
        days:permitEta,
        detail:
          applyingRows.length +
          '项证照审核中' +
          (
            permitEta > 0
              ? '，最快' +
                permitEta +
                '天出结果'
              : '，今天可能出结果'
          )
      });
    }

    const blockers =
      workstreams
        .filter(
          row =>
            row.blockingOpening
        )
        .map(
          row => ({
            id:row.id,
            title:row.title,
            detail:
              row.title +
              '未完成：' +
              row.statusText
          })
        );

    const immediateCost =
      available.reduce(
        (sum, row) =>
          sum +
          Math.max(
            0,
            Number(
              row.estimatedCost
            ) || 0
          ),
        0
      );

    const affordable =
      available.filter(
        row =>
          Number(
            row.estimatedCost
          ) <= cash
      );

    const selected =
      (
        affordable.length
          ? affordable
          : available
      )[0] ||
      null;

    let focus = null;

    if (readiness.ready) {
      focus = {
        id:'trial',
        title:'可以开始试营业',
        detail:'四项基础条件已经齐全，用3天真实经营验证方案',
        action:'开始试营业',
        state:'ready'
      };
    } else if (selected) {
      const focusTitle = {
        equipment:'先锁设备交期',
        renovation:'推进装修方案',
        license:'先办可提交证照',
        staff:'提前锁定班组'
      }[selected.id] ||
      '继续筹备';

      focus = {
        id:selected.id,
        title:focusTitle,
        detail:selected.detail,
        action:selected.action,
        state:selected.state,
        estimatedCost:
          selected.estimatedCost
      };
    } else if (waiting.length) {
      const first =
        waiting[0];

      focus = {
        id:first.moduleId,
        title:'等待期间别空转',
        detail:first.detail,
        action:'查看进度',
        state:'waiting'
      };
    } else {
      focus = {
        id:'renovation',
        title:'继续完善开店条件',
        detail:'仍有开业条件未完成',
        action:'进入装修',
        state:'blocked'
      };
    }

    const signals = [];

    if (
      equipment.status ===
      'planning'
    ) {
      signals.push(
        '设备现在即可提前下单，与装修并行等待交期'
      );
    }

    if (
      actionableRows.length
    ) {
      signals.push(
        '已有' +
        actionableRows.length +
        '项证照可以提前提交'
      );
    }

    if (
      bestCandidate &&
      !readiness.staffingReady
    ) {
      signals.push(
        '今日优质候选：' +
        bestCandidate.name +
        ' · ' +
        bestCandidate.roleName +
        ' · 综合' +
        bestCandidate.score
      );
    }

    return {
      version:'0.8.61',
      day,
      cash,
      readinessPercent:
        Math.round(
          (
            renovationProgress +
            equipmentProgress +
            permitProgress +
            staffingCoverage
          ) /
          4 *
          100
        ),
      ready:
        !!readiness.ready,
      workstreams,
      focus,
      waiting,
      blockers,
      signals,
      actionableCount:
        available.length,
      parallelCount:
        available.length,
      immediateCost,
      immediateCashGap:
        Math.max(
          0,
          immediateCost -
          cash
        )
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

    const lifecycleStage =
      shopLifecycle
        .deriveStage(
          shop,
          {
            renovationStatus:
              readiness
                .renovationReady
                ? 'completed'
                : null,
            equipmentStatus:
              readiness
                .equipmentReady
                ? 'installed'
                : null,
            permitTotal:
              Number(
                readiness
                  .permits &&
                readiness
                  .permits
                  .total
              ) ||
              0,
            permitsApproved:
              Number(
                readiness
                  .permits &&
                readiness
                  .permits
                  .approved
              ) ||
              0,
            staffCoverage:
              Number(
                readiness
                  .staffing &&
                readiness
                  .staffing
                  .coverage
              ) ||
              0
          }
        );

    if (
      lifecycleStage !==
        'ready_for_trial'
    ) {
      return {
        ok:false,
        message:
          lifecycleStage ===
            'closed'
            ? '门店已经关闭，不能开始试营业'
            : lifecycleStage ===
                'paused'
              ? '门店处于暂停营业状态'
              : '当前门店状态不能开始试营业'
      };
    }

    shop.status =
      'trial_opening';

    shop.trialOpenedDay =
      this.getCurrentDay();

    shop.trialEndDay =
      shop.trialOpenedDay +
      3;

    shop.trialCompletedDay =
      null;

    shop.trialReport =
      null;

    shopLifecycle
      .syncShop(
        shop,
        null,
        {
          reason:
            'opening-trial-started'
        }
      );

    return {
      ok:
        true,
      day:
        shop.trialOpenedDay,
      endDay:
        shop.trialEndDay
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
