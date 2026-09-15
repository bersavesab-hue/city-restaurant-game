'use strict';

/*
 * 经营数据中枢 V1
 * 目标：统一经营口径、统一历史序列、统一页面读取。
 * 不依赖具体 UI，尽量兼容当前多个餐饮状态结构。
 */

const MAX_DAILY = 180;
const VERSION = 1;

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, num(value)));
}

function sum(list, key) {
  if (!Array.isArray(list)) return 0;
  return list.reduce((total, row) => total + num(key ? row && row[key] : row), 0);
}

function avg(list, key) {
  if (!Array.isArray(list) || list.length === 0) return 0;
  return sum(list, key) / list.length;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function round(value, digits) {
  const p = Math.pow(10, digits == null ? 2 : digits);
  return Math.round(num(value) * p) / p;
}

function ratio(numerator, denominator) {
  const d = num(denominator);
  return d === 0 ? 0 : num(numerator) / d;
}

function pctDelta(current, previous) {
  const p = num(previous);
  const c = num(current);
  if (p === 0) return c === 0 ? 0 : null;
  return (c - p) / Math.abs(p);
}

function firstDefined() {
  for (let i = 0; i < arguments.length; i++) {
    const v = arguments[i];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function getByPath(root, path) {
  let value = root;
  for (let i = 0; i < path.length; i++) {
    if (value == null) return undefined;
    value = value[path[i]];
  }
  return value;
}

function pickPath(root, paths) {
  for (let i = 0; i < paths.length; i++) {
    const value = getByPath(root, paths[i]);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function getGameSnapshot(context) {
  const ctx = context || {};
  const gameState = ctx.gameState;
  const roots = [];

  if (gameState) {
    if (typeof gameState.getState === 'function') {
      try { roots.push(gameState.getState()); } catch (e) {}
    }
    if (typeof gameState.getSnapshot === 'function') {
      try { roots.push(gameState.getSnapshot()); } catch (e) {}
    }
  }

  if (ctx.state) roots.push(ctx.state);
  if (ctx.restaurantSimulation) roots.push(ctx.restaurantSimulation);
  if (gameState && gameState.state && typeof gameState.state === 'object') roots.push(gameState.state);
  if (globalThis.Game && globalThis.Game.state) roots.push(globalThis.Game.state);
  if (globalThis.restaurantSimulation) roots.push(globalThis.restaurantSimulation);
  if (globalThis.RestaurantSimulation) roots.push(globalThis.RestaurantSimulation);
  if (globalThis.GameRuntime && globalThis.GameRuntime.state) roots.push(globalThis.GameRuntime.state);
  if (globalThis.__GAME_STATE__) roots.push(globalThis.__GAME_STATE__);

  // 新版经营模块可能只导出 getter，不直接暴露内部对象。
  // 尝试公开快照；失败则保持原状，不伪造任何数据。
  const snapshotSources = roots.slice();
  for (let i = 0; i < snapshotSources.length; i++) {
    const source = snapshotSources[i];
    if (!source || typeof source !== 'object') continue;
    const getters = ['getState', 'getSnapshot', 'getStore', 'getRestaurant', 'getPlayerRestaurant'];
    for (let j = 0; j < getters.length; j++) {
      const fn = source[getters[j]];
      if (typeof fn !== 'function') continue;
      try {
        const value = fn.call(source);
        if (value && typeof value === 'object') roots.push(value);
      } catch (e) {}
    }
  }

  let player = null;
  let world = null;
  let time = null;

  if (gameState) {
    if (typeof gameState.getPlayer === 'function') {
      try { player = gameState.getPlayer(); } catch (e) {}
    }
    if (typeof gameState.getWorld === 'function') {
      try { world = gameState.getWorld(); } catch (e) {}
    }
    if (typeof gameState.getTime === 'function') {
      try { time = gameState.getTime(); } catch (e) {}
    }
  }

  return { roots: roots.filter(Boolean), player, world, time };
}

function deepFindStoreCandidate(root, maxDepth) {
  if (!root || typeof root !== 'object') return null;
  const seen = new Set();
  const queue = [{ value: root, depth: 0 }];
  while (queue.length) {
    const item = queue.shift();
    const value = item.value;
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    const hasBusinessShape = Array.isArray(value.dailyHistory) ||
      (value.inventory && (value.menu || value.dishes || value.staff || value.employees)) ||
      ((value.rating != null || value.reputation != null) && (value.rent != null || value.monthlyRent != null) && (value.capacity != null || value.seats != null));
    if (hasBusinessShape) return value;
    if (item.depth >= (maxDepth == null ? 4 : maxDepth)) continue;
    const keys = Object.keys(value).slice(0, 80);
    for (let i = 0; i < keys.length; i++) {
      const child = value[keys[i]];
      if (child && typeof child === 'object') queue.push({ value: child, depth: item.depth + 1 });
    }
  }
  return null;
}

function resolveStore(context) {
  const snap = getGameSnapshot(context);
  const paths = [
    ['store'],
    ['restaurant'],
    ['playerRestaurant'],
    ['player', 'store'],
    ['player', 'restaurant'],
    ['operations', 'store'],
    ['operations', 'restaurant'],
    ['restaurantSimulation', 'store'],
    ['restaurantSimulation', 'playerRestaurant'],
    ['business', 'store'],
    ['business', 'restaurant'],
    ['stores', 0],
    ['restaurants', 0],
    ['player', 'stores', 0],
    ['player', 'restaurants', 0]
  ];

  for (let i = 0; i < snap.roots.length; i++) {
    const found = pickPath(snap.roots[i], paths);
    if (found && typeof found === 'object') return found;
  }

  if (snap.player) {
    const found = pickPath(snap.player, [
      ['store'], ['restaurant'], ['playerRestaurant'], ['stores', 0], ['restaurants', 0]
    ]);
    if (found && typeof found === 'object') return found;
  }

  for (let i = 0; i < snap.roots.length; i++) {
    const guessed = deepFindStoreCandidate(snap.roots[i], 4);
    if (guessed) return guessed;
  }
  return deepFindStoreCandidate(snap.player, 3);
}

function resolveStateRoot(context) {
  const snap = getGameSnapshot(context);
  return snap.roots[0] || snap.player || snap.world || null;
}

function resolveTime(context) {
  const snap = getGameSnapshot(context);
  const root = snap.roots[0] || {};
  const time = snap.time || root.time || root.date || {};
  return {
    year: num(firstDefined(time.year, root.year), 1),
    month: num(firstDefined(time.month, root.month), 1),
    day: num(firstDefined(time.day, time.date, root.date, root.day), 1),
    gameDay: num(firstDefined(root.gameDay, root.day, time.gameDay), 0)
  };
}

function dateKey(context) {
  const t = resolveTime(context);
  return [t.year, t.month, t.day, t.gameDay].join('-');
}

function ensureAnalytics(root) {
  if (!root || typeof root !== 'object') return null;
  if (!root.businessAnalytics || typeof root.businessAnalytics !== 'object') {
    root.businessAnalytics = {};
  }
  const a = root.businessAnalytics;
  a.version = VERSION;
  if (!Array.isArray(a.daily)) a.daily = [];
  if (!Array.isArray(a.cashflow)) a.cashflow = [];
  if (!Array.isArray(a.dishes)) a.dishes = [];
  if (!Array.isArray(a.inventory)) a.inventory = [];
  if (!Array.isArray(a.staff)) a.staff = [];
  if (!Array.isArray(a.capacity)) a.capacity = [];
  if (!Array.isArray(a.district)) a.district = [];
  if (!Array.isArray(a.events)) a.events = [];
  return a;
}

function normalizeDailyRecord(record, context) {
  const r = record || {};
  const store = resolveStore(context) || {};
  const root = resolveStateRoot(context) || {};

  const revenue = num(firstDefined(r.revenue, r.salesRevenue, r.turnover, r.gmv));
  const orders = num(firstDefined(r.orders, r.orderCount, r.completedOrders, r.transactions));
  const cogs = num(firstDefined(r.cogs, r.foodCost, r.ingredientCost, r.materialCost));
  const wages = num(firstDefined(r.wages, r.laborCost, r.salaryCost));
  const utilities = num(firstDefined(r.utilities, r.utilityCost, r.energyCost));
  const rent = num(firstDefined(r.rentAccrual, r.rent, r.dailyRent));
  const marketing = num(firstDefined(r.marketing, r.promo, r.promotionCost));
  const wastage = num(firstDefined(r.wastage, r.wasteCost, r.spoilageCost, r.lossCost));
  const maintenance = num(firstDefined(r.maintenance, r.maintenanceCost, r.repairCost));
  const other = num(firstDefined(r.otherCost, r.other));
  const grossProfit = revenue - cogs;
  const operatingProfit = firstDefined(r.operatingProfit, r.netProfit, r.profit);
  const profit = operatingProfit == null
    ? grossProfit - wages - utilities - rent - marketing - wastage - maintenance - other
    : num(operatingProfit);
  const potential = num(firstDefined(r.potential, r.potentialOrders, r.orderOpportunity));
  const totalDemand = num(firstDefined(r.totalDemand, r.demand, r.marketDemand));
  const capacity = num(firstDefined(r.capacityOrders, r.capacity, r.serviceCapacity, store.dailyCapacity));
  const inventoryCapacity = num(firstDefined(r.inventoryCapacity, r.stockCapacity));
  const lost = num(firstDefined(r.lost, r.lostOrders, potential > 0 ? Math.max(0, potential - orders) : 0));
  const avgTicket = num(firstDefined(r.avgTicket, r.averageOrderValue, orders > 0 ? revenue / orders : 0));
  const rating = num(firstDefined(r.rating, r.customerRating, store.rating));
  const repeatRate = num(firstDefined(r.repeat, r.repeatRate, store.repeatRate));
  const cash = num(firstDefined(r.cash, root.cash, snapCash(context)));
  const seats = num(firstDefined(r.seats, store.seats, store.capacity, store.seatCount));
  const covers = num(firstDefined(r.covers, r.guests, r.customers, orders));
  const occupancy = num(firstDefined(r.occupancyRate, r.occupancy));
  const turnover = num(firstDefined(r.turnoverRate, r.tableTurnover, seats > 0 ? covers / seats : 0));

  return {
    key: r.key || (r.day != null ? 'day-' + String(r.day) : dateKey(context)),
    timestamp: num(r.timestamp, Date.now()),
    day: num(firstDefined(r.day, root.day, resolveTime(context).gameDay)),
    revenue: round(revenue, 2),
    orders: Math.max(0, Math.round(orders)),
    avgTicket: round(avgTicket, 2),
    totalDemand: Math.max(0, Math.round(totalDemand)),
    potential: Math.max(0, Math.round(potential)),
    capacity: Math.max(0, Math.round(capacity)),
    inventoryCapacity: Math.max(0, Math.round(inventoryCapacity)),
    lost: Math.max(0, Math.round(lost)),
    lostReasons: normalizeLostReasons(r, potential, orders, capacity, inventoryCapacity),
    cogs: round(cogs, 2),
    grossProfit: round(grossProfit, 2),
    grossMargin: round(ratio(grossProfit, revenue), 4),
    wages: round(wages, 2),
    laborCostRate: round(ratio(wages, revenue), 4),
    utilities: round(utilities, 2),
    rent: round(rent, 2),
    marketing: round(marketing, 2),
    wastage: round(wastage, 2),
    maintenance: round(maintenance, 2),
    other: round(other, 2),
    profit: round(profit, 2),
    profitMargin: round(ratio(profit, revenue), 4),
    rating: round(rating, 2),
    repeatRate: round(repeatRate, 4),
    cash: round(cash, 2),
    seats: Math.max(0, Math.round(seats)),
    covers: Math.max(0, Math.round(covers)),
    occupancyRate: round(occupancy, 4),
    turnoverRate: round(turnover, 2),
    kitchenUtilization: round(num(firstDefined(r.kitchenUtilization, r.kitchenLoad)), 4),
    queueMinutes: round(num(firstDefined(r.queueMinutes, r.waitMinutes, r.avgWaitMinutes)), 1),
    source: r.source || 'runtime'
  };
}

function normalizeLostReasons(record, potential, orders, capacity, inventoryCapacity) {
  const r = record || {};
  const provided = r.lostReasons || r.lostBreakdown || {};
  const result = {
    stock: Math.max(0, Math.round(num(firstDefined(provided.stock, provided.inventory, r.stockLost, r.inventoryLost)))),
    kitchen: Math.max(0, Math.round(num(firstDefined(provided.kitchen, provided.capacity, r.kitchenLost)))),
    seats: Math.max(0, Math.round(num(firstDefined(provided.seats, provided.seating, r.seatLost)))),
    wait: Math.max(0, Math.round(num(firstDefined(provided.wait, provided.queue, r.waitLost)))),
    price: Math.max(0, Math.round(num(firstDefined(provided.price, r.priceLost)))),
    quality: Math.max(0, Math.round(num(firstDefined(provided.quality, r.qualityLost)))),
    other: Math.max(0, Math.round(num(firstDefined(provided.other, r.otherLost))))
  };

  const lost = Math.max(0, Math.round(num(firstDefined(r.lost, r.lostOrders, potential - orders))));
  let assigned = sum(Object.values(result));

  if (assigned === 0 && lost > 0) {
    if (inventoryCapacity > 0 && inventoryCapacity < potential) {
      result.stock = Math.min(lost, Math.max(0, potential - inventoryCapacity));
    }
    assigned = sum(Object.values(result));
    if (capacity > 0 && capacity < potential && assigned < lost) {
      result.kitchen = Math.min(lost - assigned, Math.max(0, potential - capacity));
    }
    assigned = sum(Object.values(result));
    if (assigned < lost) result.other = lost - assigned;
  }

  return result;
}

function snapCash(context) {
  const snap = getGameSnapshot(context);
  const root = snap.roots[0] || {};
  return firstDefined(root.cash, snap.player && snap.player.cash, 0);
}

function importLegacyHistory(context, analytics) {
  const store = resolveStore(context);
  if (!store || !Array.isArray(store.dailyHistory)) return;
  for (let i = 0; i < store.dailyHistory.length; i++) {
    const rec = normalizeDailyRecord(store.dailyHistory[i], context);
    upsertDaily(analytics, rec);
  }
}

function upsertDaily(analytics, rec) {
  if (!analytics || !rec) return;
  const idx = analytics.daily.findIndex(x => x.key === rec.key || (rec.day && x.day === rec.day));
  if (idx >= 0) analytics.daily[idx] = Object.assign({}, analytics.daily[idx], rec);
  else analytics.daily.push(rec);
  analytics.daily.sort((a, b) => num(a.day) - num(b.day) || num(a.timestamp) - num(b.timestamp));
  if (analytics.daily.length > MAX_DAILY) {
    analytics.daily.splice(0, analytics.daily.length - MAX_DAILY);
  }
}

function captureDaily(context, record) {
  const root = resolveStateRoot(context);
  if (!root) return null;
  const analytics = ensureAnalytics(root);
  importLegacyHistory(context, analytics);
  const normalized = normalizeDailyRecord(record || readCurrentRecord(context), context);
  upsertDaily(analytics, normalized);
  analytics.lastCaptureKey = normalized.key;
  analytics.lastCaptureAt = Date.now();
  return normalized;
}

function readCurrentRecord(context) {
  const store = resolveStore(context) || {};
  const h = safeArray(store.dailyHistory);
  if (h.length) return h[h.length - 1];
  const root = resolveStateRoot(context) || {};
  return firstDefined(
    root.lastBusinessResult,
    root.lastRestaurantResult,
    root.operations && root.operations.lastResult,
    {}
  );
}

function upsertSnapshot(list, key, value) {
  if (!Array.isArray(list) || !key) return;
  const row = Object.assign({ key, timestamp: Date.now() }, value || {});
  const idx = list.findIndex(x => x && x.key === key);
  if (idx >= 0) list[idx] = row;
  else list.push(row);
  if (list.length > MAX_DAILY) list.splice(0, list.length - MAX_DAILY);
}

function captureDimensionSnapshots(context, analytics, key) {
  if (!analytics) return;
  try { upsertSnapshot(analytics.district, key, getDistrictSnapshot(context)); } catch (e) {}
  try { upsertSnapshot(analytics.inventory, key, getSupplySnapshot(context)); } catch (e) {}
  try { upsertSnapshot(analytics.staff, key, getStaffSnapshot(context)); } catch (e) {}
  try { upsertSnapshot(analytics.capacity, key, getCapacitySnapshot(context)); } catch (e) {}
  try { upsertSnapshot(analytics.dishes, key, { items: getDishSnapshot(context) }); } catch (e) {}
}

function syncFromGame(context) {
  const root = resolveStateRoot(context);
  if (!root) return null;
  const analytics = ensureAnalytics(root);
  importLegacyHistory(context, analytics);
  const key = dateKey(context);
  if (analytics.lastAutoSyncKey === key) return analytics;
  const current = readCurrentRecord(context);
  if (current && Object.keys(current).length) {
    const normalized = normalizeDailyRecord(current, context);
    upsertDaily(analytics, normalized);
  }
  captureDimensionSnapshots(context, analytics, key);
  analytics.lastAutoSyncKey = key;
  return analytics;
}

function periodStats(rows) {
  const list = safeArray(rows);
  return {
    days: list.length,
    revenue: round(sum(list, 'revenue'), 2),
    orders: Math.round(sum(list, 'orders')),
    avgTicket: round(ratio(sum(list, 'revenue'), sum(list, 'orders')), 2),
    cogs: round(sum(list, 'cogs'), 2),
    grossProfit: round(sum(list, 'grossProfit'), 2),
    grossMargin: round(ratio(sum(list, 'grossProfit'), sum(list, 'revenue')), 4),
    wages: round(sum(list, 'wages'), 2),
    utilities: round(sum(list, 'utilities'), 2),
    rent: round(sum(list, 'rent'), 2),
    marketing: round(sum(list, 'marketing'), 2),
    wastage: round(sum(list, 'wastage'), 2),
    maintenance: round(sum(list, 'maintenance'), 2),
    profit: round(sum(list, 'profit'), 2),
    profitMargin: round(ratio(sum(list, 'profit'), sum(list, 'revenue')), 4),
    rating: round(avg(list, 'rating'), 2),
    repeatRate: round(avg(list, 'repeatRate'), 4),
    lost: Math.round(sum(list, 'lost')),
    potential: Math.round(sum(list, 'potential')),
    conversionRate: round(ratio(sum(list, 'orders'), sum(list, 'potential')), 4),
    cash: list.length ? num(list[list.length - 1].cash) : 0
  };
}

function buildComparison(current, previous) {
  const fields = [
    'revenue', 'orders', 'avgTicket', 'grossMargin', 'profit', 'profitMargin',
    'rating', 'repeatRate', 'lost', 'conversionRate', 'cash'
  ];
  const out = {};
  fields.forEach(key => {
    out[key] = {
      current: num(current && current[key]),
      previous: num(previous && previous[key]),
      delta: pctDelta(current && current[key], previous && previous[key])
    };
  });
  return out;
}

function getDashboard(context) {
  const root = resolveStateRoot(context);
  const analytics = root ? ensureAnalytics(root) : { daily: [] };
  if (analytics) importLegacyHistory(context, analytics);
  const rows = safeArray(analytics && analytics.daily);
  const today = rows.length ? rows[rows.length - 1] : normalizeDailyRecord({}, context);
  const yesterday = rows.length > 1 ? rows[rows.length - 2] : null;
  const last7 = rows.slice(-7);
  const prev7 = rows.slice(-14, -7);
  const last30 = rows.slice(-30);

  return {
    today,
    yesterday,
    last7: periodStats(last7),
    prev7: periodStats(prev7),
    last30: periodStats(last30),
    compareDay: buildComparison(today, yesterday || {}),
    compare7: buildComparison(periodStats(last7), periodStats(prev7)),
    pnl: getProfitLoss(today),
    funnel: getFunnel(today),
    cashflow: getCashflow(context, rows),
    alerts: buildAlerts(context, today, last7),
    trend: rows.slice(-14),
    store: getStoreSnapshot(context),
    district: getDistrictSnapshot(context),
    dishes: getDishSnapshot(context),
    supply: getSupplySnapshot(context),
    staff: getStaffSnapshot(context),
    capacity: getCapacitySnapshot(context)
  };
}

function getProfitLoss(record) {
  const r = record || {};
  const revenue = num(r.revenue);
  const cogs = num(r.cogs);
  const grossProfit = revenue - cogs;
  const operatingExpenses = num(r.wages) + num(r.utilities) + num(r.rent) + num(r.marketing) + num(r.wastage) + num(r.maintenance) + num(r.other);
  const profit = firstDefined(r.profit, grossProfit - operatingExpenses);
  return {
    revenue: round(revenue, 2),
    cogs: round(cogs, 2),
    grossProfit: round(grossProfit, 2),
    grossMargin: round(ratio(grossProfit, revenue), 4),
    wages: round(num(r.wages), 2),
    utilities: round(num(r.utilities), 2),
    rent: round(num(r.rent), 2),
    marketing: round(num(r.marketing), 2),
    wastage: round(num(r.wastage), 2),
    maintenance: round(num(r.maintenance), 2),
    other: round(num(r.other), 2),
    operatingExpenses: round(operatingExpenses, 2),
    profit: round(num(profit), 2),
    profitMargin: round(ratio(profit, revenue), 4)
  };
}

function getFunnel(record) {
  const r = record || {};
  return {
    totalDemand: Math.round(num(r.totalDemand)),
    potential: Math.round(num(r.potential)),
    capacity: Math.round(num(r.capacity)),
    inventoryCapacity: Math.round(num(r.inventoryCapacity)),
    actual: Math.round(num(r.orders)),
    lost: Math.round(num(r.lost)),
    conversionRate: round(ratio(r.orders, r.potential), 4),
    reasons: Object.assign({ stock: 0, kitchen: 0, seats: 0, wait: 0, price: 0, quality: 0, other: 0 }, r.lostReasons || {})
  };
}

function getCashflow(context, rows) {
  const list = safeArray(rows).slice(-7);
  const store = resolveStore(context) || {};
  const cash = num(snapCash(context));
  const inflow = sum(list, 'revenue');
  const operatingOutflow = list.reduce((s, r) => s + num(r.cogs) + num(r.wages) + num(r.utilities) + num(r.rent) + num(r.marketing) + num(r.wastage) + num(r.maintenance) + num(r.other), 0);
  const avgDailyOut = list.length ? operatingOutflow / list.length : 0;
  return {
    cash: round(cash, 2),
    sevenDayInflow: round(inflow, 2),
    sevenDayOperatingOutflow: round(operatingOutflow, 2),
    sevenDayNet: round(inflow - operatingOutflow, 2),
    avgDailyOutflow: round(avgDailyOut, 2),
    runwayDays: avgDailyOut > 0 ? round(cash / avgDailyOut, 1) : null,
    monthlyRent: num(firstDefined(store.rent, store.monthlyRent, store.askingMonthlyRent))
  };
}

function getDistrictSnapshot(context) {
  const ctx = context || {};
  const citySystem = ctx.citySystem;
  const demandSystem = ctx.demandSystem;
  const snap = getGameSnapshot(context);
  const world = snap.world || {};
  const store = resolveStore(context) || {};
  const districtId = firstDefined(ctx.districtId, store.districtId, store.district, world.currentDistrictId);
  let district = null;
  if (citySystem && typeof citySystem.getDistrict === 'function' && districtId) {
    try { district = citySystem.getDistrict(districtId); } catch (e) {}
  }
  district = district || {};
  let demand = num(firstDefined(district.currentDemand, district.baseDemand));
  if (demandSystem && typeof demandSystem.getTotalDemand === 'function' && districtId) {
    try { demand = demandSystem.getTotalDemand(districtId); } catch (e) {}
  }
  let customerMix = {};
  if (demandSystem && typeof demandSystem.getCustomerMix === 'function' && districtId) {
    try { customerMix = demandSystem.getCustomerMix(districtId) || {}; } catch (e) {}
  }
  if (demandSystem && typeof demandSystem.getCustomerType === 'function') {
    const named = {};
    Object.keys(customerMix).forEach(id => {
      let def = null;
      try { def = demandSystem.getCustomerType(id); } catch (e) {}
      named[def && def.name || id] = customerMix[id];
    });
    customerMix = named;
  }
  let competition = '';
  if (citySystem && typeof citySystem.getCompetitionLevel === 'function' && districtId) {
    try { competition = citySystem.getCompetitionLevel(districtId) || ''; } catch (e) {}
  }
  competition = ({ low:'低', medium:'中等', high:'高', extreme:'极高', unknown:'未评估' })[competition] || competition;
  return {
    id: districtId || '',
    name: district.name || districtId || '当前商圈',
    population: num(district.population),
    demand: Math.round(demand),
    avgSpend: num(firstDefined(district.avgSpend, district.averageSpend)),
    restaurantCount: num(district.restaurantCount),
    saturation: num(district.saturation),
    rentIndex: num(district.rentIndex),
    mealDemand: district.mealDemand || {},
    customerMix,
    competition,
    trend: district.trend || ''
  };
}

function getStoreSnapshot(context) {
  const store = resolveStore(context);
  if (!store) return null;
  const history = safeArray(store.dailyHistory);
  const last = history.length ? normalizeDailyRecord(history[history.length - 1], context) : normalizeDailyRecord({}, context);
  return {
    id: firstDefined(store.id, store.storeId, 'player-store'),
    name: firstDefined(store.name, store.storeName, '我的门店'),
    districtId: firstDefined(store.districtId, store.district),
    address: firstDefined(store.address, store.street, ''),
    area: num(firstDefined(store.area, store.usableArea, store.grossArea)),
    monthlyRent: num(firstDefined(store.rent, store.monthlyRent)),
    seats: num(firstDefined(store.seats, store.capacity, store.seatCount)),
    kitchenCapacity: num(firstDefined(store.kitchenCapacity, store.dailyKitchenCapacity, store.capacityOrders)),
    rating: num(firstDefined(store.rating, last.rating)),
    repeatRate: num(firstDefined(store.repeatRate, last.repeatRate)),
    reputation: num(firstDefined(store.reputation, store.brandScore)),
    open: firstDefined(store.open, store.isOpen, true),
    last
  };
}

function dishRowsFromState(context) {
  const store = resolveStore(context) || {};
  const root = resolveStateRoot(context) || {};
  let list = safeArray(firstDefined(store.dishes, store.menuItems, root.dishes, root.menu));
  if (!list.length && Array.isArray(store.menu)) {
    list = store.menu.map(id => ({ id, name: String(id) }));
  }
  return list;
}

function getDishSnapshot(context) {
  return dishRowsFromState(context).map(d => {
    const price = num(firstDefined(d.price, d.salePrice, d.sellingPrice));
    const cost = num(firstDefined(d.cost, d.unitCost, d.foodCost));
    const sales = num(firstDefined(d.todaySales, d.dailySales, d.sales, d.units));
    const gp = price - cost;
    return {
      id: firstDefined(d.id, d.dishId, d.name),
      name: firstDefined(d.name, d.title, '菜品'),
      price,
      cost,
      unitGrossProfit: round(gp, 2),
      grossMargin: round(ratio(gp, price), 4),
      sales: Math.round(sales),
      revenue: round(price * sales, 2),
      grossProfitContribution: round(gp * sales, 2),
      rating: num(firstDefined(d.rating, d.score)),
      lifecycle: firstDefined(d.status, d.lifecycleStage, ''),
      viral: num(firstDefined(d.viral, d.popularity, d.heat))
    };
  }).sort((a, b) => b.grossProfitContribution - a.grossProfitContribution);
}

function inventoryEntries(context) {
  const store = resolveStore(context) || {};
  const inventory = firstDefined(store.inventory, store.stock, store.stocks, {});
  if (Array.isArray(inventory)) return inventory;
  if (inventory && typeof inventory === 'object') {
    return Object.keys(inventory).map(id => Object.assign({ id }, inventory[id]));
  }
  return [];
}

function getSupplySnapshot(context) {
  const entries = inventoryEntries(context).map(item => {
    const qty = num(firstDefined(item.qty, item.quantity, item.stock));
    const unitCost = num(firstDefined(item.avgCost, item.unitCost, item.cost, item.price));
    const dailyUse = num(firstDefined(item.dailyUse, item.avgDailyUse, item.consumePerDay));
    return {
      id: firstDefined(item.id, item.ingredientId, item.name),
      name: firstDefined(item.name, item.ingredientName, item.id, '食材'),
      qty: round(qty, 2),
      unitCost: round(unitCost, 2),
      value: round(qty * unitCost, 2),
      freshness: num(firstDefined(item.freshness, item.fresh, 100)),
      quality: num(firstDefined(item.quality, item.qualityScore)),
      dailyUse: round(dailyUse, 2),
      daysCover: dailyUse > 0 ? round(qty / dailyUse, 1) : null,
      wastage: num(firstDefined(item.wastage, item.lossQty)),
      priceChange: num(firstDefined(item.priceChange, item.priceTrend))
    };
  });
  return {
    items: entries,
    inventoryValue: round(sum(entries, 'value'), 2),
    atRiskValue: round(entries.filter(x => x.freshness > 0 && x.freshness < 35).reduce((s, x) => s + x.value, 0), 2),
    lowStockCount: entries.filter(x => x.daysCover != null && x.daysCover < 1.5).length,
    staleCount: entries.filter(x => x.freshness > 0 && x.freshness < 35).length
  };
}

function getStaffSnapshot(context) {
  const store = resolveStore(context) || {};
  const staff = safeArray(firstDefined(store.staff, store.employees, store.workers));
  const dashboard = getCurrentDaily(context);
  const laborHours = staff.reduce((s, x) => s + num(firstDefined(x.hoursToday, x.hours, x.shiftHours, 8)), 0);
  const wages = dashboard ? num(dashboard.wages) : staff.reduce((s, x) => s + num(firstDefined(x.dailyWage, x.wage, x.salaryPerDay)), 0);
  return {
    headcount: staff.length,
    laborHours: round(laborHours, 1),
    wages: round(wages, 2),
    laborCostRate: round(ratio(wages, dashboard && dashboard.revenue), 4),
    revenuePerLaborHour: laborHours > 0 ? round(num(dashboard && dashboard.revenue) / laborHours, 2) : 0,
    ordersPerLaborHour: laborHours > 0 ? round(num(dashboard && dashboard.orders) / laborHours, 2) : 0,
    averageSkill: staff.length ? round(avg(staff.map(x => num(firstDefined(x.skill, x.skillScore, x.level)))), 1) : 0,
    averageMorale: staff.length ? round(avg(staff.map(x => num(firstDefined(x.morale, x.satisfaction, 70)))), 1) : 0,
    staff
  };
}

function getCapacitySnapshot(context) {
  const store = resolveStore(context) || {};
  const today = getCurrentDaily(context) || {};
  const seats = num(firstDefined(store.seats, store.capacity, store.seatCount, today.seats));
  const covers = num(firstDefined(today.covers, today.orders));
  const turnover = num(firstDefined(today.turnoverRate, seats > 0 ? covers / seats : 0));
  const kitchenCapacity = num(firstDefined(store.kitchenCapacity, today.capacity));
  const kitchenUtilization = num(firstDefined(today.kitchenUtilization, kitchenCapacity > 0 ? ratio(today.orders, kitchenCapacity) : 0));
  return {
    seats: Math.round(seats),
    covers: Math.round(covers),
    turnoverRate: round(turnover, 2),
    occupancyRate: round(num(today.occupancyRate), 4),
    kitchenCapacity: Math.round(kitchenCapacity),
    kitchenUtilization: round(kitchenUtilization, 4),
    queueMinutes: round(num(today.queueMinutes), 1),
    lostByCapacity: Math.round(num(today.lostReasons && today.lostReasons.kitchen) + num(today.lostReasons && today.lostReasons.seats) + num(today.lostReasons && today.lostReasons.wait)),
    area: num(firstDefined(store.area, store.usableArea, store.grossArea)),
    seatAreaEfficiency: num(firstDefined(store.area, store.usableArea, store.grossArea)) > 0
      ? round(seats / num(firstDefined(store.area, store.usableArea, store.grossArea)), 2)
      : 0
  };
}

function getCurrentDaily(context) {
  const root = resolveStateRoot(context);
  const analytics = root && ensureAnalytics(root);
  if (analytics) importLegacyHistory(context, analytics);
  const rows = analytics ? analytics.daily : [];
  return rows.length ? rows[rows.length - 1] : normalizeDailyRecord(readCurrentRecord(context), context);
}

function getHistory(context, domain, days) {
  const root = resolveStateRoot(context);
  const analytics = root && ensureAnalytics(root);
  if (!analytics) return [];
  const key = domain === 'daily' ? 'daily' : domain;
  const rows = safeArray(analytics[key]);
  return rows.slice(-(days == null ? 14 : Math.max(1, days)));
}

function buildAlerts(context, today, last7) {
  const alerts = [];
  const supply = getSupplySnapshot(context);
  const capacity = getCapacitySnapshot(context);
  const pnl = getProfitLoss(today);
  const last7Stats = periodStats(last7);

  if (pnl.revenue > 0 && pnl.grossMargin < 0.45) {
    alerts.push({ level: 'danger', code: 'LOW_GROSS_MARGIN', title: '毛利率偏低', detail: '售价或食材成本正在挤压利润，优先检查菜品单份成本。' });
  }
  if (pnl.revenue > 0 && pnl.profitMargin < 0.08) {
    alerts.push({ level: 'danger', code: 'LOW_NET_MARGIN', title: '经营利润率偏低', detail: '收入看起来不差，但人工、租金或损耗可能过高。' });
  }
  if (today.potential > 0 && ratio(today.lost, today.potential) > 0.12) {
    alerts.push({ level: 'warn', code: 'HIGH_LOST_ORDERS', title: '流失订单过多', detail: '潜在客流没有完全转化，检查缺货、厨房、餐位和等待时间。' });
  }
  if (supply.lowStockCount > 0) {
    alerts.push({ level: 'warn', code: 'LOW_STOCK', title: '存在低库存食材', detail: supply.lowStockCount + '项食材预计不足1.5天。' });
  }
  if (supply.staleCount > 0) {
    alerts.push({ level: 'warn', code: 'STALE_STOCK', title: '库存新鲜度风险', detail: supply.staleCount + '项库存新鲜度偏低，可能形成损耗。' });
  }
  if (capacity.kitchenUtilization > 0.92) {
    alerts.push({ level: 'warn', code: 'KITCHEN_BOTTLENECK', title: '厨房接近满负荷', detail: '继续加客流前应先提升后厨产能，否则新增流量会转化为排队和差评。' });
  }
  if (last7Stats.days >= 4 && last7Stats.profit < 0) {
    alerts.push({ level: 'danger', code: 'WEEKLY_LOSS', title: '近7日累计亏损', detail: '需要从毛利、人工、房租与损耗拆解亏损来源。' });
  }
  return alerts.slice(0, 6);
}

function hasStore(context) {
  return !!resolveStore(context);
}

module.exports = {
  VERSION,
  ensureAnalytics,
  syncFromGame,
  captureDaily,
  normalizeDailyRecord,
  periodStats,
  buildComparison,
  getDashboard,
  getProfitLoss,
  getFunnel,
  getCashflow,
  getDistrictSnapshot,
  getStoreSnapshot,
  getDishSnapshot,
  getSupplySnapshot,
  getStaffSnapshot,
  getCapacitySnapshot,
  getCurrentDaily,
  getHistory,
  buildAlerts,
  hasStore,
  resolveStore,
  resolveStateRoot,
  helpers: { num, round, ratio, pctDelta, sum, avg, clamp }
};
