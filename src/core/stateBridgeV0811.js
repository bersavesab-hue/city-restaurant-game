'use strict';

const VERSION = '0.8.11';

function summarize(value) {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return {
      type: 'array',
      length: value.length
    };
  }

  if (typeof value === 'object') {
    const out = {};

    for (const key of ['id', 'name', 'status', 'districtId', 'shopId']) {
      if (
        value[key] === null ||
        typeof value[key] === 'string' ||
        typeof value[key] === 'number' ||
        typeof value[key] === 'boolean'
      ) {
        out[key] = value[key];
      }
    }

    return Object.keys(out).length
      ? out
      : {
          type: 'object',
          keys:
            Object.keys(value)
              .slice(0, 8)
        };
  }

  return {
    type: typeof value
  };
}

function createBridge(customDependencies) {
  const provided =
    customDependencies ||
    {};

  let installed = false;
  let dependencies = null;
  let mutationDepth = 0;
  let suppressTimeMutation = 0;
  let pendingActions = [];
  const pendingDomains = new Set();
  const restorers = [];

  function resolveDependencies() {
    if (dependencies) {
      return dependencies;
    }

    dependencies = {
      bus:
        provided.bus ||
        require('./globalStateBusV0811.js'),
      gameState:
        provided.gameState ||
        require('./gameState.js'),
      timeSystem:
        provided.timeSystem ||
        require('./timeSystem.js'),
      sceneManager:
        provided.sceneManager ||
        require('../ui/managers/sceneManager.js'),
      entryRouter:
        provided.entryRouter ||
        require('./entryRouterV0810.js')
    };

    return dependencies;
  }

  function registerDomains() {
    const deps =
      resolveDependencies();

    const bus =
      deps.bus;

    bus.registerDomain(
      'player',
      () =>
        deps.gameState.getPlayer()
    );

    bus.registerDomain(
      'time',
      () =>
        deps.gameState.getTime()
    );

    bus.registerDomain(
      'world',
      () =>
        deps.gameState.getWorld()
    );

    bus.registerDomain(
      'business',
      () =>
        deps.gameState.getBusiness()
    );

    bus.registerDomain(
      'finance',
      () =>
        deps.gameState.getFinance()
    );

    bus.registerDomain(
      'property',
      () =>
        deps.gameState.getPropertyProcess()
    );

    bus.registerDomain(
      'operations',
      () =>
        deps.gameState.getRestaurantOperations()
    );

    bus.registerDomain(
      'route',
      () => ({
        routeId:
          deps.entryRouter &&
          typeof deps.entryRouter.getCurrentRoute ===
            'function'
            ? deps.entryRouter.getCurrentRoute()
            : deps.sceneManager.getCurrentId(),
        sceneId:
          deps.sceneManager.getCurrentId(),
        historyDepth:
          deps.entryRouter &&
          typeof deps.entryRouter.getHistory ===
            'function'
            ? deps.entryRouter.getHistory().length
            : 0
      })
    );
  }

  function markDomains(domains) {
    for (const domain of domains || []) {
      pendingDomains.add(domain);
    }
  }

  function emitSpecialAction(action) {
    const deps =
      resolveDependencies();

    const bus =
      deps.bus;

    const payload = {
      target: action.target,
      method: action.method,
      args: action.args,
      result: action.result
    };

    bus.emit(
      'state.action',
      payload,
      {
        source: 'stateBridge'
      }
    );

    if (action.target === 'gameState') {
      if (
        action.method === 'setCash' ||
        action.method === 'addCash' ||
        action.method === 'spendCash'
      ) {
        bus.emit(
          'player.cash.changed',
          payload,
          {
            source: 'stateBridge'
          }
        );
      }

      if (action.method === 'setDistrict') {
        bus.emit(
          'world.district.changed',
          payload,
          {
            source: 'stateBridge'
          }
        );
      }

      if (action.method === 'setWeather') {
        bus.emit(
          'world.weather.changed',
          payload,
          {
            source: 'stateBridge'
          }
        );
      }

      if (
        action.method === 'setCityName' ||
        action.method === 'clearCityName'
      ) {
        bus.emit(
          'world.city.changed',
          payload,
          {
            source: 'stateBridge'
          }
        );
      }

      if (action.method === 'addShop') {
        bus.emit(
          'business.shop.added',
          payload,
          {
            source: 'stateBridge'
          }
        );
      }
    }

    if (action.target === 'timeSystem') {
      bus.emit(
        'time.control.changed',
        payload,
        {
          source: 'stateBridge'
        }
      );
    }
  }

  function flushMutation(label) {
    const deps =
      resolveDependencies();

    const actions =
      pendingActions;

    const domains =
      Array.from(
        pendingDomains
      );

    pendingActions = [];
    pendingDomains.clear();

    deps.bus.transaction(
      label || 'state.mutation',
      () => {
        for (const domain of domains) {
          deps.bus.syncDomain(
            domain,
            label ||
            'state.mutation'
          );
        }

        for (const action of actions) {
          emitSpecialAction(action);
        }
      },
      {
        source: 'stateBridge'
      }
    );
  }

  function wrapMutation(
    object,
    method,
    target,
    domains,
    options
  ) {
    if (
      !object ||
      typeof object[method] !== 'function'
    ) {
      return false;
    }

    const original =
      object[method];

    if (original.__v0811StateBridgeWrapped) {
      return true;
    }

    const opts =
      options ||
      {};

    function wrapped(...args) {
      if (
        opts.skipWhenTimeSuppressed &&
        suppressTimeMutation > 0
      ) {
        return original.apply(
          this,
          args
        );
      }

      mutationDepth++;

      let result;
      let failed = false;

      try {
        result =
          original.apply(
            this,
            args
          );

        if (
          !opts.onlyWhenTruthy ||
          result
        ) {
          markDomains(domains);

          pendingActions.push({
            target,
            method,
            args:
              args.map(summarize),
            result:
              summarize(result)
          });
        }

        return result;
      } catch (error) {
        failed = true;
        throw error;
      } finally {
        mutationDepth--;

        if (
          mutationDepth === 0 &&
          !failed &&
          (
            pendingActions.length ||
            pendingDomains.size
          )
        ) {
          flushMutation(
            target + '.' + method
          );
        }
      }
    }

    wrapped.__v0811StateBridgeWrapped =
      true;

    wrapped.__v0811StateBridgeOriginal =
      original;

    object[method] =
      wrapped;

    restorers.push(() => {
      if (object[method] === wrapped) {
        object[method] = original;
      }
    });

    return true;
  }

  function wrapTimeUpdate() {
    const deps =
      resolveDependencies();

    const object =
      deps.timeSystem;

    if (
      !object ||
      typeof object.update !== 'function'
    ) {
      return false;
    }

    const original =
      object.update;

    if (original.__v0811StateBridgeWrapped) {
      return true;
    }

    function wrapped(deltaMs, onStep) {
      suppressTimeMutation++;

      let advanced = 0;

      try {
        advanced =
          original.call(
            this,
            deltaMs,
            onStep
          );
      } finally {
        suppressTimeMutation--;
      }

      if (
        Number(advanced) > 0
      ) {
        deps.bus.transaction(
          'time.update',
          () => {
            deps.bus.syncDomain(
              'time',
              'time.update'
            );

            deps.bus.emit(
              'time.advanced',
              {
                minutes:
                  Number(advanced) || 0,
                deltaMs:
                  Number(deltaMs) || 0
              },
              {
                source: 'stateBridge'
              }
            );
          },
          {
            source: 'stateBridge'
          }
        );
      }

      return advanced;
    }

    wrapped.__v0811StateBridgeWrapped =
      true;

    wrapped.__v0811StateBridgeOriginal =
      original;

    object.update =
      wrapped;

    restorers.push(() => {
      if (object.update === wrapped) {
        object.update = original;
      }
    });

    return true;
  }

  function wrapRouteObject(
    object,
    method,
    sourceName
  ) {
    if (
      !object ||
      typeof object[method] !== 'function'
    ) {
      return false;
    }

    const original =
      object[method];

    if (original.__v0811StateBridgeWrapped) {
      return true;
    }

    function wrapped(...args) {
      const deps =
        resolveDependencies();

      const before =
        deps.sceneManager.getCurrentId();

      const result =
        original.apply(
          this,
          args
        );

      const after =
        deps.sceneManager.getCurrentId();

      if (result) {
        deps.bus.transaction(
          sourceName + '.' + method,
          () => {
            deps.bus.syncDomain(
              'route',
              sourceName + '.' + method
            );

            deps.bus.emit(
              'route.changed',
              {
                from: before,
                to: after,
                requested:
                  summarize(args[0]),
                params:
                  summarize(args[1])
              },
              {
                source: 'stateBridge'
              }
            );
          },
          {
            source: 'stateBridge'
          }
        );
      }

      return result;
    }

    wrapped.__v0811StateBridgeWrapped =
      true;

    wrapped.__v0811StateBridgeOriginal =
      original;

    object[method] =
      wrapped;

    restorers.push(() => {
      if (object[method] === wrapped) {
        object[method] = original;
      }
    });

    return true;
  }

  function install() {
    if (installed) {
      return true;
    }

    const deps =
      resolveDependencies();

    if (
      !deps.bus ||
      !deps.gameState ||
      !deps.timeSystem ||
      !deps.sceneManager ||
      !deps.entryRouter
    ) {
      return false;
    }

    registerDomains();

    const gameStateMethods = [
      ['setCash', ['player']],
      ['addCash', ['player']],
      ['spendCash', ['player'], { onlyWhenTruthy: true }],
      ['setCityName', ['world'], { onlyWhenTruthy: true }],
      ['clearCityName', ['world']],
      ['setDistrict', ['world']],
      ['setWeather', ['world']],
      ['addShop', ['business']],
      ['setTimeSpeed', ['time'], { onlyWhenTruthy: true }],
      ['setTimePaused', ['time']],
      ['toggleTimePause', ['time']],
      [
        'reset',
        [
          'player',
          'time',
          'world',
          'business',
          'finance',
          'property',
          'operations'
        ]
      ],
      [
        'importSave',
        [
          'player',
          'time',
          'world',
          'business',
          'finance',
          'property',
          'operations'
        ],
        { onlyWhenTruthy: true }
      ]
    ];

    for (const row of gameStateMethods) {
      wrapMutation(
        deps.gameState,
        row[0],
        'gameState',
        row[1],
        row[2]
      );
    }

    const timeMethods = [
      'setSpeed',
      'pause',
      'resume',
      'togglePause',
      'setTime',
      'addMinutes',
      'addHours',
      'addDays',
      'nextDay'
    ];

    for (const method of timeMethods) {
      wrapMutation(
        deps.timeSystem,
        method,
        'timeSystem',
        ['time'],
        {
          skipWhenTimeSuppressed: true
        }
      );
    }

    wrapTimeUpdate();

    wrapRouteObject(
      deps.sceneManager,
      'switchTo',
      'sceneManager'
    );

    wrapRouteObject(
      deps.entryRouter,
      'open',
      'entryRouter'
    );

    wrapRouteObject(
      deps.entryRouter,
      'back',
      'entryRouter'
    );

    deps.bus.syncAll(
      'bridge.install',
      true
    );

    deps.bus.emit(
      'bridge.installed',
      {
        version: VERSION
      },
      {
        source: 'stateBridge'
      }
    );

    installed = true;
    return true;
  }

  function syncRuntime(flags) {
    const deps =
      resolveDependencies();

    const state =
      flags ||
      {};

    const domains =
      new Set();

    if (
      Number(state.advancedMinutes) > 0
    ) {
      domains.add('time');
    }

    if (
      state.simulationChanged ||
      state.timelineChanged
    ) {
      domains.add('world');
    }

    if (
      state.restaurantChanged ||
      state.lifecycleChanged ||
      state.staffCareerChanged
    ) {
      domains.add('business');
      domains.add('operations');
      domains.add('finance');
      domains.add('player');
    }

    if (!domains.size) {
      return 0;
    }

    let changed = 0;

    deps.bus.transaction(
      'runtime.sync',
      () => {
        for (const domain of domains) {
          if (
            deps.bus.syncDomain(
              domain,
              'runtime.sync'
            )
          ) {
            changed++;
          }
        }

        deps.bus.emit(
          'runtime.synced',
          {
            changedDomains: changed,
            advancedMinutes:
              Number(
                state.advancedMinutes
              ) || 0,
            simulationChanged:
              !!state.simulationChanged,
            timelineChanged:
              !!state.timelineChanged,
            restaurantChanged:
              !!state.restaurantChanged,
            lifecycleChanged:
              !!state.lifecycleChanged,
            staffCareerChanged:
              !!state.staffCareerChanged
          },
          {
            source: 'stateBridge'
          }
        );
      },
      {
        source: 'stateBridge'
      }
    );

    return changed;
  }

  function diagnose() {
    const deps =
      resolveDependencies();

    return {
      version: VERSION,
      installed,
      wrappedCount:
        restorers.length,
      mutationDepth,
      suppressTimeMutation,
      bus:
        deps.bus &&
        typeof deps.bus.diagnose ===
          'function'
          ? deps.bus.diagnose()
          : null
    };
  }

  function uninstallForTests() {
    while (restorers.length) {
      const restore =
        restorers.pop();

      restore();
    }

    installed = false;
    mutationDepth = 0;
    suppressTimeMutation = 0;
    pendingActions = [];
    pendingDomains.clear();
  }

  return {
    VERSION,
    install,
    syncRuntime,
    diagnose,
    uninstallForTests
  };
}

const defaultBridge =
  createBridge();

defaultBridge.createBridge =
  createBridge;

defaultBridge.summarize =
  summarize;

module.exports =
  defaultBridge;
