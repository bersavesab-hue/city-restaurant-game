'use strict';

const gameState =
  require('../core/gameState.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const openingPrepSystem =
  require('../opening/openingPrepSystem.js');

const liveWorldSystem =
  require('../world/liveWorldSystemV084.js');

const personEngine =
  require('../systems/personEngine.js');

const openingConfig =
  require('../opening/openingConfig.js');

const LEVEL_TITLES = {
  manager:[
    '店长',
    '资深店长',
    '高级店长',
    '区域储备'
  ],
  chef:[
    '厨师',
    '资深厨师',
    '后厨组长',
    '厨师长'
  ],
  server:[
    '服务员',
    '资深服务员',
    '前厅领班',
    '前厅主管'
  ],
  cashier:[
    '收银员',
    '资深收银员',
    '收银领班',
    '财务助理'
  ]
};

const ROLE_SKILLS = {
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
      Number(value) || 0
    )
  );
}

function currentDay() {
  return simulationSystem
    .getDayOrdinal(
      gameState
        .getTime()
    );
}

function getShop(shopId) {
  return (
    gameState
      .getBusiness()
      .shops
      .find(
        item =>
          item.id ===
          shopId
      ) ||
    null
  );
}

function getStaffState(
  shopId
) {
  return openingPrepSystem
    .getStaffState(
      shopId
    );
}

function findStaff(
  shopId,
  staffId
) {
  const state =
    getStaffState(
      shopId
    );

  return (
    (
      state.hired ||
      []
    ).find(
      row =>
        String(
          row.id
        ) ===
        String(
          staffId
        )
    ) ||
    null
  );
}

function getRole(
  roleId
) {
  return (
    openingConfig
      .roles
      .find(
        row =>
          row.id ===
          roleId
      ) ||
    null
  );
}

function ensureCareer(
  shopId,
  staff,
  index=0
) {
  if (
    !staff
  ) {
    return null;
  }

  const day =
    currentDay();

  const profile =
    liveWorldSystem
      .ensureStaffPerson(
        staff,
        shopId,
        index,
        day
      );

  staff.career =
    staff.career &&
    typeof staff.career ===
      'object'
      ? staff.career
      : {};

  const career =
    staff.career;

  career.version =
    '0.8.8';

  career.level =
    clamp(
      Math.round(
        career.level ||
        1
      ),
      1,
      4
    );

  const titles =
    LEVEL_TITLES[
      staff.roleId
    ] ||
    [
      staff.roleName ||
      staff.roleId ||
      '员工'
    ];

  career.title =
    titles[
      career.level -
      1
    ] ||
    titles[
      titles.length -
      1
    ];

  career.experience =
    Math.max(
      0,
      Number(
        career.experience
      ) ||
      0
    );

  career.trainingCount =
    Math.max(
      0,
      Number(
        career.trainingCount
      ) ||
      0
    );

  career.raiseCount =
    Math.max(
      0,
      Number(
        career.raiseCount
      ) ||
      0
    );

  career.promotionCount =
    Math.max(
      0,
      Number(
        career.promotionCount
      ) ||
      0
    );

  career.lastRaiseDay =
    career.lastRaiseDay ==
      null
      ? null
      : Number(
          career.lastRaiseDay
        );

  career.lastCoachDay =
    career.lastCoachDay ==
      null
      ? null
      : Number(
          career.lastCoachDay
        );

  career.training =
    career.training &&
    typeof career.training ===
      'object'
      ? career.training
      : null;

  career.leave =
    career.leave &&
    typeof career.leave ===
      'object'
      ? career.leave
      : null;

  career.performance =
    calculatePerformance(
      staff,
      profile
    );

  return career;
}

function ensureTeam(
  shopId
) {
  const state =
    getStaffState(
      shopId
    );

  const hired =
    Array.isArray(
      state.hired
    )
      ? state.hired
      : [];

  hired.forEach(
    (
      staff,
      index
    ) => {
      ensureCareer(
        shopId,
        staff,
        index
      );
    }
  );

  return hired;
}

