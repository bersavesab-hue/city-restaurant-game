'use strict';

const gameState =
  require('./gameState.js');

const saveSystem =
  require('./saveSystem.js');

const simulationSystem =
  require('./simulationSystem.js');

const globalStateBus =
  require('./globalStateBusV0811.js');

const openingPrepSystem =
  require('../opening/openingPrepSystem.js');

const shopLifecycleModule =
  require('./shopLifecycleV0816.js');

const VERSION = '0.8.16';

const STAGES = Object.freeze([
  'city_setup',
  'property_search',
  'renovation',
  'equipment',
  'license',
  'staff',
  'trial',
  'formal_open',
  'complete'
]);

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function createFlow(options) {
  const opts = options || {};

  const deps = {
    gameState:
      opts.gameState ||
      gameState,
    saveSystem:
      opts.saveSystem ||
      saveSystem,
    simulationSystem:
      opts.simulationSystem ||
      simulationSystem,
    bus:
      opts.bus ||
      globalStateBus,
    openingPrepSystem:
      opts.openingPrepSystem ||
      openingPrepSystem
  };

  function now() {
    return typeof opts.now === 'function'
      ? Number(opts.now()) || 0
      : Date.now();
  }

  const lifecycle =
    opts.shopLifecycle ||
    shopLifecycleModule
      .createLifecycle({
        gameState:
          deps.gameState,
        bus:
          deps.bus,
        now,
        inspect(shop) {
          const renovations =
            deps.gameState
              .getRenovations();

          const prep =
            deps.gameState
              .getOpeningPrep();

          const renovation =
            renovations &&
            renovations[
              shop.id
            ];

          const equipment =
            prep &&
            prep.equipment &&
            prep.equipment[
              shop.id
            ];

          const permits =
            prep &&
            prep.permits &&
            prep.permits[
              shop.id
            ];

          const permitItems =
            permits &&
            permits.items &&
            typeof permits.items ===
              'object'
              ? Object.values(
                  permits.items
                )
              : [];

          const approved =
            permitItems.filter(
              item => {
                const status =
                  String(
                    item &&
                    item.status ||
                    ''
                  );

                return (
                  status ===
                    'approved' ||
                  status.indexOf(
                    'approved_'
                  ) ===
                    0
                );
              }
            ).length;

          let coverage =
            0;

          try {
            const overview =
              deps.openingPrepSystem &&
              typeof deps
                .openingPrepSystem
                .getStaffOverview ===
                'function'
                ? deps.openingPrepSystem
                    .getStaffOverview(
                      shop.id
                    )
                : null;

            coverage =
              Number(
                overview &&
                overview.coverage
              ) ||
              0;
          } catch (error) {
            coverage =
              0;
          }

          return {
            renovationStatus:
              renovation &&
              renovation.status ||
              null,
            equipmentStatus:
              equipment &&
              equipment.status ||
              null,
            permitTotal:
              permitItems.length,
            permitsApproved:
              approved,
            permitsApplying:
              permitItems.some(
                item =>
                  String(
                    item &&
                    item.status ||
                    ''
                  ) ===
                  'applying'
              ),
            staffCoverage:
              coverage
          };
        }
      });

  function ensureState() {
    const data =
      deps.gameState.getData();

    data.progress =
      data.progress &&
      typeof data.progress === 'object'
        ? data.progress
        : {};

    const existing =
      data.progress.openingFlow;

    data.progress.openingFlow =
      existing &&
      typeof existing === 'object'
        ? existing
        : {
            version:1,
            mode:'legacy',
            cityConfirmed:false,
            legacyAdopted:false,
            startedAt:null,
            completedAt:null,
            lastStage:null,
            lastRoute:null
          };

    const state =
      data.progress.openingFlow;

    state.version = 1;
    state.mode =
      state.mode === 'fresh' ||
      state.mode === 'active'
        ? state.mode
        : 'legacy';
    state.cityConfirmed =
      !!state.cityConfirmed;
    state.legacyAdopted =
      !!state.legacyAdopted;

    return state;
  }

  function emit(type, payload) {
    if (
      deps.bus &&
      typeof deps.bus.emit === 'function'
    ) {
      deps.bus.emit(
        type,
        payload,
        {
          source:'newGameFlowV0814'
        }
      );
    }
  }

  function getBusiness() {
    return deps.gameState
      .getBusiness();
  }

  function getCurrentShop() {
    const business =
      getBusiness();

    const shops =
      Array.isArray(
        business.shops
      )
        ? business.shops
        : [];

    const current =
      shops.find(
        shop =>
          shop.id ===
            business.currentShopId &&
          shop.status !==
            'closed'
      );

    return (
      current ||
      shops.find(
        shop =>
          shop.status !==
            'closed'
      ) ||
      null
    );
  }

  function hasApprovedPermits(shopId) {
    const prep =
      deps.gameState
        .getOpeningPrep();

    const record =
      prep &&
      prep.permits &&
      prep.permits[shopId];

    const items =
      record &&
      record.items;

    if (
      !items ||
      typeof items !== 'object' ||
      !Object.keys(items).length
    ) {
      return false;
    }

    return Object.keys(items)
      .every(
        key => {
          const status =
            String(
              items[key] &&
              items[key].status ||
              ''
            );

          return status === 'approved' ||
            status.indexOf('approved_') === 0;
        }
      );
  }

  function hasStaffCoverage(shopId) {
    if (
      !deps.openingPrepSystem ||
      typeof deps.openingPrepSystem
        .getStaffOverview !== 'function'
    ) {
      const prep =
        deps.gameState
          .getOpeningPrep();

      const staffing =
        prep &&
        prep.staffing &&
        prep.staffing[shopId];

      return !!(
        staffing &&
        Array.isArray(staffing.hired) &&
        staffing.hired.length
      );
    }

    try {
      const overview =
        deps.openingPrepSystem
          .getStaffOverview(
            shopId
          );

      return !!(
        overview &&
        Number(
          overview.coverage
        ) >= 0.9
      );
    } catch (error) {
      return false;
    }
  }

  function deriveStage() {
    const state =
      ensureState();

    const business =
      getBusiness();

    if (
      state.mode === 'fresh' &&
      !state.cityConfirmed
    ) {
      return 'city_setup';
    }

    const shop =
      getCurrentShop();

    if (
      !business.hasShop ||
      !shop
    ) {
      return 'property_search';
    }

    const stage =
      lifecycle
        .deriveStage(
          shop
        );

    if (
      stage ===
        'awaiting_renovation' ||
      stage ===
        'renovating'
    ) {
      return 'renovation';
    }

    if (
      stage ===
        'awaiting_equipment' ||
      stage ===
        'equipment_installing'
    ) {
      return 'equipment';
    }

    if (
      stage ===
        'awaiting_permits' ||
      stage ===
        'permits_reviewing'
    ) {
      return 'license';
    }

    if (
      stage ===
        'awaiting_staff'
    ) {
      return 'staff';
    }

    if (
      stage ===
        'ready_for_trial' ||
      stage ===
        'trial_opening'
    ) {
      return 'trial';
    }

    if (
      stage ===
        'trial_complete'
    ) {
      return 'formal_open';
    }

    if (
      stage ===
        'formal_open' ||
      stage ===
        'paused'
    ) {
      return 'complete';
    }

    if (
      stage ===
        'closed'
    ) {
      return 'property_search';
    }

    return 'property_search';
  }

  function routeForStage(stage) {
    const shop =
      getCurrentShop();

    const shopParams =
      shop
        ? { shopId:shop.id }
        : {};

    switch (stage) {
      case 'city_setup':
        return {
          routeId:'newGame',
          params:{}
        };

      case 'property_search':
        return {
          routeId:'city',
          params:{}
        };

      case 'renovation':
        return {
          routeId:'renovation',
          params:shopParams
        };

      case 'equipment':
        return {
          routeId:'equipment',
          params:shopParams
        };

      case 'license':
        return {
          routeId:'license',
          params:shopParams
        };

      case 'staff':
        return {
          routeId:'staff',
          params:shopParams
        };

      case 'trial':
      case 'formal_open':
      case 'complete':
      default:
        return {
          routeId:
            shop
              ? 'shop'
              : 'city',
          params:shopParams
        };
    }
  }

  function syncStage(reason) {
    const state =
      ensureState();

    const stage =
      deriveStage();

    if (
      state.lastStage !== stage
    ) {
      const previous =
        state.lastStage;

      state.lastStage =
        stage;

      if (
        stage === 'complete' &&
        !state.completedAt
      ) {
        state.completedAt =
          now();
      }

      emit(
        'openingFlow.stage.changed',
        {
          from:previous,
          to:stage,
          reason:
            reason ||
            'sync'
        }
      );
    }

    return stage;
  }

  function initialize(optionsValue) {
    const settings =
      optionsValue || {};

    const data =
      deps.gameState.getData();

    const hadState =
      !!(
        data.progress &&
        data.progress.openingFlow
      );

    const state =
      ensureState();

    if (settings.fresh) {
      state.mode = 'fresh';
      state.cityConfirmed = false;
      state.legacyAdopted = false;
      state.startedAt =
        state.startedAt ||
        now();
      state.completedAt = null;
      state.lastStage = null;
      state.lastRoute = null;
    } else if (
      settings.restoredFromSave &&
      !hadState
    ) {
      state.mode = 'legacy';
      state.legacyAdopted = true;
      state.cityConfirmed = true;
      state.startedAt = null;
    }

    syncStage(
      settings.fresh
        ? 'fresh-init'
        : 'load-init'
    );

    return getProgress();
  }

  function confirmCityName(name) {
    const state =
      ensureState();

    const clean =
      String(
        name ||
        ''
      ).trim() ||
      '云州市';

    if (
      !deps.gameState
        .setCityName(
          clean
        )
    ) {
      return {
        ok:false,
        message:'城市名称无效'
      };
    }

    state.mode = 'active';
    state.cityConfirmed = true;
    state.startedAt =
      state.startedAt ||
      now();

    const stage =
      syncStage(
        'city-confirmed'
      );

    if (
      deps.saveSystem &&
      typeof deps.saveSystem.autoSave === 'function'
    ) {
      deps.saveSystem
        .autoSave(
          true
        );
    }

    emit(
      'openingFlow.city.confirmed',
      {
        cityName:
          deps.gameState
            .getCityName(),
        stage
      }
    );

    return {
      ok:true,
      cityName:
        deps.gameState
          .getCityName(),
      stage,
      next:
        routeForStage(stage)
    };
  }

  function restart(optionsValue) {
    const settings =
      optionsValue || {};

    if (
      deps.saveSystem &&
      typeof deps.saveSystem.newGame === 'function'
    ) {
      deps.saveSystem.newGame();
    } else {
      deps.gameState.reset();
    }

    const state =
      ensureState();

    state.mode = 'fresh';
    state.cityConfirmed = false;
    state.legacyAdopted = false;
    state.startedAt = now();
    state.completedAt = null;
    state.lastStage = null;
    state.lastRoute = null;

    if (
      settings.cityName
    ) {
      deps.gameState
        .setCityName(
          settings.cityName
        );
      state.cityConfirmed = true;
      state.mode = 'active';
    }

    if (
      deps.simulationSystem &&
      typeof deps.simulationSystem
        .initialize === 'function'
    ) {
      deps.simulationSystem
        .initialize();
    }

    syncStage(
      'restart'
    );

    if (
      deps.saveSystem &&
      typeof deps.saveSystem.save === 'function'
    ) {
      deps.saveSystem.save();
    }

    emit(
      'openingFlow.restarted',
      {
        cityConfirmed:
          state.cityConfirmed
      }
    );

    return getProgress();
  }

  function getStartupRoute() {
    const state =
      ensureState();

    if (
      state.mode === 'fresh' &&
      !state.cityConfirmed
    ) {
      return {
        routeId:'newGame',
        params:{}
      };
    }

    return {
      routeId:'city',
      params:{}
    };
  }

  function getRecommendedRoute() {
    const stage =
      syncStage(
        'recommend'
      );

    const route =
      routeForStage(
        stage
      );

    ensureState().lastRoute =
      route.routeId;

    return route;
  }

  function getProgress() {
    const state =
      ensureState();

    const stage =
      deriveStage();

    const index =
      Math.max(
        0,
        STAGES.indexOf(stage)
      );

    return {
      version:VERSION,
      stage,
      index,
      total:STAGES.length,
      completed:
        stage === 'complete',
      state:
        clone(state),
      recommended:
        routeForStage(stage)
    };
  }

  function diagnose() {
    const progress =
      getProgress();

    return {
      version:VERSION,
      stage:progress.stage,
      completed:
        progress.completed,
      currentShopId:
        getCurrentShop()
          ? getCurrentShop().id
          : null,
      cityName:
        deps.gameState
          .getCityName(),
      mode:
        progress.state.mode,
      legacyAdopted:
        progress.state
          .legacyAdopted
    };
  }

  return {
    VERSION,
    STAGES,
    ensureState,
    initialize,
    deriveStage,
    syncStage,
    getStartupRoute,
    getRecommendedRoute,
    getProgress,
    confirmCityName,
    restart,
    diagnose
  };
}

const flow =
  createFlow();

flow.createFlow =
  createFlow;

module.exports =
  flow;
