'use strict';

const gameState =
  require('../core/gameState.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const openingPrepSystem =
  require('../opening/openingPrepSystem.js');

const operationsSchedule =
  require('./operationsScheduleV087.js');

const staffCareer =
  require('./staffCareerV088.js');

const ROLE_LABELS = {
  manager:'店长',
  chef:'厨师',
  server:'服务',
  cashier:'前台'
};

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0
    )
  );
}

function numeric(
  value,
  fallback
) {
  const n =
    Number(
      value
    );

  return Number.isFinite(
    n
  )
    ? n
    : fallback;
}

function currentDay(
  time
) {
  return simulationSystem
    .getDayOrdinal(
      time ||
      gameState
        .getTime()
    );
}

function peakProfile(
  time
) {
  const t =
    time ||
    gameState
      .getTime();

  const hour =
    numeric(
      t.hour,
      0
    ) +
    numeric(
      t.minute,
      0
    ) /
    60;

  if (
    hour >= 7 &&
    hour < 9
  ) {
    return {
      id:'breakfast',
      label:'早餐高峰',
      demandMultiplier:1.10,
      loadMultiplier:1.15
    };
  }

  if (
    hour >= 11 &&
    hour < 14
  ) {
    return {
      id:'lunch',
      label:'午餐高峰',
      demandMultiplier:1.22,
      loadMultiplier:1.32
    };
  }

  if (
    hour >= 17 &&
    hour < 20
  ) {
    return {
      id:'dinner',
      label:'晚餐高峰',
      demandMultiplier:1.28,
      loadMultiplier:1.40
    };
  }

  if (
    hour >= 21 &&
    hour < 23
  ) {
    return {
      id:'night',
      label:'夜间高峰',
      demandMultiplier:1.10,
      loadMultiplier:1.18
    };
  }

  return {
    id:'normal',
    label:'平峰',
    demandMultiplier:1,
    loadMultiplier:1
  };
}

function getStore() {
  const business =
    gameState
      .getBusiness();

  business.staffWorkload =
    business.staffWorkload &&
    typeof business.staffWorkload ===
      'object'
      ? business.staffWorkload
      : {
          version:'0.8.9',
          shops:{}
        };

  business.staffWorkload.version =
    '0.8.9';

  business.staffWorkload.shops =
    business.staffWorkload.shops ||
    {};

  return business
    .staffWorkload;
}

function ensureEmployeeEntry(
  state,
  staffId
) {
  const id =
    String(
      staffId
    );

  state.employees =
    state.employees ||
    {};

  state.employees[id] =
    state.employees[id] ||
    {
      workedMinutes:0,
      overtimeMinutes:0,
      overtimePay:0,
      fatigue:20,
      consecutiveHeavyDays:0
    };

  return state.employees[id];
}

function syncLiveState(
  staff,
  profileState
) {
  if (
    !staff ||
    !profileState
  ) {
    return;
  }

  staff.live =
    staff.live &&
    typeof staff.live ===
      'object'
      ? staff.live
      : {};

  staff.live.energy =
    Math.round(
      numeric(
        profileState.energy,
        70
      )
    );

  staff.live.stress =
    Math.round(
      numeric(
        profileState.stress,
        25
      )
    );

  staff.live.mood =
    Math.round(
      numeric(
        profileState.mood,
        65
      )
    );

  staff.live.satisfaction =
    Math.round(
      numeric(
        profileState.satisfaction,
        60
      )
    );

  staff.live.loyalty =
    Math.round(
      numeric(
        profileState.loyalty,
        55
      )
    );
}