function calculatePerformance(
  staff,
  profile
) {
  const state =
    profile &&
    profile.state ||
    {};

  return Math.round(
    clamp(
      (
        Number(
          staff.skill
        ) ||
        50
      ) *
        0.46 +
      (
        Number(
          state.energy
        ) ||
        70
      ) *
        0.14 +
      (
        Number(
          state.mood
        ) ||
        65
      ) *
        0.12 +
      (
        Number(
          state.satisfaction
        ) ||
        60
      ) *
        0.14 +
      (
        Number(
          state.loyalty
        ) ||
        55
      ) *
        0.14,
      0,
      100
    )
  );
}

function isUnavailable(
  staff,
  day=currentDay()
) {
  const career =
    staff &&
    staff.career ||
    {};

  if (
    career.training &&
    Number(
      career.training
        .finishDay
    ) >
      day
  ) {
    return {
      unavailable:true,
      reason:'training',
      label:'培训中',
      untilDay:
        Number(
          career.training
            .finishDay
        )
    };
  }

  if (
    career.leave &&
    Number(
      career.leave
        .untilDay
    ) >
      day
  ) {
    return {
      unavailable:true,
      reason:
        career.leave.reason ||
        'leave',
      label:
        career.leave.reason ===
          'sick'
          ? '病假'
          : '请假',
      untilDay:
        Number(
          career.leave
            .untilDay
        )
    };
  }

  return {
    unavailable:false,
    reason:null,
    label:'正常',
    untilDay:null
  };
}

function roleSkillKeys(
  roleId
) {
  return (
    ROLE_SKILLS[
      roleId
    ] ||
    [
      'operations'
    ]
  );
}

function trainingQuote(
  shopId,
  staffId
) {
  const staff =
    findStaff(
      shopId,
      staffId
    );

  if (!staff) {
    return null;
  }

  const career =
    ensureCareer(
      shopId,
      staff
    );

  const skill =
    Number(
      staff.skill
    ) ||
    50;

  return {
    cost:
      Math.round(
        (
          700 +
          skill *
            12 +
          career.level *
            280
        ) /
        100
      ) *
      100,
    days:2,
    skillGain:
      Math.max(
        4,
        Math.round(
          8 -
          skill /
          25
        )
      )
  };
}

function startTraining(
  shopId,
  staffId
) {
  const staff =
    findStaff(
      shopId,
      staffId
    );

  if (!staff) {
    return {
      ok:false,
      message:'员工不存在'
    };
  }

  const career =
    ensureCareer(
      shopId,
      staff
    );

  const day =
    currentDay();

  if (
    isUnavailable(
      staff,
      day
    ).unavailable
  ) {
    return {
      ok:false,
      message:'员工当前不可安排培训'
    };
  }

  const quote =
    trainingQuote(
      shopId,
      staffId
    );

  if (
    gameState
      .getPlayer()
      .cash <
    quote.cost
  ) {
    return {
      ok:false,
      message:'培训资金不足'
    };
  }

  gameState
    .spendCash(
      quote.cost
    );

  career.training = {
    startDay:day,
    finishDay:
      day +
      quote.days,
    cost:
      quote.cost,
    skillGain:
      quote.skillGain,
    status:'training'
  };

  career.trainingCount +=
    1;

  return {
    ok:true,
    ...quote,
    finishDay:
      career.training
        .finishDay
  };
}

