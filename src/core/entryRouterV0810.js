'use strict';

const sceneManager =
  require('./sceneManager.js');

const VERSION = '0.8.10';
const HISTORY_LIMIT = 32;

const ROUTES = Object.freeze({
  city:          { target: 'city',          label: '城市' },
  shop:          { target: 'shop',          label: '门店' },
  district:      { target: 'district',      label: '商圈' },
  propertyMarket:{ target: 'propertyMarket',label: '找铺' },
  renovation:    { target: 'renovation',    label: '装修' },
  equipment:     { target: 'equipment',     label: '设备' },
  license:       { target: 'license',       label: '证照' },
  staff:         { target: 'staff',         label: '员工' },
  schedule:      { target: 'schedule',      label: '营业排班' },
  staffCareer:   { target: 'staffCareer',   label: '团队成长' },
  research:      { target: 'research',      label: '菜单研发' },
  supply:        { target: 'supply',        label: '供应链' },
  business:      { target: 'business',      label: '经营数据' },
  dynamicWorld:  { target: 'dynamicWorld',  label: '城市动态' },
  system:        { target: 'system',        label: '系统' },
  featureHub:    { target: 'featureHub',    label: '功能中心' }
});

const ALIASES = Object.freeze({
  store: 'shop',
  operation: 'shop',
  operations: 'shop',
  menu: 'research',
  dishes: 'research',
  purchase: 'supply',
  procurement: 'supply',
  employees: 'staff',
  team: 'staffCareer',
  finance: 'business',
  data: 'business',
  world: 'dynamicWorld',
  settings: 'system',
  hub: 'featureHub'
});

let installed = false;
let rawSwitchTo = null;
let history = [];
let rememberedParams = Object.create(null);
let lastError = null;
let currentRouteId = null;
let routeGuard = null;

function cloneParams(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const out = {};

  Object.keys(value).forEach(key => {
    const v = value[key];

    if (
      v === null ||
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean'
    ) {
      out[key] = v;
    }
  });

  return out;
}

function resolve(routeId) {
  const original = String(routeId || '').trim();

  if (!original) {
    return null;
  }

  const canonical = ALIASES[original] || original;
  const route = ROUTES[canonical];

  if (route) {
    return {
      id: canonical,
      target: route.target,
      label: route.label
    };
  }

  // Legacy compatibility: an already-registered scene can still be opened,
  // while going through the same router/history/error path.
  if (sceneManager.has(canonical)) {
    return {
      id: canonical,
      target: canonical,
      label: canonical
    };
  }

  return null;
}

function remember(routeId, params) {
  const clean = cloneParams(params);

  if (Object.keys(clean).length) {
    rememberedParams[routeId] = clean;
  }
}

function mergedParams(routeId, params) {
  return Object.assign(
    {},
    rememberedParams[routeId] || {},
    cloneParams(params)
  );
}

function pushHistory(routeId, params) {
  if (!routeId) return;

  const last = history[history.length - 1];
  const clean = cloneParams(params);

  if (
    last &&
    last.routeId === routeId &&
    JSON.stringify(last.params) === JSON.stringify(clean)
  ) {
    return;
  }

  history.push({
    routeId,
    params: clean
  });

  if (history.length > HISTORY_LIMIT) {
    history = history.slice(-HISTORY_LIMIT);
  }
}

function open(routeId, params, options) {
  const opts = options || {};
  const resolved = resolve(routeId);

  if (!resolved) {
    lastError = {
      code: 'ROUTE_NOT_FOUND',
      routeId: String(routeId || ''),
      at: Date.now()
    };
    return false;
  }

  if (!sceneManager.has(resolved.target)) {
    lastError = {
      code: 'SCENE_NOT_REGISTERED',
      routeId: resolved.id,
      target: resolved.target,
      at: Date.now()
    };
    return false;
  }

  if (
    !opts.ignoreGuard &&
    routeGuard
  ) {
    const access =
      getGuardStatus(
        resolved.id,
        params
      );

    if (
      !access.allowed
    ) {
      lastError = {
        code:'ROUTE_BLOCKED',
        guardCode:
          access.code ||
          'ROUTE_BLOCKED',
        routeId:
          resolved.id,
        target:
          resolved.target,
        reason:
          access.reason ||
          '该功能当前不可用',
        recommended:
          access.recommended ||
          null,
        at:Date.now()
      };

      return false;
    }
  }

  const payload = mergedParams(resolved.id, params);
  const previousRoute = currentRouteId || sceneManager.getCurrentId();
  const previousParams = previousRoute
    ? cloneParams(rememberedParams[previousRoute] || {})
    : {};

  if (
    !opts.fromBack &&
    !opts.replaceHistory &&
    previousRoute &&
    previousRoute !== resolved.id
  ) {
    pushHistory(previousRoute, previousParams);
  }

  const ok = rawSwitchTo
    ? rawSwitchTo(resolved.target, payload)
    : false;

  if (!ok) {
    lastError = {
      code: 'SCENE_SWITCH_FAILED',
      routeId: resolved.id,
      target: resolved.target,
      at: Date.now()
    };
    return false;
  }

  currentRouteId = resolved.id;
  remember(resolved.id, payload);
  lastError = null;

  return true;
}