function fatigueScore(
  staff,
  entry
) {
  const profile =
    staff &&
    staff.personProfile ||
    {};

  const state =
    profile.state ||
    {};

  const energy =
    numeric(
      state.energy,
      70
    );

  const stress =
    numeric(
      state.stress,
      25
    );

  const overtimeHours =
    numeric(
      entry &&
      entry.overtimeMinutes,
      0
    ) /
    60;

  const longShiftHours =
    Math.max(
      0,
      (
        numeric(
          entry &&
          entry.workedMinutes,
          0
        ) -
        480
      ) /
      60
    );

  return Math.round(
    clamp(
      (
        100 -
        energy
      ) *
        0.48 +
      stress *
        0.32 +
      Math.min(
        24,
        overtimeHours *
        8
      ) +
      longShiftHours *
        2,
      0,
      100
    )
  );
}

function recoverFromPreviousDay(
  shopId,
  state
) {
  const team =
    staffCareer
      .ensureTeam(
        shopId
      );

  for (
    const staff
    of team
  ) {
    const entry =
      ensureEmployeeEntry(
        state,
        staff.id
      );

    const profile =
      staff.personProfile;

    if (
      !profile ||
      !profile.state
    ) {
      continue;
    }

    const worked =
      numeric(
        entry.workedMinutes,
        0
      );

    const overtime =
      numeric(
        entry.overtimeMinutes,
        0
      );

    const energyRecovery =
      worked <= 360
        ? 13
        : worked <= 480
          ? 10
          : 7;

    profile.state.energy =
      clamp(
        numeric(
          profile.state.energy,
          70
        ) +
        energyRecovery,
        0,
        100
      );

    profile.state.stress =
      clamp(
        numeric(
          profile.state.stress,
          25
        ) -
        (
          overtime > 0
            ? 5
            : 8
        ),
        0,
        100
      );

    if (
      worked >= 540 ||
      entry.fatigue >= 68
    ) {
      entry.consecutiveHeavyDays =
        numeric(
          entry.consecutiveHeavyDays,
          0
        ) +
        1;
    } else {
      entry.consecutiveHeavyDays =
        Math.max(
          0,
          numeric(
            entry.consecutiveHeavyDays,
            0
          ) -
          1
        );
    }

    syncLiveState(
      staff,
      profile.state
    );

    entry.workedMinutes =
      0;

    entry.overtimeMinutes =
      0;

    entry.overtimePay =
      0;

    entry.fatigue =
      fatigueScore(
        staff,
        entry
      );
  }
}

function ensureShopState(
  shopId,
  time
) {
  const store =
    getStore();

  const day =
    currentDay(
      time
    );

  store.shops[shopId] =
    store.shops[shopId] ||
    {
      day:null,
      todayOvertimePay:0,
      todayOvertimeMinutes:0,
      todayPeakMinutes:0,
      totalOvertimePay:0,
      employees:{}
    };

  const state =
    store.shops[shopId];

  if (
    state.day !=
      null &&
    state.day !==
      day
  ) {
    recoverFromPreviousDay(
      shopId,
      state
    );

    state.todayOvertimePay =
      0;

    state.todayOvertimeMinutes =
      0;

    state.todayPeakMinutes =
      0;
  }

  state.day =
    day;

  state.todayOvertimePay =
    Math.max(
      0,
      numeric(
        state.todayOvertimePay,
        0
      )
    );

  state.todayOvertimeMinutes =
    Math.max(
      0,
      numeric(
        state.todayOvertimeMinutes,
        0
      )
    );

  state.todayPeakMinutes =
    Math.max(
      0,
      numeric(
        state.todayPeakMinutes,
        0
      )
    );

  state.totalOvertimePay =
    Math.max(
      0,
      numeric(
        state.totalOvertimePay,
        0
      )
    );

  state.employees =
    state.employees ||
    {};

  return state;
}

function getDemandMultiplier(
  time
) {
  return peakProfile(
    time
  ).demandMultiplier;
}

function activeEmployees(
  shopId,
  time
) {
  const schedule =
    operationsSchedule
      .ensureShop(
        shopId
      );

  if (!schedule) {
    return [];
  }

  const team =
    staffCareer
      .ensureTeam(
        shopId
      );

  return team.filter(
    staff => {
      const employee =
        schedule.employees[
          String(
            staff.id
          )
        ];

      return operationsSchedule
        .isWorking(
          shopId,
          employee,
          time
        );
    }
  );
}

