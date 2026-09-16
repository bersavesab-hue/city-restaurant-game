'use strict';

const gameState =
  require('./gameState.js');

const globalStateBus =
  require('./globalStateBusV0811.js');

const VERSION =
  '0.8.12';

const DAY_MINUTES =
  1440;

let installed =
  false;

let lastAbsoluteMinute =
  null;

let unsubscribers =
  [];

let pendingChanged =
  false;

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

function safeClone(value) {
  if (
    value === undefined
  ) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function isLeapYear(year) {
  const value =
    Math.max(
      1,
      Math.floor(
        Number(year) || 1
      )
    );

  return (
    value % 400 ===
      0 ||
    (
      value % 4 ===
        0 &&
      value % 100 !==
        0
    )
  );
}

function daysInMonth(
  year,
  month
) {
  const value =
    clamp(
      Math.floor(
        Number(month) || 1
      ),
      1,
      12
    );

  if (value === 2) {
    return isLeapYear(year)
      ? 29
      : 28;
  }

  return [
    4,
    6,
    9,
    11
  ].includes(
    value
  )
    ? 30
    : 31;
}

function normalizeTime(time) {
  const source =
    time ||
    gameState.getTime();

  let year =
    Math.max(
      1,
      Math.floor(
        Number(
          source &&
          source.year
        ) ||
        1
      )
    );

  let rawMonth =
    Math.floor(
      Number(
        source &&
        source.month
      ) ||
      1
    );

  // Backward-compatible calendar normalization:
  // legacy systems/tests may directly mutate month/day and temporarily
  // produce values such as April 31. Carry overflow forward instead of
  // clamping it back to the previous date.
  let monthIndex =
    (
      year -
      1
    ) *
      12 +
    rawMonth -
    1;

  if (
    monthIndex <
    0
  ) {
    monthIndex =
      0;
  }

  year =
    Math.floor(
      monthIndex /
      12
    ) +
    1;

  let month =
    monthIndex %
      12 +
    1;

  let rawDay =
    Math.floor(
      Number(
        source &&
        source.day
      ) ||
      1
    );

  let rawHour =
    Math.floor(
      Number(
        source &&
        source.hour
      ) ||
      0
    );

  let rawMinute =
    Math.floor(
      Number(
        source &&
        source.minute
      ) ||
      0
    );

  // Carry minute/hour overflow into the date as well. This keeps the
  // coordinator tolerant of old modules that mutate the raw time object.
  const minuteTotal =
    rawHour *
      60 +
    rawMinute;

  const dayCarry =
    Math.floor(
      minuteTotal /
      DAY_MINUTES
    );

  const normalizedMinuteTotal =
    (
      (
        minuteTotal %
        DAY_MINUTES
      ) +
      DAY_MINUTES
    ) %
    DAY_MINUTES;

  rawDay +=
    dayCarry;

  const hour =
    Math.floor(
      normalizedMinuteTotal /
      60
    );

  const minute =
    normalizedMinuteTotal %
    60;

  // Normalize positive overflow (e.g. Apr 31 -> May 1).
  while (
    rawDay >
    daysInMonth(
      year,
      month
    )
  ) {
    rawDay -=
      daysInMonth(
        year,
        month
      );

    month++;

    if (
      month >
      12
    ) {
      month =
        1;
      year++;
    }
  }

  // Normalize underflow (e.g. May 0 -> Apr 30).
  while (
    rawDay <
    1
  ) {
    if (
      year === 1 &&
      month === 1
    ) {
      rawDay =
        1;
      break;
    }

    month--;

    if (
      month <
      1
    ) {
      month =
        12;
      year =
        Math.max(
          1,
          year -
          1
        );
    }

    rawDay +=
      daysInMonth(
        year,
        month
      );
  }

  return {
    year,
    month,
    day: rawDay,
    hour,
    minute
  };
}
function dayOrdinal(time) {
  const value =
    normalizeTime(
      time
    );

  const y0 =
    value.year -
    1;

  let total =
    y0 *
      365 +
    Math.floor(
      y0 /
      4
    ) -
    Math.floor(
      y0 /
      100
    ) +
    Math.floor(
      y0 /
      400
    );

  for (
    let month = 1;
    month <
      value.month;
    month++
  ) {
    total +=
      daysInMonth(
        value.year,
        month
      );
  }

  return (
    total +
    value.day
  );
}

function minuteOfDay(time) {
  const value =
    normalizeTime(
      time
    );

  return (
    value.hour *
      60 +
    value.minute
  );
}

function absoluteMinute(time) {
  return (
    dayOrdinal(
      time
    ) *
      DAY_MINUTES +
    minuteOfDay(
      time
    )
  );
}

function businessDayOrdinal(
  time,
  cutoffHour
) {
  const cutoff =
    clamp(
      cutoffHour == null
        ? 4
        : cutoffHour,
      0,
      23
    ) *
    60;

  const ordinal =
    dayOrdinal(
      time
    );

  return Math.max(
    1,
    ordinal -
      (
        minuteOfDay(
          time
        ) <
          cutoff
          ? 1
          : 0
      )
  );
}

function nextBusinessDayBoundary(
  time,
  cutoffHour
) {
  const cutoff =
    Math.round(
      clamp(
        cutoffHour == null
          ? 4
          : cutoffHour,
        0,
        23
      ) *
      60
    );

  const now =
    absoluteMinute(
      time
    );

  const dayStart =
    Math.floor(
      now /
      DAY_MINUTES
    ) *
    DAY_MINUTES;

  let target =
    dayStart +
    cutoff;

  if (
    target <=
    now
  ) {
    target +=
      DAY_MINUTES;
  }

  return target;
}

function weekDay(time) {
  return (
    (
      dayOrdinal(
        time
      ) -
      1
    ) %
      7 +
    7
  ) %
    7;
}

function mealPeriod(time) {
  const value =
    normalizeTime(
      time
    );

  const hour =
    value.hour;

  if (
    hour >= 6 &&
    hour < 10
  ) {
    return 'breakfast';
  }

  if (
    hour >= 10 &&
    hour < 14
  ) {
    return 'lunch';
  }

  if (
    hour >= 14 &&
    hour < 17
  ) {
    return 'afternoon';
  }

  if (
    hour >= 17 &&
    hour < 21
  ) {
    return 'dinner';
  }

  return 'night';
}

function getShop(
  shopId
) {
  return (
    (
      gameState
        .getBusiness()
        .shops ||
      []
    ).find(
      shop =>
        String(
          shop.id
        ) ===
        String(
          shopId
        )
    ) ||
    null
  );
}

function getBusinessHours(
  shopOrId
) {
  try {
    const schedule =
      require(
        '../operations/operationsScheduleV087.js'
      );

    if (
      schedule &&
      typeof schedule.getBusinessHours ===
        'function'
    ) {
      return schedule
        .getBusinessHours(
          shopOrId
        );
    }
  } catch (error) {
  }

  const shop =
    typeof shopOrId ===
      'object'
      ? shopOrId
      : getShop(
          shopOrId
        );

  const raw =
    shop &&
    shop.businessHours &&
    typeof shop.businessHours ===
      'object'
      ? shop.businessHours
      : {};

  return {
    openHour:
      clamp(
        Number(
          raw.openHour
        ) ||
        Number(
          shop &&
          shop.openHour
        ) ||
        6,
        0,
        24
      ),
    closeHour:
      clamp(
        Number(
          raw.closeHour
        ) ||
        Number(
          shop &&
          shop.closeHour
        ) ||
        23,
        0,
        24
      )
  };
}

function isWithinHours(
  hours,
  time
) {
  const value =
    minuteOfDay(
      time
    );

  const open =
    Math.round(
      clamp(
        hours &&
        hours.openHour,
        0,
        24
      ) *
      60
    );

  const close =
    Math.round(
      clamp(
        hours &&
        hours.closeHour,
        0,
        24
      ) *
      60
    );

  if (open === close) {
    return true;
  }

  if (close > open) {
    return (
      value >=
        open &&
      value <
        close
    );
  }

  return (
    value >=
      open ||
    value <
      close
  );
}

function getShopClock(
  shopOrId,
  time
) {
  const shop =
    typeof shopOrId ===
      'object'
      ? shopOrId
      : getShop(
          shopOrId
        );

  if (!shop) {
    return null;
  }

  const value =
    normalizeTime(
      time
    );

  const hours =
    getBusinessHours(
      shop
    );

  let coverage =
    null;

  try {
    const schedule =
      require(
        '../operations/operationsScheduleV087.js'
      );

    if (
      schedule &&
      typeof schedule.getCoverage ===
        'function'
    ) {
      coverage =
        schedule
          .getCoverage(
            shop.id,
            value
          );
    }
  } catch (error) {
  }

  return {
    shopId:
      shop.id,
    dayOrdinal:
      dayOrdinal(
        value
      ),
    weekDay:
      weekDay(
        value
      ),
    minuteOfDay:
      minuteOfDay(
        value
      ),
    mealPeriod:
      mealPeriod(
        value
      ),
    businessHours:
      safeClone(
        hours
      ),
    isOpen:
      isWithinHours(
        hours,
        value
      ),
    coverage
  };
}

function timedSignature(
  shop
) {
  const business =
    gameState
      .getBusiness();

  const renovations =
    business.renovations ||
    {};

  const prep =
    business.openingPrep ||
    {};

  const scheduleStore =
    business
      .operationsSchedule &&
    business
      .operationsSchedule
      .shops ||
    {};

  const renovation =
    renovations[
      shop.id
    ];

  const equipment =
    prep.equipment &&
    prep.equipment[
      shop.id
    ];

  const permits =
    prep.permits &&
    prep.permits[
      shop.id
    ];

  const schedule =
    scheduleStore[
      shop.id
    ];

  const permitItems =
    permits &&
    permits.items
      ? Object.keys(
          permits.items
        )
          .sort()
          .map(
            key => {
              const item =
                permits.items[
                  key
                ] ||
                {};

              return [
                key,
                item.status,
                item.finishDay,
                item.issue
              ];
            }
          )
      : null;

  const employees =
    schedule &&
    schedule.employees
      ? Object.keys(
          schedule.employees
        )
          .sort()
          .map(
            key => {
              const item =
                schedule.employees[
                  key
                ] ||
                {};

              return [
                key,
                item.preset,
                item.offDay,
                item.roleId
              ];
            }
          )
      : null;

  return JSON.stringify({
    shopStatus:
      shop.status ||
      null,
    renovationStatus:
      renovation &&
      renovation.status ||
      null,
    renovationFinish:
      renovation &&
      renovation.construction &&
      renovation.construction
        .finishMinute ||
      null,
    equipmentStatus:
      equipment &&
      equipment.status ||
      null,
    equipmentDeliveryDay:
      equipment &&
      equipment.deliveryDay ||
      null,
    permits:
      permitItems,
    businessHours:
      schedule &&
      schedule.businessHours ||
      shop.businessHours ||
      null,
    employees
  });
}

function syncShop(
  shop,
  reason
) {
  const business =
    gameState
      .getBusiness();

  const before =
    timedSignature(
      shop
    );

  let renovationChanged =
    false;

  let openingPrepChanged =
    false;

  let scheduleTouched =
    false;

  try {
    const renovations =
      business.renovations ||
      {};

    if (
      renovations[
        shop.id
      ]
    ) {
      const renovationSystem =
        require(
          '../renovation/renovationSystem.js'
        );

      renovationChanged =
        !!(
          renovationSystem &&
          typeof renovationSystem.updateShop ===
            'function' &&
          renovationSystem
            .updateShop(
              shop.id
            )
        );
    }
  } catch (error) {
    globalStateBus.emit(
      'calendar.sync.error',
      {
        shopId:
          shop.id,
        system:
          'renovation',
        message:
          error &&
          error.message
            ? String(
                error.message
              )
            : String(
                error
              )
      },
      {
        source:
          'timeScheduleCoordinator'
      }
    );
  }

  try {
    const prep =
      business.openingPrep ||
      {};

    const hasPrep =
      !!(
        prep.equipment &&
        prep.equipment[
          shop.id
        ]
      ) ||
      !!(
        prep.permits &&
        prep.permits[
          shop.id
        ]
      ) ||
      !!(
        prep.staffing &&
        prep.staffing[
          shop.id
        ]
      );

    if (hasPrep) {
      const openingPrepSystem =
        require(
          '../opening/openingPrepSystem.js'
        );

      const prepBefore =
        timedSignature(
          shop
        );

      if (
        openingPrepSystem &&
        typeof openingPrepSystem.updateShop ===
          'function'
      ) {
        openingPrepSystem
          .updateShop(
            shop.id
          );
      }

      openingPrepChanged =
        prepBefore !==
        timedSignature(
          shop
        );
    }
  } catch (error) {
    globalStateBus.emit(
      'calendar.sync.error',
      {
        shopId:
          shop.id,
        system:
          'openingPrep',
        message:
          error &&
          error.message
            ? String(
                error.message
              )
            : String(
                error
              )
      },
      {
        source:
          'timeScheduleCoordinator'
      }
    );
  }

  try {
    const store =
      business
        .operationsSchedule &&
      business
        .operationsSchedule
        .shops;

    const hasSchedule =
      !!(
        store &&
        store[
          shop.id
        ]
      );

    if (
      hasSchedule ||
      shop.status ===
        'open' ||
      shop.status ===
        'trial_opening'
    ) {
      const schedule =
        require(
          '../operations/operationsScheduleV087.js'
        );

      if (
        schedule &&
        typeof schedule.ensureShop ===
          'function'
      ) {
        schedule
          .ensureShop(
            shop.id
          );

        scheduleTouched =
          true;
      }
    }
  } catch (error) {
    globalStateBus.emit(
      'calendar.sync.error',
      {
        shopId:
          shop.id,
        system:
          'operationsSchedule',
        message:
          error &&
          error.message
            ? String(
                error.message
              )
            : String(
                error
              )
      },
      {
        source:
          'timeScheduleCoordinator'
      }
    );
  }

  const after =
    timedSignature(
      shop
    );

  const changed =
    before !==
    after;

  if (changed) {
    globalStateBus.emit(
      'calendar.shop-timed-state.changed',
      {
        shopId:
          shop.id,
        reason:
          reason ||
          'sync',
        renovationChanged,
        openingPrepChanged,
        scheduleTouched
      },
      {
        source:
          'timeScheduleCoordinator'
      }
    );
  }

  return {
    changed,
    renovationChanged,
    openingPrepChanged,
    scheduleTouched
  };
}

function autosaveTimedChange() {
  try {
    const saveSystem =
      require(
        './saveSystem.js'
      );

    if (
      saveSystem &&
      typeof saveSystem.autoSave ===
        'function'
    ) {
      saveSystem
        .autoSave(
          true
        );
    }
  } catch (error) {
  }
}

function syncAllShops(
  reason
) {
  const shops =
    gameState
      .getBusiness()
      .shops ||
    [];

  let changed =
    0;

  let renovationChanged =
    0;

  let openingPrepChanged =
    0;

  for (
    const shop
    of shops
  ) {
    const result =
      syncShop(
        shop,
        reason
      );

    if (
      result.changed
    ) {
      changed++;
    }

    if (
      result
        .renovationChanged
    ) {
      renovationChanged++;
    }

    if (
      result
        .openingPrepChanged
    ) {
      openingPrepChanged++;
    }
  }

  if (changed > 0) {
    pendingChanged =
      true;

    globalStateBus.transaction(
      'calendar.sync',
      () => {
        globalStateBus
          .syncDomain(
            'business',
            reason ||
            'calendar.sync'
          );

        globalStateBus
          .syncDomain(
            'operations',
            reason ||
            'calendar.sync'
          );

        globalStateBus.emit(
          'calendar.timed-state.changed',
          {
            changedShops:
              changed,
            renovationChanged,
            openingPrepChanged,
            reason:
              reason ||
              'calendar.sync'
          },
          {
            source:
              'timeScheduleCoordinator'
          }
        );
      },
      {
        source:
          'timeScheduleCoordinator'
      }
    );

    autosaveTimedChange();
  }

  return {
    changed:
      changed >
      0,
    changedShops:
      changed,
    renovationChanged,
    openingPrepChanged
  };
}

function emitDayBoundaries(
  previous,
  current
) {
  let count =
    0;

  let boundary =
    (
      Math.floor(
        previous /
        DAY_MINUTES
      ) +
      1
    ) *
    DAY_MINUTES;

  while (
    boundary <=
      current &&
    count <
      3700
  ) {
    const toOrdinal =
      Math.floor(
        boundary /
        DAY_MINUTES
      );

    globalStateBus.emit(
      'calendar.day.changed',
      {
        fromOrdinal:
          toOrdinal -
          1,
        toOrdinal,
        boundaryMinute:
          boundary
      },
      {
        source:
          'timeScheduleCoordinator'
      }
    );

    boundary +=
      DAY_MINUTES;

    count++;
  }

  return count;
}

function emitHourBoundaries(
  previous,
  current
) {
  let count =
    0;

  let boundary =
    (
      Math.floor(
        previous /
        60
      ) +
      1
    ) *
    60;

  while (
    boundary <=
      current &&
    count <
      2400
  ) {
    globalStateBus.emit(
      'calendar.hour.changed',
      {
        absoluteHour:
          Math.floor(
            boundary /
            60
          ),
        boundaryMinute:
          boundary
      },
      {
        source:
          'timeScheduleCoordinator'
      }
    );

    boundary +=
      60;

    count++;
  }

  return count;
}

function emitShopHourBoundaries(
  previous,
  current
) {
  const shops =
    gameState
      .getBusiness()
      .shops ||
    [];

  let count =
    0;

  const firstDay =
    Math.floor(
      previous /
      DAY_MINUTES
    ) -
    1;

  const lastDay =
    Math.floor(
      current /
      DAY_MINUTES
    ) +
    1;

  for (
    const shop
    of shops
  ) {
    const hours =
      getBusinessHours(
        shop
      );

    const openMinute =
      Math.round(
        clamp(
          hours.openHour,
          0,
          24
        ) *
        60
      );

    const closeMinute =
      Math.round(
        clamp(
          hours.closeHour,
          0,
          24
        ) *
        60
      );

    if (
      openMinute ===
      closeMinute
    ) {
      continue;
    }

    for (
      let ordinal =
        firstDay;
      ordinal <=
        lastDay;
      ordinal++
    ) {
      const openBoundary =
        ordinal *
          DAY_MINUTES +
        openMinute;

      let closeBoundary =
        ordinal *
          DAY_MINUTES +
        closeMinute;

      if (
        closeMinute <
        openMinute
      ) {
        closeBoundary +=
          DAY_MINUTES;
      }

      if (
        openBoundary >
          previous &&
        openBoundary <=
          current
      ) {
        globalStateBus.emit(
          'business.hours.opened',
          {
            shopId:
              shop.id,
            dayOrdinal:
              ordinal,
            openHour:
              hours.openHour,
            boundaryMinute:
              openBoundary
          },
          {
            source:
              'timeScheduleCoordinator'
          }
        );

        count++;
      }

      if (
        closeBoundary >
          previous &&
        closeBoundary <=
          current
      ) {
        globalStateBus.emit(
          'business.hours.closed',
          {
            shopId:
              shop.id,
            dayOrdinal:
              Math.floor(
                closeBoundary /
                DAY_MINUTES
              ),
            closeHour:
              hours.closeHour,
            boundaryMinute:
              closeBoundary
          },
          {
            source:
              'timeScheduleCoordinator'
          }
        );

        count++;
      }

      if (
        count >=
        5000
      ) {
        return count;
      }
    }
  }

  return count;
}

function processInterval(
  previous,
  current,
  reason
) {
  if (
    !Number.isFinite(
      previous
    ) ||
    !Number.isFinite(
      current
    ) ||
    current <=
      previous
  ) {
    return {
      dayBoundaries:0,
      hourBoundaries:0,
      businessBoundaries:0,
      timedChanged:false
    };
  }

  let dayBoundaries =
    0;

  let hourBoundaries =
    0;

  let businessBoundaries =
    0;

  let timed =
    null;

  globalStateBus.transaction(
    'calendar.time-advance',
    () => {
      dayBoundaries =
        emitDayBoundaries(
          previous,
          current
        );

      hourBoundaries =
        emitHourBoundaries(
          previous,
          current
        );

      businessBoundaries =
        emitShopHourBoundaries(
          previous,
          current
        );

      timed =
        syncAllShops(
          reason ||
          'time-advance'
        );

      globalStateBus.emit(
        'calendar.advanced',
        {
          fromAbsoluteMinute:
            previous,
          toAbsoluteMinute:
            current,
          advancedMinutes:
            current -
            previous,
          dayBoundaries,
          hourBoundaries,
          businessBoundaries,
          timedChanged:
            !!(
              timed &&
              timed.changed
            )
        },
        {
          source:
            'timeScheduleCoordinator'
        }
      );
    },
    {
      source:
        'timeScheduleCoordinator'
    }
  );

  return {
    dayBoundaries,
    hourBoundaries,
    businessBoundaries,
    timedChanged:
      !!(
        timed &&
        timed.changed
      )
  };
}

function syncTime(
  reason
) {
  const current =
    absoluteMinute(
      gameState
        .getTime()
    );

  if (
    lastAbsoluteMinute ==
    null
  ) {
    lastAbsoluteMinute =
      current;

    return {
      rebased:true,
      changed:false,
      current
    };
  }

  const previous =
    lastAbsoluteMinute;

  lastAbsoluteMinute =
    current;

  if (
    current <
    previous
  ) {
    globalStateBus.emit(
      'calendar.rebased',
      {
        fromAbsoluteMinute:
          previous,
        toAbsoluteMinute:
          current,
        reason:
          reason ||
          'time-rewind'
      },
      {
        source:
          'timeScheduleCoordinator'
      }
    );

    const timed =
      syncAllShops(
        reason ||
        'time-rewind'
      );

    return {
      rebased:true,
      changed:
        !!timed.changed,
      current
    };
  }

  if (
    current ===
    previous
  ) {
    return {
      rebased:false,
      changed:false,
      current
    };
  }

  const result =
    processInterval(
      previous,
      current,
      reason ||
      'time.changed'
    );

  return {
    rebased:false,
    changed:
      !!result.timedChanged,
    current,
    ...result
  };
}

function notifyScheduleChange(
  shopId,
  reason
) {
  pendingChanged =
    true;

  globalStateBus.transaction(
    'calendar.schedule-change',
    () => {
      globalStateBus
        .syncDomain(
          'business',
          reason ||
          'schedule-change'
        );

      globalStateBus
        .syncDomain(
          'operations',
          reason ||
          'schedule-change'
        );

      globalStateBus.emit(
        'business.schedule.changed',
        {
          shopId:
            shopId ||
            null,
          reason:
            reason ||
            'schedule-change',
          clock:
            shopId
              ? getShopClock(
                  shopId
                )
              : null
        },
        {
          source:
            'timeScheduleCoordinator'
        }
      );
    },
    {
      source:
        'timeScheduleCoordinator'
    }
  );

  autosaveTimedChange();

  return true;
}

function consumeChanged() {
  const value =
    pendingChanged;

  pendingChanged =
    false;

  return value;
}

function install() {
  if (installed) {
    return true;
  }

  lastAbsoluteMinute =
    absoluteMinute(
      gameState
        .getTime()
    );

  const onTimeChanged =
    globalStateBus.on(
      'time.changed',
      () => {
        syncTime(
          'time.changed'
        );
      }
    );

  const onTimeAdvanced =
    globalStateBus.on(
      'time.advanced',
      () => {
        syncTime(
          'time.advanced'
        );
      }
    );

  if (
    typeof onTimeChanged ===
    'function'
  ) {
    unsubscribers.push(
      onTimeChanged
    );
  }

  if (
    typeof onTimeAdvanced ===
    'function'
  ) {
    unsubscribers.push(
      onTimeAdvanced
    );
  }

  syncAllShops(
    'calendar.install'
  );

  installed =
    true;

  globalStateBus.emit(
    'calendar.installed',
    {
      version:
        VERSION,
      absoluteMinute:
        lastAbsoluteMinute
    },
    {
      source:
        'timeScheduleCoordinator'
    }
  );

  return true;
}

function diagnose() {
  return {
    version:
      VERSION,
    installed,
    lastAbsoluteMinute,
    pendingChanged,
    current:
      normalizeTime(
        gameState
          .getTime()
      ),
    currentOrdinal:
      dayOrdinal(
        gameState
          .getTime()
      ),
    shopCount:
      (
        gameState
          .getBusiness()
          .shops ||
        []
      ).length
  };
}

function resetForTests() {
  while (
    unsubscribers.length
  ) {
    const unsubscribe =
      unsubscribers.pop();

    try {
      unsubscribe();
    } catch (error) {
    }
  }

  installed =
    false;

  lastAbsoluteMinute =
    null;

  pendingChanged =
    false;
}

module.exports = {
  VERSION,
  DAY_MINUTES,
  isLeapYear,
  daysInMonth,
  normalizeTime,
  dayOrdinal,
  minuteOfDay,
  absoluteMinute,
  businessDayOrdinal,
  nextBusinessDayBoundary,
  weekDay,
  mealPeriod,
  getBusinessHours,
  isWithinHours,
  getShopClock,
  syncAllShops,
  syncTime,
  processInterval,
  notifyScheduleChange,
  consumeChanged,
  install,
  diagnose,
  resetForTests
};