function back() {
  while (history.length) {
    const previous = history.pop();

    if (
      previous &&
      previous.routeId &&
      open(
        previous.routeId,
        previous.params,
        {
          fromBack: true,
          replaceHistory: true
        }
      )
    ) {
      return true;
    }
  }

  return false;
}

function install() {
  if (installed) {
    return true;
  }

  if (
    !sceneManager ||
    typeof sceneManager.switchTo !== 'function'
  ) {
    lastError = {
      code: 'SCENE_MANAGER_INVALID',
      at: Date.now()
    };
    return false;
  }

  rawSwitchTo = sceneManager.switchTo.bind(sceneManager);

  sceneManager.switchTo = function (routeId, payload) {
    return open(
      routeId,
      payload,
      {
        source: 'sceneManager'
      }
    );
  };

  sceneManager.back = function () {
    return back();
  };

  installed = true;
  return true;
}

function setGuard(guard) {
  routeGuard =
    typeof guard ===
    'function'
      ? guard
      : null;

  return !!routeGuard;
}

function getGuardStatus(
  routeId,
  params
) {
  const resolved =
    resolve(
      routeId
    );

  if (!resolved) {
    return {
      allowed:false,
      code:'ROUTE_NOT_FOUND',
      routeId:
        String(
          routeId ||
          ''
        ),
      reason:'入口不存在'
    };
  }

  if (!routeGuard) {
    return {
      allowed:true,
      routeId:
        resolved.id
    };
  }

  try {
    const result =
      routeGuard(
        resolved.id,
        cloneParams(
          params
        )
      );

    if (
      result ===
      false
    ) {
      return {
        allowed:false,
        routeId:
          resolved.id,
        code:'ROUTE_BLOCKED',
        reason:
          '该功能当前不可用'
      };
    }

    if (
      result ===
      true ||
      result == null
    ) {
      return {
        allowed:true,
        routeId:
          resolved.id
      };
    }

    if (
      typeof result ===
      'object'
    ) {
      return {
        routeId:
          resolved.id,
        allowed:
          result.allowed !==
          false,
        ...result
      };
    }

    return {
      allowed:true,
      routeId:
        resolved.id
    };
  } catch (error) {
    return {
      allowed:false,
      routeId:
        resolved.id,
      code:'ROUTE_GUARD_ERROR',
      reason:
        error &&
        error.message ||
        '入口权限检查异常'
    };
  }
}

function listRoutes() {
  return Object.keys(ROUTES).map(id => ({
    id,
    target: ROUTES[id].target,
    label: ROUTES[id].label
  }));
}

function getHistory() {
  return history.map(item => ({
    routeId: item.routeId,
    params: cloneParams(item.params)
  }));
}

function getCurrentRoute() {
  return currentRouteId || sceneManager.getCurrentId();
}

function getLastError() {
  return lastError
    ? Object.assign({}, lastError)
    : null;
}

function diagnose() {
  const missing = [];

  Object.keys(ROUTES).forEach(id => {
    if (!sceneManager.has(ROUTES[id].target)) {
      missing.push({
        routeId: id,
        target: ROUTES[id].target
      });
    }
  });

  return {
    version: VERSION,
    installed,
    currentRouteId: getCurrentRoute(),
    historyDepth: history.length,
    routeCount: Object.keys(ROUTES).length,
    guardInstalled:
      !!routeGuard,
    missing
  };
}

function resetForTests() {
  history = [];
  rememberedParams = Object.create(null);
  lastError = null;
  currentRouteId = null;
  routeGuard = null;
}

module.exports = {
  VERSION,
  HISTORY_LIMIT,
  ROUTES,
  ALIASES,
  install,
  open,
  back,
  resolve,
  setGuard,
  getGuardStatus,
  listRoutes,
  getHistory,
  getCurrentRoute,
  getLastError,
  diagnose,
  resetForTests
};