function getCapacityModifier(
  shopId,
  time
) {
  const state =
    ensureShopState(
      shopId,
      time
    );

  const active =
    activeEmployees(
      shopId,
      time
    );

  if (!active.length) {
    return 0.72;
  }

  let total =
    0;

  for (
    const staff
    of active
  ) {
    const entry =
      ensureEmployeeEntry(
        state,
        staff.id
      );

    entry.fatigue =
      fatigueScore(
        staff,
        entry
      );

    total +=
      entry.fatigue;
  }

  const average =
    total /
    active.length;

  return clamp(
    1.03 -
      average *
      0.0036,
    0.72,
    1.03
  );
}

function overtimeRatePerMinute(
  staff
) {
  const monthly =
    Math.max(
      0,
      numeric(
        staff &&
        staff.wage,
        0
      )
    );

  return (
    monthly /
    30 /
    8 /
    60 *
    1.5
  );
}

function advance(
  shopId,
  advancedMinutes,
  time
) {
  const minutes =
    clamp(
      advancedMinutes,
      0,
      240
    );

  if (
    minutes <=
    0
  ) {
    return {
      changed:false,
      overtimeCost:0,
      active:0
    };
  }

  const t =
    time ||
    gameState
      .getTime();

  const state =
    ensureShopState(
      shopId,
      t
    );

  const schedule =
    operationsSchedule
      .ensureShop(
        shopId
      );

  if (!schedule) {
    return {
      changed:false,
      overtimeCost:0,
      active:0
    };
  }

  const coverage =
    operationsSchedule
      .getCoverage(
        shopId,
        t
      );

  const peak =
    peakProfile(
      t
    );

  const team =
    staffCareer
      .ensureTeam(
        shopId
      );

  const underPressure =
    Math.max(
      0,
      0.85 -
      numeric(
        coverage.factor,
        1
      )
    );

  let overtimeCost =
    0;

  let overtimeMinutes =
    0;

  let active =
    0;

  for (
    const staff
    of team
  ) {
    const employee =
      schedule.employees[
        String(
          staff.id
        )
      ];

    if (
      !operationsSchedule
        .isWorking(
          shopId,
          employee,
          t
        )
    ) {
      continue;
    }

    active +=
      1;

    const entry =
      ensureEmployeeEntry(
        state,
        staff.id
      );

    const before =
      numeric(
        entry.workedMinutes,
        0
      );

    const after =
      before +
      minutes;

    const overtimeDelta =
      Math.max(
        0,
        after -
        480
      ) -
      Math.max(
        0,
        before -
        480
      );

    entry.workedMinutes =
      after;

    entry.overtimeMinutes =
      numeric(
        entry.overtimeMinutes,
        0
      ) +
      overtimeDelta;

    const pay =
      overtimeRatePerMinute(
        staff
      ) *
      overtimeDelta;

    entry.overtimePay =
      numeric(
        entry.overtimePay,
        0
      ) +
      pay;

    overtimeCost +=
      pay;

    overtimeMinutes +=
      overtimeDelta;

    const profile =
      staff.personProfile;

    if (
      !profile ||
      !profile.state
    ) {
      continue;
    }

    const hours =
      minutes /
      60;

    const energyLoss =
      hours *
      (
        1.6 +
        (
          peak.loadMultiplier -
          1
        ) *
        2.5 +
        underPressure *
        2.0 +
        (
          overtimeDelta >
          0
            ? 0.7
            : 0
        )
      );

    const stressGain =
      hours *
      (
        0.7 +
        (
          peak.loadMultiplier -
          1
        ) *
        2.2 +
        underPressure *
        2.5 +
        (
          overtimeDelta >
          0
            ? 0.9
            : 0
        )
      );

    profile.state.energy =
      clamp(
        numeric(
          profile.state.energy,
          70
        ) -
        energyLoss,
        0,
        100
      );

    profile.state.stress =
      clamp(
        numeric(
          profile.state.stress,
          25
        ) +
        stressGain,
        0,
        100
      );

    if (
      overtimeDelta >
      0
    ) {
      const overtimeHours =
        overtimeDelta /
        60;

      profile.state
        .satisfaction =
        clamp(
          numeric(
            profile.state
              .satisfaction,
            60
          ) -
          overtimeHours *
          0.45,
          0,
          100
        );

      profile.state.health =
        clamp(
          numeric(
            profile.state.health,
            80
          ) -
          overtimeHours *
          0.18,
          0,
          100
        );
    }

    entry.fatigue =
      fatigueScore(
        staff,
        entry
      );

    syncLiveState(
      staff,
      profile.state
    );
  }

  state.todayOvertimePay +=
    overtimeCost;

  state.totalOvertimePay +=
    overtimeCost;

  state.todayOvertimeMinutes +=
    overtimeMinutes;

  if (
    peak.id !==
      'normal' &&
    active >
      0
  ) {
    state.todayPeakMinutes +=
      minutes;
  }

  return {
    changed:
      active >
      0,
    overtimeCost:
      Math.round(
        overtimeCost *
        100
      ) /
      100,
    overtimeMinutes,
    active,
    peak
  };
}