function completeTraining(
  staff,
  career,
  day
) {
  if (
    !career.training ||
    career.training.status !==
      'training' ||
    day <
      Number(
        career.training
          .finishDay
      )
  ) {
    return false;
  }

  const profile =
    staff.personProfile;

  const gain =
    Math.max(
      1,
      Number(
        career.training
          .skillGain
      ) ||
      4
    );

  staff.skill =
    clamp(
      (
        Number(
          staff.skill
        ) ||
        50
      ) +
      gain,
      0,
      100
    );

  if (
    profile &&
    profile.skills
  ) {
    const keys =
      roleSkillKeys(
        staff.roleId
      );

    for (
      const key
      of keys
    ) {
      profile.skills[
        key
      ] =
        clamp(
          (
            Number(
              profile.skills[
                key
              ]
            ) ||
            staff.skill -
              gain
          ) +
          gain,
          0,
          100
        );
    }
  }

  if (
    profile &&
    profile.state
  ) {
    profile.state
      .satisfaction =
      clamp(
        (
          Number(
            profile
              .state
              .satisfaction
          ) ||
          60
        ) +
        4,
        0,
        100
      );

    profile.state
      .loyalty =
      clamp(
        (
          Number(
            profile
              .state
              .loyalty
          ) ||
          55
        ) +
        2,
        0,
        100
      );
  }

  career.lastTrainingDay =
    day;

  career.training.status =
    'completed';

  career.training
    .completedDay =
    day;

  career.lastTraining = {
    ...career.training
  };

  career.training =
    null;

  return true;
}

function giveRaise(
  shopId,
  staffId
) {
  const staff =
    findStaff(
      shopId,
      staffId
    );

  if (!staff) {
    return {
      ok:false,
      message:'员工不存在'
    };
  }

  const career =
    ensureCareer(
      shopId,
      staff
    );

  const day =
    currentDay();

  if (
    career.lastRaiseDay !=
      null &&
    day -
      career.lastRaiseDay <
      30
  ) {
    return {
      ok:false,
      message:'距上次加薪不足30天'
    };
  }

  const oldWage =
    Math.max(
      1,
      Number(
        staff.wage
      ) ||
      3500
    );

  const increase =
    Math.max(
      200,
      Math.round(
        oldWage *
        0.06 /
        100
      ) *
      100
    );

  staff.wage =
    oldWage +
    increase;

  career.raiseCount +=
    1;

  career.lastRaiseDay =
    day;

  const profile =
    staff.personProfile;

  if (
    profile &&
    profile.state
  ) {
    profile.state
      .satisfaction =
      clamp(
        (
          Number(
            profile
              .state
              .satisfaction
          ) ||
          60
        ) +
        7,
        0,
        100
      );

    profile.state
      .loyalty =
      clamp(
        (
          Number(
            profile
              .state
              .loyalty
          ) ||
          55
        ) +
        6,
        0,
        100
      );
  }

  return {
    ok:true,
    oldWage,
    increase,
    wage:
      staff.wage
  };
}

function promotionRequirement(
  staff,
  career,
  day=currentDay()
) {
  const nextLevel =
    Math.min(
      4,
      career.level +
      1
    );

  const skillRequired =
    [
      0,
      0,
      62,
      74,
      86
    ][
      nextLevel
    ] ||
    86;

  const tenureRequired =
    [
      0,
      0,
      30,
      90,
      180
    ][
      nextLevel
    ] ||
    180;

  const tenure =
    Math.max(
      0,
      day -
      Number(
        staff.hiredDay ||
        day
      )
    );

  return {
    nextLevel,
    skillRequired,
    tenureRequired,
    tenure,
    eligible:
      career.level <
        4 &&
      (
        Number(
          staff.skill
        ) ||
        0
      ) >=
        skillRequired &&
      tenure >=
        tenureRequired
  };
}

