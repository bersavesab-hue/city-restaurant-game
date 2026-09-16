'use strict';

const gameStateDefault =
  require('./gameState.js');

const timeSystemDefault =
  require('./timeSystem.js');

const timeScheduleDefault =
  require('./timeScheduleCoordinatorV0812.js');

const simulationConfig =
  require('./simulationConfig.js');

const globalStateBusDefault =
  require('./globalStateBusV0811.js');

const VERSION =
  '1.2.1';

const DAY_MINUTES =
  1440;

const FIXED_MILESTONES = [
  { minute: 6 * 60, id:'breakfast', label:'早餐时段' },
  { minute:10 * 60, id:'lunch', label:'午餐时段' },
  { minute:14 * 60, id:'afternoon', label:'下午时段' },
  { minute:17 * 60, id:'dinner', label:'晚餐时段' },
  { minute:21 * 60, id:'night', label:'夜间时段' }
];

const TIMED_KEYS = new Set([
  'finishMinute',
  'arrivalMinute',
  'readyMinute',
  'completeMinute',
  'completionMinute',
  'deliveryMinute',
  'dueMinute'
]);

function create(options) {
  const opts =
    options || {};

  const gameState =
    opts.gameState ||
    gameStateDefault;

  const timeSystem =
    opts.timeSystem ||
    timeSystemDefault;

  const schedule =
    opts.timeScheduleCoordinator ||
    timeScheduleDefault;

  const bus =
    opts.bus ||
    globalStateBusDefault;

  const foodResearch =
    opts.foodResearchSystem ||
    null;

  let smartActive =
    false;

  let target =
    null;

  let lastStop =
    null;

  let installed =
    false;

  let unsubscribe =
    null;

  function nowAbsolute() {
    return schedule
      .absoluteMinute(
        gameState.getTime()
      );
  }

  function nextOccurrence(
    minuteOfDay,
    now
  ) {
    const dayStart =
      Math.floor(
        now /
        DAY_MINUTES
      ) *
      DAY_MINUTES;

    let value =
      dayStart +
      minuteOfDay;

    if (value <= now) {
      value += DAY_MINUTES;
    }

    return value;
  }

  function addCandidate(
    rows,
    at,
    type,
    label,
    detail
  ) {
    const now =
      nowAbsolute();

    const value =
      Number(at);

    if (
      !Number.isFinite(value) ||
      value <= now ||
      value - now >
        DAY_MINUTES * 14
    ) {
      return;
    }

    rows.push({
      at:value,
      type,
      label,
      detail:
        detail ||
        null
    });
  }

  function collectFixed(
    rows,
    now
  ) {
    const cutoffHour =
      Number(
        simulationConfig
          .time
          .businessDayCutoffHour
      ) ||
      4;

    addCandidate(
      rows,
      schedule
        .nextBusinessDayBoundary(
          gameState.getTime(),
          cutoffHour
        ),
      'settlement',
      '营业日结算（04:00）'
    );

    for (
      const item
      of FIXED_MILESTONES
    ) {
      addCandidate(
        rows,
        nextOccurrence(
          item.minute,
          now
        ),
        'meal',
        item.label,
        item.id
      );
    }
  }

  function collectShopBoundaries(
    rows,
    now
  ) {
    const business =
      gameState.getBusiness();

    const shops =
      Array.isArray(
        business.shops
      )
        ? business.shops
        : [];

    for (
      const shop
      of shops
    ) {
      if (!shop) continue;

      const hours =
        schedule
          .getBusinessHours(
            shop
          );

      const open =
        Math.round(
          Number(
            hours &&
            hours.openHour
          ) *
          60
        );

      const close =
        Math.round(
          Number(
            hours &&
            hours.closeHour
          ) *
          60
        );

      const is24h =
        !!(
          hours &&
          hours.twentyFourHours
        ) ||
        (
          open === 0 &&
          close === DAY_MINUTES
        ) ||
        open === close;

      if (is24h) {
        continue;
      }

      if (
        Number.isFinite(open)
      ) {
        addCandidate(
          rows,
          nextOccurrence(
            Math.max(
              0,
              Math.min(
                DAY_MINUTES - 1,
                open
              )
            ),
            now
          ),
          'shop-open',
          (shop.name || '门店') +
            '开店',
          shop.id
        );
      }

      if (
        Number.isFinite(close)
      ) {
        const closeMinute =
          close >=
            DAY_MINUTES
            ? 0
            : Math.max(
                0,
                close
              );

        addCandidate(
          rows,
          nextOccurrence(
            closeMinute,
            now
          ),
          'shop-close',
          (shop.name || '门店') +
            '营业结束',
          shop.id
        );
      }
    }
  }

  function collectResearch(
    rows
  ) {
    if (
      !foodResearch ||
      typeof foodResearch.getOverview !==
        'function'
    ) {
      return;
    }

    let overview;

    try {
      overview =
        foodResearch.getOverview();
    } catch (error) {
      return;
    }

    const projects =
      overview &&
      Array.isArray(
        overview.activeProjects
      )
        ? overview.activeProjects
        : [];

    for (
      const project
      of projects
    ) {
      addCandidate(
        rows,
        project &&
          project.finishMinute,
        'research',
        '菜品研发完成：' +
          (
            project &&
            project.name ||
            '新菜品'
          ),
        project &&
          project.recipeId
      );
    }
  }

  function collectTimedBusinessTasks(
    rows
  ) {
    const root =
      gameState.getBusiness();

    const seen =
      new Set();

    let visited =
      0;

    function walk(
      value,
      path,
      depth
    ) {
      if (
        value == null ||
        depth > 6 ||
        visited > 5000
      ) {
        return;
      }

      if (
        typeof value !==
          'object'
      ) {
        return;
      }

      if (seen.has(value)) {
        return;
      }

      seen.add(value);
      visited++;

      if (Array.isArray(value)) {
        for (
          let i = 0;
          i < value.length;
          i++
        ) {
          walk(
            value[i],
            path + '[' + i + ']',
            depth + 1
          );
        }
        return;
      }

      for (
        const key
        of Object.keys(value)
      ) {
        const child =
          value[key];

        if (
          TIMED_KEYS.has(key) &&
          Number.isFinite(
            Number(child)
          )
        ) {
          addCandidate(
            rows,
            Number(child),
            'timed-task',
            '经营任务节点',
            path + '.' + key
          );
        }

        if (
          child &&
          typeof child ===
            'object'
        ) {
          walk(
            child,
            path + '.' + key,
            depth + 1
          );
        }
      }
    }

    walk(
      root,
      'business',
      0
    );
  }

  function collectMilestones() {
    const rows = [];
    const now = nowAbsolute();

    collectFixed(
      rows,
      now
    );

    collectShopBoundaries(
      rows,
      now
    );

    collectResearch(
      rows
    );

    collectTimedBusinessTasks(
      rows
    );

    rows.sort(
      (a, b) =>
        a.at - b.at
    );

    const deduped = [];
    const keys = new Set();

    for (
      const row
      of rows
    ) {
      const key =
        row.at + '|' +
        row.type + '|' +
        String(
          row.detail || ''
        );

      if (keys.has(key)) {
        continue;
      }

      keys.add(key);
      deduped.push(row);
    }

    return deduped;
  }

  function getNextMilestone() {
    return (
      collectMilestones()[0] ||
      null
    );
  }

  function recommendedSpeed() {
    if (!target) {
      return 1;
    }

    const distance =
      Math.max(
        0,
        target.at -
        nowAbsolute()
      );

    const cfg =
      simulationConfig
        .time
        .smartAdvance ||
      {};

    if (
      distance <=
      Number(
        cfg.fineThresholdMinutes
      )
    ) {
      return Number(
        cfg.fineSpeed
      ) || 1;
    }

    if (
      distance <=
      Number(
        cfg.mediumThresholdMinutes
      )
    ) {
      return Number(
        cfg.mediumSpeed
      ) || 3;
    }

    return Number(
      cfg.fastSpeed
    ) || 8;
  }

  function refreshTarget() {
    const candidate =
      getNextMilestone();

    if (
      !target ||
      (
        candidate &&
        candidate.at <
          target.at
      )
    ) {
      target =
        candidate;
    }

    return target;
  }

  function startSmartAdvance() {
    target =
      getNextMilestone();

    if (!target) {
      return {
        ok:false,
        message:'当前没有可推进的关键节点'
      };
    }

    smartActive =
      true;

    timeSystem.resume();
    timeSystem.setSpeed(
      recommendedSpeed()
    );
    timeSystem.resetAccumulator();

    if (
      bus &&
      typeof bus.emit ===
        'function'
    ) {
      bus.emit(
        'time.smart.started',
        {
          target
        },
        {
          source:
            'timeFlowControllerV121'
        }
      );
    }

    return {
      ok:true,
      target:{...target}
    };
  }

  function stopSmartAdvance(
    reason,
    pause
  ) {
    const previous =
      target
        ? {...target}
        : null;

    smartActive =
      false;
    target =
      null;

    if (pause !== false) {
      timeSystem.pause();
      timeSystem.resetAccumulator();
    }

    lastStop = {
      reason:
        reason ||
        'stopped',
      target:previous,
      at:nowAbsolute()
    };

    return {
      stopped:true,
      ...lastStop
    };
  }

  function selectManualSpeed(
    speed
  ) {
    smartActive =
      false;
    target =
      null;

    return timeSystem
      .setSpeed(
        speed
      );
  }

  function beforeFrame() {
    if (!smartActive) {
      return false;
    }

    if (timeSystem.isPaused()) {
      smartActive = false;
      target = null;
      return false;
    }

    refreshTarget();

    if (!target) {
      stopSmartAdvance(
        'no-target',
        true
      );
      return true;
    }

    const speed =
      recommendedSpeed();

    if (
      timeSystem.getSpeed() !==
      speed
    ) {
      timeSystem.setSpeed(
        speed
      );
    }

    return true;
  }

  function afterSimulationStep() {
    if (!smartActive) {
      return null;
    }

    refreshTarget();

    if (
      target &&
      nowAbsolute() >=
        target.at
    ) {
      return stopSmartAdvance(
        'milestone',
        true
      );
    }

    return null;
  }

  function getMaxStepMinutes() {
    const base =
      Math.max(
        1,
        Number(
          simulationConfig
            .time
            .playerMaxSimulationChunkMinutes ||
          simulationConfig
            .time
            .maxSimulationChunkMinutes
        ) ||
        10
      );

    if (
      !smartActive ||
      !target
    ) {
      return base;
    }

    const distance =
      Math.max(
        1,
        target.at -
        nowAbsolute()
      );

    return Math.max(
      1,
      Math.min(
        base,
        distance
      )
    );
  }

  function isAnyShopOpen() {
    const business =
      gameState.getBusiness();

    const shops =
      Array.isArray(
        business.shops
      )
        ? business.shops
        : [];

    return shops.some(
      shop => {
        const clock =
          schedule.getShopClock(
            shop,
            gameState.getTime()
          );

        return !!(
          clock &&
          clock.isOpen
        );
      }
    );
  }

  function isCriticalEvent(event) {
    if (!event) return false;

    const type =
      String(
        event.type || ''
      ).toLowerCase();

    const payload =
      event.payload || {};

    const severity =
      String(
        payload.severity ||
        payload.level || ''
      ).toLowerCase();

    if (
      severity === 'critical' ||
      severity === 'emergency'
    ) {
      return true;
    }

    if (
      type ===
      'food.research.completed'
    ) {
      return true;
    }

    if (
      type.includes('inventory') &&
      (
        type.includes('stockout') ||
        type.includes('critical')
      )
    ) {
      return true;
    }

    if (
      type.includes('staff') &&
      (
        type.includes('shortage') ||
        type.includes('absent') ||
        type.includes('quit')
      )
    ) {
      return true;
    }

    if (
      type.includes('finance') &&
      (
        type.includes('critical') ||
        type.includes('insufficient')
      )
    ) {
      return true;
    }

    if (
      (
        type.includes('renovation') ||
        type.includes('procurement')
      ) &&
      (
        type.includes('completed') ||
        type.includes('arrived') ||
        type.includes('failed')
      )
    ) {
      return true;
    }

    return false;
  }

  function install() {
    if (installed) {
      return false;
    }

    installed =
      true;

    if (
      typeof timeSystem.setMaxStepProvider ===
        'function'
    ) {
      timeSystem.setMaxStepProvider(
        getMaxStepMinutes
      );
    }

    if (
      bus &&
      typeof bus.on ===
        'function'
    ) {
      unsubscribe =
        bus.on(
          '*',
          event => {
            if (
              isCriticalEvent(event)
            ) {
              timeSystem.pause();
              timeSystem.resetAccumulator();

              if (smartActive) {
                stopSmartAdvance(
                  'critical-event:' +
                    event.type,
                  true
                );
              } else {
                lastStop = {
                  reason:
                    'critical-event:' +
                    event.type,
                  target:null,
                  at:nowAbsolute()
                };
              }
            }
          }
        );
    }

    return true;
  }

  function uninstall() {
    if (!installed) {
      return false;
    }

    installed =
      false;

    if (
      typeof unsubscribe ===
        'function'
    ) {
      unsubscribe();
    }

    unsubscribe =
      null;

    if (
      typeof timeSystem.clearMaxStepProvider ===
        'function'
    ) {
      timeSystem.clearMaxStepProvider();
    }

    return true;
  }

  function status() {
    return {
      version:VERSION,
      smartActive,
      target:
        target
          ? {...target}
          : null,
      recommendedSpeed:
        smartActive
          ? recommendedSpeed()
          : null,
      anyShopOpen:
        isAnyShopOpen(),
      businessDay:
        schedule
          .businessDayOrdinal(
            gameState.getTime(),
            simulationConfig
              .time
              .businessDayCutoffHour
          ),
      lastStop:
        lastStop
          ? {...lastStop}
          : null
    };
  }

  return {
    VERSION,
    collectMilestones,
    getNextMilestone,
    startSmartAdvance,
    stopSmartAdvance,
    selectManualSpeed,
    beforeFrame,
    afterSimulationStep,
    getMaxStepMinutes,
    isAnyShopOpen,
    isSmartAdvance:() => smartActive,
    getTarget:() => target ? {...target} : null,
    status,
    install,
    uninstall
  };
}

module.exports = {
  VERSION,
  create
};