function detectConflicts(
  shopId,
  time
) {
  const t =
    time ||
    gameState
      .getTime();

  const coverage =
    operationsSchedule
      .getCoverage(
        shopId,
        t
      );

  const peak =
    peakProfile(
      t
    );

  const conflicts =
    [];

  const roleCoverage =
    coverage.roleCoverage ||
    {};

  function addRoleConflict(
    roleId,
    threshold,
    severity
  ) {
    const ratio =
      numeric(
        roleCoverage[
          roleId
        ],
        0
      );

    if (
      ratio <
      threshold
    ) {
      conflicts.push({
        type:'role_shortage',
        roleId,
        severity,
        label:
          ROLE_LABELS[
            roleId
          ] +
          '缺口',
        coverage:
          Math.round(
            ratio *
            100
          )
      });
    }
  }

  if (
    peak.loadMultiplier >
    1.1
  ) {
    addRoleConflict(
      'chef',
      1,
      'high'
    );

    addRoleConflict(
      'server',
      0.8,
      'high'
    );

    addRoleConflict(
      'manager',
      0.8,
      'medium'
    );

    addRoleConflict(
      'cashier',
      0.8,
      'medium'
    );
  } else if (
    coverage.factor <
    0.65
  ) {
    conflicts.push({
      type:'low_coverage',
      severity:'medium',
      label:'整体排班承载偏低',
      coverage:
        Math.round(
          coverage.factor *
          100
        )
    });
  }

  const team =
    staffCareer
      .ensureTeam(
        shopId
      );

  const unavailable =
    team.filter(
      staff =>
        staffCareer
          .isUnavailable(
            staff
          )
          .unavailable
    );

  if (
    unavailable.length >
    0
  ) {
    conflicts.push({
      type:'unavailable',
      severity:'medium',
      label:
        unavailable.length +
        '名员工培训/请假',
      count:
        unavailable.length
    });
  }

  return conflicts;
}

function pressureLabel(
  peak,
  coverage,
  averageFatigue
) {
  const score =
    (
      peak.loadMultiplier -
      1
    ) *
      100 +
    Math.max(
      0,
      0.9 -
      coverage
    ) *
      90 +
    averageFatigue *
      0.35;

  if (
    score >=
    70
  ) {
    return '爆满';
  }

  if (
    score >=
    45
  ) {
    return '繁忙';
  }

  if (
    score >=
    25
  ) {
    return '偏忙';
  }

  return '正常';
}