function promote(
  shopId,
  staffId
) {
  const staff =
    findStaff(
      shopId,
      staffId
    );

  if (!staff) {
    return {
      ok:false,
      message:'员工不存在'
    };
  }

  const career =
    ensureCareer(
      shopId,
      staff
    );

  const requirement =
    promotionRequirement(
      staff,
      career
    );

  if (
    career.level >=
    4
  ) {
    return {
      ok:false,
      message:'已达到当前岗位最高职级'
    };
  }

  if (
    !requirement
      .eligible
  ) {
    return {
      ok:false,
      message:
        '晋升需技能' +
        requirement
          .skillRequired +
        '，任职' +
        requirement
          .tenureRequired +
        '天'
    };
  }

  career.level +=
    1;

  career.promotionCount +=
    1;

  const titles =
    LEVEL_TITLES[
      staff.roleId
    ] ||
    [
      staff.roleName ||
      '员工'
    ];

  career.title =
    titles[
      career.level -
      1
    ] ||
    titles[
      titles.length -
      1
    ];

  const oldWage =
    Number(
      staff.wage
    ) ||
    3500;

  staff.wage =
    oldWage +
    Math.max(
      300,
      Math.round(
        oldWage *
        0.08 /
        100
      ) *
      100
    );

  if (
    staff.personProfile &&
    staff.personProfile.state
  ) {
    staff.personProfile
      .state
      .satisfaction =
      clamp(
        staff
          .personProfile
          .state
          .satisfaction +
        8,
        0,
        100
      );

    staff.personProfile
      .state
      .loyalty =
      clamp(
        staff
          .personProfile
          .state
          .loyalty +
        7,
        0,
        100
      );
  }

  return {
    ok:true,
    level:
      career.level,
    title:
      career.title,
    wage:
      staff.wage
  };
}

function approveLeave(
  shopId,
  staffId,
  days=1
) {
  const staff =
    findStaff(
      shopId,
      staffId
    );

  if (!staff) {
    return {
      ok:false,
      message:'员工不存在'
    };
  }

  const career =
    ensureCareer(
      shopId,
      staff
    );

  const day =
    currentDay();

  if (
    isUnavailable(
      staff,
      day
    ).unavailable
  ) {
    return {
      ok:false,
      message:'员工当前已有培训或请假安排'
    };
  }

  const leaveDays =
    clamp(
      Math.round(
        days
      ),
      1,
      3
    );

  career.leave = {
    startDay:day,
    untilDay:
      day +
      leaveDays,
    days:
      leaveDays,
    reason:'personal'
  };

  return {
    ok:true,
    untilDay:
      career.leave
        .untilDay,
    days:
      leaveDays
  };
}

function coach(
  shopId,
  staffId
) {
  const staff =
    findStaff(
      shopId,
      staffId
    );

  if (!staff) {
    return {
      ok:false,
      message:'员工不存在'
    };
  }

  const career =
    ensureCareer(
      shopId,
      staff
    );

  const day =
    currentDay();

  if (
    career.lastCoachDay !=
      null &&
    day -
      career.lastCoachDay <
      7
  ) {
    return {
      ok:false,
      message:'本周已经沟通过'
    };
  }

  const profile =
    staff.personProfile;

  if (
    !profile ||
    !profile.state
  ) {
    return {
      ok:false,
      message:'员工档案尚未初始化'
    };
  }

  profile.state.mood =
    clamp(
      profile.state.mood +
      5,
      0,
      100
    );

  profile.state.stress =
    clamp(
      profile.state.stress -
      5,
      0,
      100
    );

  profile.state
    .satisfaction =
    clamp(
      profile.state
        .satisfaction +
      4,
      0,
      100
    );

  profile.state.loyalty =
    clamp(
      profile.state.loyalty +
      3,
      0,
      100
    );

  career.lastCoachDay =
    day;

  personEngine
    .remember(
      profile,
      {
        typeId:'social',
        text:'与门店经营者进行了一次工作沟通',
        weight:42,
        sentiment:35,
        day
      }
    );

  return {
    ok:true
  };
}

