'use strict';

const gameState =
  require('../core/gameState.js');

const openingPrepSystem =
  require('../opening/openingPrepSystem.js');

const timeScheduleCoordinator =
  require('../core/timeScheduleCoordinatorV0812.js');

const ROLE_WEIGHTS = {
  manager:0.15,
  chef:0.35,
  server:0.35,
  cashier:0.15
};

const PRESETS = [
  'early',
  'mid',
  'late',
  'off'
];

const DAY_NAMES = [
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '日'
];

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

function isLeapYear(year) {
  return (
    timeScheduleCoordinator
      .isLeapYear(
        year
      )
  );
}

function daysInMonth(
  year,
  month
) {
  return (
    timeScheduleCoordinator
      .daysInMonth(
        year,
        month
      )
  );
}

function dayOrdinal(time) {
  return (
    timeScheduleCoordinator
      .dayOrdinal(
        time
      )
  );
}

function weekDay(
  time
) {
  return (
    timeScheduleCoordinator
      .weekDay(
        time ||
        gameState.getTime()
      )
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

function getStore() {
  const business =
    gameState.getBusiness();

  business.operationsSchedule =
    business.operationsSchedule &&
    typeof business.operationsSchedule ===
      'object'
      ? business.operationsSchedule
      : {
          version:'0.8.7',
          shops:{}
        };

  business.operationsSchedule.version =
    '0.8.7';

  business.operationsSchedule.shops =
    business.operationsSchedule.shops ||
    {};

  return business
    .operationsSchedule;
}

function normalizeHours(
  shop
) {
  const raw =
    shop &&
    shop.businessHours &&
    typeof shop.businessHours ===
      'object'
      ? shop.businessHours
      : {};

  let openHour =
    Number.isFinite(
      Number(
        raw.openHour
      )
    )
      ? Number(
          raw.openHour
        )
      : Number.isFinite(
          Number(
            shop &&
            shop.openHour
          )
        )
        ? Number(
            shop.openHour
          )
        : 6;

  let closeHour =
    Number.isFinite(
      Number(
        raw.closeHour
      )
    )
      ? Number(
          raw.closeHour
        )
      : Number.isFinite(
          Number(
            shop &&
            shop.closeHour
          )
        )
        ? Number(
            shop.closeHour
          )
        : 23;

  openHour =
    clamp(
      Math.round(
        openHour
      ),
      5,
      12
    );

  closeHour =
    clamp(
      Math.round(
        closeHour
      ),
      18,
      24
    );

  if (
    closeHour -
    openHour <
    8
  ) {
    closeHour =
      Math.min(
        24,
        openHour +
        8
      );
  }

  return {
    openHour,
    closeHour
  };
}

function getBusinessHours(
  shopOrId
) {
  const shop =
    typeof shopOrId ===
      'object'
      ? shopOrId
      : getShop(
          shopOrId
        );

  if (!shop) {
    return {
      openHour:6,
      closeHour:23
    };
  }

  const liveShop =
    shop.id == null
      ? null
      : getShop(
          shop.id
        );

  // 兼容历史测试、预览对象和跨午夜营业对象：
  // 只有正式进入 business.shops 的门店才读取持久化排班。
  if (!liveShop) {
    const raw =
      shop.businessHours &&
      typeof shop.businessHours ===
        'object'
        ? shop.businessHours
        : {};

    const openHour =
      Number.isFinite(
        Number(
          raw.openHour
        )
      )
        ? Number(
            raw.openHour
          )
        : Number.isFinite(
            Number(
              shop.openHour
            )
          )
          ? Number(
              shop.openHour
            )
          : 6;

    const closeHour =
      Number.isFinite(
        Number(
          raw.closeHour
        )
      )
        ? Number(
            raw.closeHour
          )
        : Number.isFinite(
            Number(
              shop.closeHour
            )
          )
          ? Number(
              shop.closeHour
            )
          : 23;

    return {
      openHour:
        clamp(
          openHour,
          0,
          24
        ),
      closeHour:
        clamp(
          closeHour,
          0,
          24
        )
    };
  }

  const state =
    ensureShop(
      liveShop.id
    );

  return clone(
    state &&
    state.businessHours
      ? state.businessHours
      : normalizeHours(
          liveShop
        )
  );
}

function isOpenAt(
  shopOrId,
  time
) {
  const hours =
    getBusinessHours(
      shopOrId
    );

  return (
    timeScheduleCoordinator
      .isWithinHours(
        hours,
        time ||
        gameState.getTime()
      )
  );
}

function defaultPreset(
  staff,
  index
) {
  if (
    staff.roleId ===
    'chef'
  ) {
    return 'early';
  }

  if (
    staff.roleId ===
    'cashier'
  ) {
    return 'late';
  }

  if (
    staff.roleId ===
    'manager'
  ) {
    return 'mid';
  }

  return index % 2 ===
    0
    ? 'early'
    : 'late';
}

function syncEmployees(
  shopId,
  state
) {
  const staffState =
    openingPrepSystem
      .getStaffState(
        shopId
      );

  const hired =
    Array.isArray(
      staffState.hired
    )
      ? staffState.hired
      : [];

  state.employees =
    state.employees &&
    typeof state.employees ===
      'object'
      ? state.employees
      : {};

  const liveIds =
    new Set();

  hired.forEach(
    (
      staff,
      index
    ) => {
      const id =
        String(
          staff.id
        );

      liveIds.add(
        id
      );

      if (
        !state.employees[
          id
        ]
      ) {
        state.employees[
          id
        ] = {
          personId:id,
          roleId:
            staff.roleId,
          preset:
            defaultPreset(
              staff,
              index
            ),
          offDay:
            index %
            7
        };
      }

      state.employees[
        id
      ].roleId =
        staff.roleId;
    }
  );

  for (
    const id
    of Object.keys(
      state.employees
    )
  ) {
    if (
      !liveIds.has(
        id
      )
    ) {
      delete state
        .employees[
          id
        ];
    }
  }

  return hired;
}

function ensureShop(
  shopId
) {
  const shop =
    getShop(
      shopId
    );

  if (!shop) {
    return null;
  }

  const store =
    getStore();

  if (
    !store.shops[
      shopId
    ]
  ) {
    store.shops[
      shopId
    ] = {
      businessHours:
        normalizeHours(
          shop
        ),
      employees:{},
      updatedDay:null
    };
  }

  const state =
    store.shops[
      shopId
    ];

  state.businessHours =
    state.businessHours ||
    normalizeHours(
      shop
    );

  state.businessHours.openHour =
    clamp(
      Math.round(
        state.businessHours
          .openHour
      ),
      5,
      12
    );

  state.businessHours.closeHour =
    clamp(
      Math.round(
        state.businessHours
          .closeHour
      ),
      18,
      24
    );

  shop.businessHours = {
    openHour:
      state.businessHours
        .openHour,
    closeHour:
      state.businessHours
        .closeHour
  };

  syncEmployees(
    shopId,
    state
  );

  return state;
}

function setBusinessHours(
  shopId,
  openHour,
  closeHour
) {
  const shop =
    getShop(
      shopId
    );

  const state =
    ensureShop(
      shopId
    );

  if (
    !shop ||
    !state
  ) {
    return {
      ok:false,
      message:'门店不存在'
    };
  }

  const open =
    clamp(
      Math.round(
        openHour
      ),
      5,
      12
    );

  const close =
    clamp(
      Math.round(
        closeHour
      ),
      18,
      24
    );

  if (
    close -
    open <
    8
  ) {
    return {
      ok:false,
      message:'每日营业时长不能少于8小时'
    };
  }

  state.businessHours = {
    openHour:open,
    closeHour:close
  };

  shop.businessHours = {
    openHour:open,
    closeHour:close
  };

  state.updatedDay =
    dayOrdinal(
      gameState.getTime()
    );

  timeScheduleCoordinator
    .notifyScheduleChange(
      shopId,
      'business-hours'
    );

  return {
    ok:true,
    businessHours:
      clone(
        state.businessHours
      )
  };
}

function adjustOpenHour(
  shopId,
  delta
) {
  const state =
    ensureShop(
      shopId
    );

  if (!state) {
    return {
      ok:false,
      message:'门店不存在'
    };
  }

  return setBusinessHours(
    shopId,
    state.businessHours
      .openHour +
      Number(delta || 0),
    state.businessHours
      .closeHour
  );
}

function adjustCloseHour(
  shopId,
  delta
) {
  const state =
    ensureShop(
      shopId
    );

  if (!state) {
    return {
      ok:false,
      message:'门店不存在'
    };
  }

  return setBusinessHours(
    shopId,
    state.businessHours
      .openHour,
    state.businessHours
      .closeHour +
      Number(delta || 0)
  );
}

function shiftWindow(
  shopId,
  employee
) {
  const state =
    ensureShop(
      shopId
    );

  if (
    !state ||
    !employee
  ) {
    return null;
  }

  const open =
    state.businessHours
      .openHour;

  const close =
    state.businessHours
      .closeHour;

  const preset =
    employee.preset ||
    'mid';

  if (
    preset ===
    'off'
  ) {
    return null;
  }

  if (
    preset ===
    'early'
  ) {
    return {
      start:
        Math.max(
          0,
          open -
          1
        ),
      end:
        Math.min(
          24,
          open +
          8
        )
    };
  }

  if (
    preset ===
    'late'
  ) {
    return {
      start:
        Math.max(
          open,
          close -
          8
        ),
      end:
        Math.min(
          24,
          close +
          1
        )
    };
  }

  return {
    start:
      Math.max(
        open,
        Math.round(
          (
            open +
            close
          ) /
          2
        ) -
        4
      ),
    end:
      Math.min(
        24,
        Math.max(
          open +
          8,
          Math.round(
            (
              open +
              close
            ) /
            2
          ) +
          4
        )
      )
  };
}

function setEmployeeShift(
  shopId,
  personId,
  preset
) {
  const state =
    ensureShop(
      shopId
    );

  if (
    !state ||
    !state.employees[
      personId
    ]
  ) {
    return {
      ok:false,
      message:'员工不存在'
    };
  }

  if (
    !PRESETS.includes(
      preset
    )
  ) {
    return {
      ok:false,
      message:'班次无效'
    };
  }

  state.employees[
    personId
  ].preset =
    preset;

  timeScheduleCoordinator
    .notifyScheduleChange(
      shopId,
      'employee-shift'
    );

  return {
    ok:true,
    preset
  };
}

function cycleEmployeeShift(
  shopId,
  personId
) {
  const state =
    ensureShop(
      shopId
    );

  if (
    !state ||
    !state.employees[
      personId
    ]
  ) {
    return {
      ok:false,
      message:'员工不存在'
    };
  }

  const current =
    state.employees[
      personId
    ].preset;

  const index =
    Math.max(
      0,
      PRESETS.indexOf(
        current
      )
    );

  const next =
    PRESETS[
      (
        index +
        1
      ) %
      PRESETS.length
    ];

  return setEmployeeShift(
    shopId,
    personId,
    next
  );
}

function setEmployeeOffDay(
  shopId,
  personId,
  offDay
) {
  const state =
    ensureShop(
      shopId
    );

  if (
    !state ||
    !state.employees[
      personId
    ]
  ) {
    return {
      ok:false,
      message:'员工不存在'
    };
  }

  state.employees[
    personId
  ].offDay =
    (
      Math.round(
        Number(offDay) || 0
      ) %
      7 +
      7
    ) %
    7;

  timeScheduleCoordinator
    .notifyScheduleChange(
      shopId,
      'employee-off-day'
    );

  return {
    ok:true,
    offDay:
      state.employees[
        personId
      ].offDay
  };
}

function cycleEmployeeOffDay(
  shopId,
  personId
) {
  const state =
    ensureShop(
      shopId
    );

  if (
    !state ||
    !state.employees[
      personId
    ]
  ) {
    return {
      ok:false,
      message:'员工不存在'
    };
  }

  return setEmployeeOffDay(
    shopId,
    personId,
    state.employees[
      personId
    ].offDay +
      1
  );
}

function isWorking(
  shopId,
  employee,
  time
) {
  if (!employee) {
    return false;
  }

  const t =
    time ||
    gameState.getTime();

  const staffState =
    openingPrepSystem
      .getStaffState(
        shopId
      );

  const hiredStaff =
    (
      staffState.hired ||
      []
    ).find(
      row =>
        String(
          row.id
        ) ===
        String(
          employee.personId
        )
    );

  const career =
    hiredStaff &&
    hiredStaff.career ||
    {};

  const currentDay =
    dayOrdinal(
      t
    );

  if (
    career.training &&
    Number(
      career.training
        .finishDay
    ) >
      currentDay
  ) {
    return false;
  }

  if (
    career.leave &&
    Number(
      career.leave
        .untilDay
    ) >
      currentDay
  ) {
    return false;
  }

  if (
    employee.offDay ===
    weekDay(
      t
    )
  ) {
    return false;
  }

  const window =
    shiftWindow(
      shopId,
      employee
    );

  if (!window) {
    return false;
  }

  const hour =
    Number(
      t.hour
    ) +
    Number(
      t.minute
    ) /
    60;

  return (
    hour >=
      window.start &&
    hour <
      window.end
  );
}

function getCoverage(
  shopId,
  time
) {
  const state =
    ensureShop(
      shopId
    );

  if (!state) {
    return {
      factor:1,
      roleCoverage:{},
      active:0,
      required:0
    };
  }

  const required =
    openingPrepSystem
      .getRequiredStaff(
        shopId
      );

  const staffState =
    openingPrepSystem
      .getStaffState(
        shopId
      );

  const hired =
    Array.isArray(
      staffState.hired
    )
      ? staffState.hired
      : [];

  const counts = {
    manager:0,
    chef:0,
    server:0,
    cashier:0
  };

  let active =
    0;

  for (
    const staff
    of hired
  ) {
    const employee =
      state.employees[
        String(
          staff.id
        )
      ];

    if (
      isWorking(
        shopId,
        employee,
        time
      )
    ) {
      active +=
        1;

      counts[
        staff.roleId
      ] =
        (
          counts[
            staff.roleId
          ] ||
          0
        ) +
        1;
    }
  }

  let factor =
    0;

  const roleCoverage =
    {};

  for (
    const roleId
    of Object.keys(
      ROLE_WEIGHTS
    )
  ) {
    const need =
      Math.max(
        1,
        Number(
          required[
            roleId
          ]
        ) ||
        1
      );

    const coverage =
      clamp(
        (
          counts[
            roleId
          ] ||
          0
        ) /
        need,
        0,
        1
      );

    roleCoverage[
      roleId
    ] =
      coverage;

    factor +=
      coverage *
      ROLE_WEIGHTS[
        roleId
      ];
  }

  return {
    factor:
      clamp(
        factor,
        0.1,
        1
      ),
    roleCoverage,
    counts,
    active,
    required:
      Object.values(
        required
      ).reduce(
        (
          sum,
          value
        ) =>
          sum +
          (
            Number(
              value
            ) ||
            0
          ),
        0
      )
  };
}

function getSnapshot(
  shopId
) {
  const state =
    ensureShop(
      shopId
    );

  const shop =
    getShop(
      shopId
    );

  if (
    !state ||
    !shop
  ) {
    return null;
  }

  const staffState =
    openingPrepSystem
      .getStaffState(
        shopId
      );

  const hired =
    Array.isArray(
      staffState.hired
    )
      ? staffState.hired
      : [];

  const current =
    getCoverage(
      shopId,
      gameState.getTime()
    );

  return {
    businessHours:
      clone(
        state.businessHours
      ),
    weekDay:
      weekDay(
        gameState.getTime()
      ),
    weekDayName:
      DAY_NAMES[
        weekDay(
          gameState.getTime()
        )
      ],
    coverage:
      current.factor,
    active:
      current.active,
    required:
      current.required,
    employees:
      hired.map(
        staff => {
          const employee =
            state.employees[
              String(
                staff.id
              )
            ];

          const window =
            shiftWindow(
              shopId,
              employee
            );

          return {
            id:
              String(
                staff.id
              ),
            name:
              staff.name,
            roleId:
              staff.roleId,
            roleName:
              staff.roleName,
            preset:
              employee.preset,
            offDay:
              employee.offDay,
            offDayName:
              DAY_NAMES[
                employee.offDay
              ],
            start:
              window
                ? window.start
                : null,
            end:
              window
                ? window.end
                : null,
            workingNow:
              isWorking(
                shopId,
                employee,
                gameState.getTime()
              )
          };
        }
      )
  };
}

function presetName(
  preset
) {
  return {
    early:'早班',
    mid:'中班',
    late:'晚班',
    off:'停排'
  }[
    preset
  ] || '中班';
}

module.exports = {
  ROLE_WEIGHTS,
  PRESETS,
  DAY_NAMES,
  dayOrdinal,
  weekDay,
  getBusinessHours,
  isOpenAt,
  ensureShop,
  setBusinessHours,
  adjustOpenHour,
  adjustCloseHour,
  shiftWindow,
  setEmployeeShift,
  cycleEmployeeShift,
  setEmployeeOffDay,
  cycleEmployeeOffDay,
  isWorking,
  getCoverage,
  getSnapshot,
  presetName
};