function getSnapshot(
  shopId,
  time
) {
  const t =
    time ||
    gameState
      .getTime();

  const state =
    ensureShopState(
      shopId,
      t
    );

  const schedule =
    operationsSchedule
      .ensureShop(
        shopId
      );

  const coverage =
    operationsSchedule
      .getCoverage(
        shopId,
        t
      );

  const peak =
    peakProfile(
      t
    );

  const team =
    staffCareer
      .ensureTeam(
        shopId
      );

  const rows =
    team.map(
      staff => {
        const entry =
          ensureEmployeeEntry(
            state,
            staff.id
          );

        entry.fatigue =
          fatigueScore(
            staff,
            entry
          );

        const profileState =
          staff.personProfile &&
          staff.personProfile.state ||
          {};

        const employee =
          schedule &&
          schedule.employees[
            String(
              staff.id
            )
          ];

        return {
          id:
            String(
              staff.id
            ),
          name:
            staff.name,
          roleId:
            staff.roleId,
          workingNow:
            !!(
              employee &&
              operationsSchedule
                .isWorking(
                  shopId,
                  employee,
                  t
                )
            ),
          workedMinutes:
            Math.round(
              numeric(
                entry.workedMinutes,
                0
              )
            ),
          overtimeMinutes:
            Math.round(
              numeric(
                entry.overtimeMinutes,
                0
              )
            ),
          overtimePay:
            Math.round(
              numeric(
                entry.overtimePay,
                0
              ) *
              100
            ) /
            100,
          fatigue:
            entry.fatigue,
          energy:
            Math.round(
              numeric(
                profileState.energy,
                70
              )
            ),
          stress:
            Math.round(
              numeric(
                profileState.stress,
                25
              )
            ),
          consecutiveHeavyDays:
            Math.round(
              numeric(
                entry.consecutiveHeavyDays,
                0
              )
            )
        };
      }
    );

  const avgFatigue =
    rows.length
      ? Math.round(
          rows.reduce(
            (
              sum,
              row
            ) =>
              sum +
              row.fatigue,
            0
          ) /
          rows.length
        )
      : 0;

  const avgEnergy =
    rows.length
      ? Math.round(
          rows.reduce(
            (
              sum,
              row
            ) =>
              sum +
              row.energy,
            0
          ) /
          rows.length
        )
      : 0;

  const avgStress =
    rows.length
      ? Math.round(
          rows.reduce(
            (
              sum,
              row
            ) =>
              sum +
              row.stress,
            0
          ) /
          rows.length
        )
      : 0;

  const conflicts =
    detectConflicts(
      shopId,
      t
    );

  return {
    shopId,
    peak,
    pressure:
      pressureLabel(
        peak,
        numeric(
          coverage.factor,
          1
        ),
        avgFatigue
      ),
    coverage:
      numeric(
        coverage.factor,
        1
      ),
    active:
      numeric(
        coverage.active,
        0
      ),
    required:
      numeric(
        coverage.required,
        0
      ),
    avgFatigue,
    avgEnergy,
    avgStress,
    todayOvertimePay:
      Math.round(
        state.todayOvertimePay *
        100
      ) /
      100,
    todayOvertimeMinutes:
      Math.round(
        state.todayOvertimeMinutes
      ),
    todayPeakMinutes:
      Math.round(
        state.todayPeakMinutes
      ),
    totalOvertimePay:
      Math.round(
        state.totalOvertimePay *
        100
      ) /
      100,
    conflictCount:
      conflicts.length,
    conflicts,
    capacityModifier:
      getCapacityModifier(
        shopId,
        t
      ),
    employees:
      rows
  };
}

module.exports = {
  peakProfile,
  getDemandMultiplier,
  getStore,
  ensureShopState,
  fatigueScore,
  activeEmployees,
  getCapacityModifier,
  overtimeRatePerMinute,
  advance,
  detectConflicts,
  getSnapshot
};