function hashFloat(text) {
  let hash =
    2166136261;

  const value =
    String(text);

  for (
    let i = 0;
    i < value.length;
    i++
  ) {
    hash ^=
      value.charCodeAt(
        i
      );

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return (
    (
      hash >>>
      0
    ) %
    1000000
  ) /
    1000000;
}

function maybeSickLeave(
  shopId,
  staff,
  career,
  day
) {
  if (
    isUnavailable(
      staff,
      day
    ).unavailable
  ) {
    return false;
  }

  const profile =
    staff.personProfile;

  const health =
    Number(
      profile &&
      profile.state &&
      profile.state.health
    ) ||
    80;

  const stress =
    Number(
      profile &&
      profile.state &&
      profile.state.stress
    ) ||
    20;

  if (
    health >=
      58 &&
    stress <=
      76
  ) {
    return false;
  }

  const chance =
    clamp(
      0.01 +
      Math.max(
        0,
        58 -
        health
      ) *
        0.003 +
      Math.max(
        0,
        stress -
        76
      ) *
        0.002,
      0.01,
      0.11
    );

  if (
    hashFloat(
      shopId +
      ':' +
      staff.id +
      ':' +
      day +
      ':sick'
    ) >=
    chance
  ) {
    return false;
  }

  career.leave = {
    startDay:day,
    untilDay:
      day +
      1,
    days:1,
    reason:'sick'
  };

  career.lastSickDay =
    day;

  return true;
}

function processStaffDay(
  shopId,
  staff,
  index,
  day
) {
  const career =
    ensureCareer(
      shopId,
      staff,
      index
    );

  let changed =
    false;

  if (
    completeTraining(
      staff,
      career,
      day
    )
  ) {
    changed =
      true;
  }

  if (
    career.leave &&
    day >=
      Number(
        career.leave
          .untilDay
      )
  ) {
    career.lastLeave = {
      ...career.leave,
      completedDay:day
    };

    career.leave =
      null;

    changed =
      true;
  }

  if (
    maybeSickLeave(
      shopId,
      staff,
      career,
      day
    )
  ) {
    changed =
      true;
  }

  if (
    !isUnavailable(
      staff,
      day
    ).unavailable
  ) {
    career.experience +=
      1;

    if (
      career.experience >=
      30
    ) {
      career.experience -=
        30;

      staff.skill =
        clamp(
          (
            Number(
              staff.skill
            ) ||
            50
          ) +
          1,
          0,
          100
        );

      changed =
        true;
    }
  }

  career.performance =
    calculatePerformance(
      staff,
      staff.personProfile
    );

  career.lastProcessedDay =
    day;

  return changed;
}

function ensureStore() {
  const business =
    gameState.getBusiness();

  business.staffCareer =
    business.staffCareer &&
    typeof business.staffCareer ===
      'object'
      ? business.staffCareer
      : {
          version:'0.8.8',
          lastProcessedDay:null,
          history:[]
        };

  const state =
    business.staffCareer;

  state.version =
    '0.8.8';

  state.history =
    Array.isArray(
      state.history
    )
      ? state.history
      : [];

  return state;
}

function recordHistory(
  item
) {
  const state =
    ensureStore();

  state.history.unshift(
    item
  );

  state.history =
    state.history
      .slice(
        0,
        120
      );
}

function processDay(day) {
  const shops =
    gameState
      .getBusiness()
      .shops ||
    [];

  let changed =
    false;

  for (
    const shop
    of shops
  ) {
    const state =
      getStaffState(
        shop.id
      );

    const hired =
      Array.isArray(
        state.hired
      )
        ? state.hired
        : [];

    for (
      let i = 0;
      i < hired.length;
      i++
    ) {
      const staff =
        hired[i];

      const before =
        clone(
          staff.career ||
          {}
        );

      if (
        processStaffDay(
          shop.id,
          staff,
          i,
          day
        )
      ) {
        changed =
          true;
      }

      const after =
        staff.career ||
        {};

      if (
        before.training &&
        !after.training
      ) {
        recordHistory({
          day,
          type:'training_complete',
          shopId:
            shop.id,
          staffId:
            staff.id,
          staffName:
            staff.name
        });
      }

      if (
        after.leave &&
        after.leave.reason ===
          'sick' &&
        (
          !before.leave ||
          before.leave.reason !==
            'sick'
        )
      ) {
        recordHistory({
          day,
          type:'sick_leave',
          shopId:
            shop.id,
          staffId:
            staff.id,
          staffName:
            staff.name
        });
      }
    }
  }

  ensureStore()
    .lastProcessedDay =
    day;

  return changed;
}

function update() {
  const state =
    ensureStore();

  const day =
    currentDay();

  if (
    state.lastProcessedDay ==
    null
  ) {
    state.lastProcessedDay =
      day -
      1;
  }

  let changed =
    false;

  let guard =
    0;

  while (
    state.lastProcessedDay <
      day &&
    guard <
      3700
  ) {
    guard +=
      1;

    const next =
      state.lastProcessedDay +
      1;

    if (
      processDay(
        next
      )
    ) {
      changed =
        true;
    }

    state.lastProcessedDay =
      next;
  }

  return changed;
}

function getTeamSnapshot(
  shopId
) {
  const shop =
    getShop(
      shopId
    );

  if (!shop) {
    return null;
  }

  const hired =
    ensureTeam(
      shopId
    );

  const rows =
    hired.map(
      (
        staff,
        index
      ) => {
        const career =
          ensureCareer(
            shopId,
            staff,
            index
          );

        const profile =
          staff.personProfile ||
          {};

        const state =
          profile.state ||
          {};

        const unavailable =
          isUnavailable(
            staff
          );

        const requirement =
          promotionRequirement(
            staff,
            career
          );

        return {
          id:
            String(
              staff.id
            ),
          name:
            staff.name,
          age:
            staff.age,
          roleId:
            staff.roleId,
          roleName:
            staff.roleName ||
            staff.roleId,
          title:
            career.title,
          level:
            career.level,
          wage:
            Number(
              staff.wage
            ) ||
            0,
          skill:
            Number(
              staff.skill
            ) ||
            0,
          performance:
            career.performance,
          experience:
            career.experience,
          mood:
            Math.round(
              Number(
                state.mood
              ) ||
              65
            ),
          energy:
            Math.round(
              Number(
                state.energy
              ) ||
              70
            ),
          stress:
            Math.round(
              Number(
                state.stress
              ) ||
              25
            ),
          satisfaction:
            Math.round(
              Number(
                state.satisfaction
              ) ||
              60
            ),
          loyalty:
            Math.round(
              Number(
                state.loyalty
              ) ||
              55
            ),
          turnoverRisk:
            Math.round(
              Number(
                staff.live &&
                staff.live
                  .turnoverRisk
              ) ||
              0
            ),
          unavailable:
            unavailable
              .unavailable,
          statusLabel:
            unavailable.label,
          unavailableUntilDay:
            unavailable.untilDay,
          promotion:
            requirement
        };
      }
    );

  const sum =
    key =>
      rows.reduce(
        (
          total,
          row
        ) =>
          total +
          (
            Number(
              row[key]
            ) ||
            0
          ),
        0
      );

  return {
    shopId,
    shopName:
      shop.name,
    count:
      rows.length,
    avgMood:
      rows.length
        ? Math.round(
            sum(
              'mood'
            ) /
            rows.length
          )
        : 0,
    avgStress:
      rows.length
        ? Math.round(
            sum(
              'stress'
            ) /
            rows.length
          )
        : 0,
    avgLoyalty:
      rows.length
        ? Math.round(
            sum(
              'loyalty'
            ) /
            rows.length
          )
        : 0,
    highRisk:
      rows.filter(
        row =>
          row.turnoverRisk >=
          68
      ).length,
    unavailable:
      rows.filter(
        row =>
          row.unavailable
      ).length,
    employees:
      rows
  };
}

module.exports = {
  LEVEL_TITLES,
  ROLE_SKILLS,
  currentDay,
  ensureStore,
  ensureCareer,
  ensureTeam,
  calculatePerformance,
  isUnavailable,
  trainingQuote,
  startTraining,
  completeTraining,
  giveRaise,
  promotionRequirement,
  promote,
  approveLeave,
  coach,
  processStaffDay,
  processDay,
  update,
  getTeamSnapshot
};
