'use strict';

const gameState =
  require('./gameState.js');

const newGameFlow =
  require('./newGameFlowV0814.js');

const gameplayFlow =
  require('./gameplayFlowCoordinatorV0836.js');

const VERSION =
  '0.8.37';

const ALWAYS_ALLOWED =
  Object.freeze([
    'newGame',
    'system',
    'featureHub'
  ]);

const NO_SHOP_ALLOWED =
  Object.freeze([
    'city',
    'district',
    'propertyMarket',
    'dynamicWorld'
  ]);

const SHOP_REQUIRED =
  Object.freeze([
    'shop',
    'renovation',
    'equipment',
    'license',
    'staff',
    'schedule',
    'staffCareer',
    'research',
    'supply',
    'business'
  ]);

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function createPolicy(options) {
  const opts =
    options ||
    {};

  const deps = {
    gameState:
      opts.gameState ||
      gameState,
    newGameFlow:
      opts.newGameFlow ||
      newGameFlow,
    gameplayFlow:
      opts.gameplayFlow ||
      gameplayFlow
  };

  function currentShop() {
    if (
      deps.gameplayFlow &&
      typeof deps.gameplayFlow
        .currentShop ===
        'function'
    ) {
      return deps.gameplayFlow
        .currentShop();
    }

    const business =
      deps.gameState
        .getBusiness();

    return (
      business.shops ||
      []
    ).find(
      item =>
        item.id ===
        business.currentShopId
    ) || null;
  }

  function progress() {
    if (
      deps.newGameFlow &&
      typeof deps.newGameFlow
        .getProgress ===
        'function'
    ) {
      return deps.newGameFlow
        .getProgress();
    }

    return {
      stage:
        currentShop()
          ? 'complete'
          : 'property_search',
      completed:
        !!currentShop()
    };
  }

  function evaluate(
    routeId,
    params
  ) {
    const id =
      String(
        routeId ||
        ''
      );

    const flow =
      progress();

    const shop =
      currentShop();

    const recommended =
      deps.gameplayFlow &&
      typeof deps.gameplayFlow
        .recommendedRoute ===
        'function'
        ? deps.gameplayFlow
            .recommendedRoute()
        : {
            routeId:
              shop
                ? 'shop'
                : 'city',
            params:{}
          };

    if (
      ALWAYS_ALLOWED.includes(
        id
      )
    ) {
      return {
        allowed:true,
        routeId:id,
        state:'available',
        reason:null,
        recommended:
          clone(recommended)
      };
    }

    if (
      flow.stage ===
      'city_setup'
    ) {
      return {
        allowed:false,
        routeId:id,
        state:'blocked',
        reason:
          '请先完成创业城市确认',
        code:
          'CITY_SETUP_REQUIRED',
        recommended:{
          routeId:'newGame',
          params:{}
        }
      };
    }

    if (!shop) {
      const allowed =
        NO_SHOP_ALLOWED.includes(
          id
        );

      return {
        allowed,
        routeId:id,
        state:
          allowed
            ? 'available'
            : 'blocked',
        reason:
          allowed
            ? null
            : '需要先签下首家门店',
        code:
          allowed
            ? null
            : 'SHOP_REQUIRED',
        recommended:
          clone(recommended)
      };
    }

    if (
      SHOP_REQUIRED.includes(
        id
      ) ||
      NO_SHOP_ALLOWED.includes(
        id
      )
    ) {
      return {
        allowed:true,
        routeId:id,
        state:'available',
        reason:null,
        recommended:
          clone(recommended)
      };
    }

    return {
      allowed:true,
      routeId:id,
      state:'available',
      reason:null,
      recommended:
        clone(recommended)
    };
  }

  function guard(
    routeId,
    params
  ) {
    return evaluate(
      routeId,
      params
    );
  }

  function list(
    routeIds
  ) {
    return (
      routeIds ||
      []
    ).map(
      route => {
        const id =
          typeof route ===
            'string'
            ? route
            : route.id;

        return {
          ...(
            typeof route ===
            'object'
              ? clone(route)
              : {
                  id
                }
          ),
          access:
            evaluate(
              id,
              {}
            )
        };
      }
    );
  }

  function available(
    routeIds
  ) {
    return list(
      routeIds
    ).filter(
      item =>
        item.access.allowed
    );
  }

  function blocked(
    routeIds
  ) {
    return list(
      routeIds
    ).filter(
      item =>
        !item.access.allowed
    );
  }

  function diagnose(
    routeIds
  ) {
    const rows =
      list(
        routeIds
      );

    return {
      version:VERSION,
      stage:
        progress().stage,
      currentShopId:
        currentShop()
          ? currentShop().id
          : null,
      available:
        rows.filter(
          item =>
            item.access.allowed
        ).length,
      blocked:
        rows.filter(
          item =>
            !item.access.allowed
        ).length,
      rows
    };
  }

  return {
    VERSION,
    ALWAYS_ALLOWED,
    NO_SHOP_ALLOWED,
    SHOP_REQUIRED,
    currentShop,
    progress,
    evaluate,
    guard,
    list,
    available,
    blocked,
    diagnose
  };
}

const policy =
  createPolicy();

policy.createPolicy =
  createPolicy;

module.exports =
  policy;
