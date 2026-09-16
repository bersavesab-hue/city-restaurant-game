'use strict';

/**
 * 统一评级与可视化底层 V104
 *
 * 设计原则：
 * 1. 所有对象统一落到 0~100 连续分，评级只是展示层。
 * 2. 员工：能力 Lv.1~50 + 职业段位；不覆盖原有岗位/职级。
 * 3. 菜品/门店/品牌：D/C/B/A/S 五档，不制造 SSS 数值膨胀。
 * 4. 门店经营评级与消费者 5 星口碑分离。
 * 5. 结果始终携带维度、优势、短板、变化方向，可被排行榜/奖项复用。
 * 6. 优先消费已有真实经营字段；缺失字段使用中性基线，不把缺失当作 0 分。
 */

const VERSION = 104;
const NEUTRAL = 65;

const GRADE_BANDS = [
  { min: 90, grade: 'S', label: '标杆' },
  { min: 80, grade: 'A', label: '优秀' },
  { min: 70, grade: 'B', label: '良好' },
  { min: 60, grade: 'C', label: '合格' },
  { min: 0, grade: 'D', label: '待改进' }
];

const EMPLOYEE_TIERS = [
  { min: 47, max: 50, name: '大师' },
  { min: 40, max: 46, name: '专家' },
  { min: 30, max: 39, name: '资深' },
  { min: 20, max: 29, name: '骨干' },
  { min: 10, max: 19, name: '熟练' },
  { min: 1, max: 9, name: '新手' }
];

const BRAND_TIERS = [
  { min: 19, max: 20, name: '行业标杆' },
  { min: 16, max: 18, name: '区域品牌' },
  { min: 12, max: 15, name: '城市品牌' },
  { min: 8, max: 11, name: '商圈名店' },
  { min: 4, max: 7, name: '社区口碑' },
  { min: 1, max: 3, name: '初创品牌' }
];

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, num(value)));
}

function round(value, digits) {
  const p = Math.pow(10, digits == null ? 1 : digits);
  return Math.round(num(value) * p) / p;
}

function firstDefined() {
  for (let i = 0; i < arguments.length; i++) {
    const value = arguments[i];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function mean(values, fallback) {
  const list = safeArray(values).map(Number).filter(Number.isFinite);
  if (!list.length) return fallback == null ? NEUTRAL : fallback;
  return list.reduce((sum, value) => sum + value, 0) / list.length;
}

function scoreValue(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback == null ? NEUTRAL : clamp(fallback, 0, 100);
  }
  return clamp(value, 0, 100);
}

function ratioScore(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback == null ? NEUTRAL : clamp(fallback, 0, 100);
  }
  const n = num(value);
  if (n >= 0 && n <= 1.2) return clamp(n * 100, 0, 100);
  return clamp(n, 0, 100);
}

function starScore(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback == null ? NEUTRAL : clamp(fallback, 0, 100);
  }
  const n = num(value);
  if (n >= 0 && n <= 5.2) return clamp(n * 20, 0, 100);
  return clamp(n, 0, 100);
}

function inverseMinutes(minutes, good, bad, fallback) {
  const raw = Number(minutes);
  if (!Number.isFinite(raw)) return fallback == null ? NEUTRAL : fallback;
  if (raw <= good) return 95;
  if (raw >= bad) return 30;
  return round(95 - ((raw - good) / Math.max(1, bad - good)) * 65, 1);
}

function rangeScore(value, low, high, fallback) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return fallback == null ? NEUTRAL : fallback;
  if (high <= low) return NEUTRAL;
  return clamp(((raw - low) / (high - low)) * 100, 0, 100);
}

function gradeForScore(score) {
  const s = clamp(score, 0, 100);
  return GRADE_BANDS.find(row => s >= row.min) || GRADE_BANDS[GRADE_BANDS.length - 1];
}

function levelFromScore(score, maxLevel) {
  const max = Math.max(2, Math.round(maxLevel || 50));
  return clamp(1 + Math.floor(clamp(score, 0, 100) / 100 * (max - 1)), 1, max);
}

function tierForLevel(level, table) {
  const l = Math.max(1, Math.round(num(level, 1)));
  const rows = table || EMPLOYEE_TIERS;
  const hit = rows.find(row => l >= row.min && l <= row.max);
  return hit ? hit.name : rows[rows.length - 1].name;
}

function weightedScore(dimensions, weights) {
  const dims = dimensions || {};
  const w = weights || {};
  let total = 0;
  let weightTotal = 0;
  Object.keys(w).forEach(key => {
    const weight = Math.max(0, num(w[key]));
    if (!weight) return;
    total += scoreValue(dims[key], NEUTRAL) * weight;
    weightTotal += weight;
  });
  if (!weightTotal) return NEUTRAL;
  return round(total / weightTotal, 1);
}

function dimensionList(dimensions, labels) {
  return Object.keys(dimensions || {}).map(key => ({
    key,
    label: labels && labels[key] || key,
    score: round(scoreValue(dimensions[key]), 1)
  }));
}

function insights(dimensions, labels) {
  const rows = dimensionList(dimensions, labels).sort((a, b) => b.score - a.score);
  return {
    strengths: rows.slice(0, Math.min(2, rows.length)),
    weaknesses: rows.slice().reverse().slice(0, Math.min(2, rows.length))
  };
}

function trendMeta(currentScore, previousScore) {
  if (previousScore === undefined || previousScore === null || !Number.isFinite(Number(previousScore))) {
    return { previousScore: null, delta: null, direction: 'flat', label: '暂无对比' };
  }
  const previous = round(clamp(previousScore, 0, 100), 1);
  const delta = round(clamp(currentScore, 0, 100) - previous, 1);
  const direction = delta > 0.4 ? 'up' : delta < -0.4 ? 'down' : 'flat';
  return {
    previousScore: previous,
    delta,
    direction,
    label: direction === 'up' ? '上升' : direction === 'down' ? '下降' : '持平'
  };
}

function finalize(type, score, dimensions, labels, previousScore, extra) {
  const normalized = round(clamp(score, 0, 100), 1);
  const band = gradeForScore(normalized);
  const trend = trendMeta(normalized, previousScore);
  const insight = insights(dimensions, labels);
  return Object.assign({
    version: VERSION,
    type,
    score: normalized,
    grade: band.grade,
    gradeLabel: band.label,
    dimensions: dimensionList(dimensions, labels),
    strengths: insight.strengths,
    weaknesses: insight.weaknesses,
    previousScore: trend.previousScore,
    delta: trend.delta,
    direction: trend.direction,
    trendLabel: trend.label
  }, extra || {});
}

function employeeWeights(roleText) {
  const role = String(roleText || '').toLowerCase();
  if (/厨|kitchen|chef|cook/.test(role)) {
    return { skill: 0.30, speed: 0.22, service: 0.05, stability: 0.18, learning: 0.12, stamina: 0.13 };
  }
  if (/店长|经理|manager|supervisor/.test(role)) {
    return { skill: 0.14, speed: 0.10, service: 0.22, stability: 0.22, learning: 0.18, stamina: 0.14 };
  }
  if (/服务|wait|server|cashier|收银/.test(role)) {
    return { skill: 0.12, speed: 0.21, service: 0.27, stability: 0.17, learning: 0.10, stamina: 0.13 };
  }
  return { skill: 0.20, speed: 0.16, service: 0.16, stability: 0.18, learning: 0.15, stamina: 0.15 };
}

function evaluateEmployee(employee, options) {
  const row = employee || {};
  const opts = options || {};
  const role = firstDefined(opts.roleId, row.roleId, row.role, row.position, row.title, 'employee');
  const perf = scoreValue(firstDefined(row.performance, row.performanceScore), NEUTRAL);
  const skill = scoreValue(firstDefined(row.skill, row.skillScore, row.craft, row.cookingSkill), perf);
  const speed = scoreValue(firstDefined(row.speed, row.efficiency, row.serviceSpeed, row.workSpeed), perf);
  const service = scoreValue(firstDefined(row.service, row.serviceScore, row.communication, row.customerService), mean([perf, scoreValue(row.mood, 70)], NEUTRAL));
  const stability = scoreValue(firstDefined(row.stability, row.reliability, row.loyalty), row.turnoverRisk != null ? 100 - clamp(row.turnoverRisk, 0, 100) : NEUTRAL);
  const learning = scoreValue(firstDefined(row.learning, row.learningAbility, row.growth, row.potential), mean([skill, perf], NEUTRAL));
  const stamina = scoreValue(firstDefined(row.stamina, row.energy, row.physical, row.endurance), 72);
  const dimensions = { skill, speed, service, stability, learning, stamina };
  const labels = { skill: '专业', speed: '速度', service: '服务', stability: '稳定', learning: '学习', stamina: '体力' };
  const score = weightedScore(dimensions, employeeWeights(role));
  const growthLevel = levelFromScore(score, 50);
  const tier = tierForLevel(growthLevel, EMPLOYEE_TIERS);
  const previous = firstDefined(opts.previousScore, row.previousAbilityScore, row.previousRatingScore);
  return finalize('employee', score, dimensions, labels, previous, {
    id: firstDefined(row.id, row.employeeId, row.name),
    name: firstDefined(row.name, '员工'),
    role: String(role),
    growthLevel,
    levelMax: 50,
    tier,
    display: 'Lv.' + growthLevel + ' · ' + tier
  });
}

function dishRatingScore(value) {
  if (value === undefined || value === null || value === '') return NEUTRAL;
  const n = Number(value);
  if (!Number.isFinite(n)) return NEUTRAL;
  return n <= 5.2 ? starScore(n) : scoreValue(n);
}

function evaluateDish(dish, options) {
  const row = dish || {};
  const opts = options || {};
  const price = num(firstDefined(row.listPrice, row.price, row.salePrice, row.sellingPrice));
  const cost = num(firstDefined(opts.cost, row.cost, row.unitCost, row.foodCost));
  const margin = price > 0 ? (price - cost) / price : firstDefined(row.grossMargin, row.marginRate);
  const custom = row.customDish && typeof row.customDish === 'object' ? row.customDish : null;
  const taste = dishRatingScore(firstDefined(row.taste, row.tasteScore, row.quality, row.qualityScore, row.rating, row.score, custom && custom.score));
  const appearance = scoreValue(firstDefined(row.appearance, row.presentation, row.plating, row.visualScore, custom && custom.appearance), 64);
  const costControl = rangeScore(margin, 0.18, 0.72, 62);
  const cookMinutes = firstDefined(row.cookMinutes, row.cookTime, row.prepMinutes, row.preparationMinutes, custom && custom.variant && custom.variant.cookMinutes);
  const speed = cookMinutes != null ? inverseMinutes(cookMinutes, 5, 24, 62) : scoreValue(firstDefined(row.speed, row.speedScore), 62);
  const repeat = firstDefined(row.repeatRate, row.repurchaseRate, custom && custom.repeatRate);
  const repeatAppeal = repeat != null
    ? ratioScore(repeat, 65)
    : scoreValue(firstDefined(row.viral, row.popularity, row.heat, row.appeal, custom && custom.popularity), 65);
  const availability = firstDefined(opts.craftable, row.craftable, row.availableServings);
  const consistency = scoreValue(firstDefined(row.consistency, row.standardization, row.reliability, custom && custom.consistency), availability != null ? (num(availability) > 0 ? 72 : 45) : 68);
  const dimensions = { taste, appearance, costControl, speed, repeatAppeal, consistency };
  const labels = { taste: '口味', appearance: '卖相', costControl: '成本', speed: '出餐', repeatAppeal: '复购', consistency: '稳定' };
  let score = weightedScore(dimensions, {
    taste: 0.30,
    repeatAppeal: 0.20,
    costControl: 0.15,
    speed: 0.12,
    appearance: 0.10,
    consistency: 0.13
  });
  if (row.active === false) score = Math.min(score, 78);
  const previous = firstDefined(opts.previousScore, row.previousDishScore, row.previousRatingScore);
  return finalize('dish', score, dimensions, labels, previous, {
    id: firstDefined(row.id, row.dishId, row.name),
    name: firstDefined(row.name, row.title, '菜品'),
    price: round(price, 2),
    cost: round(cost, 2),
    grossMargin: margin == null ? null : round(num(margin), 4)
  });
}

function averageDishScore(dishes) {
  const rows = safeArray(dishes);
  if (!rows.length) return null;
  return mean(rows.map(row => evaluateDish(row).score), NEUTRAL);
}

function consumerStars(value, fallbackScore) {
  const raw = Number(value);
  if (Number.isFinite(raw) && raw > 0) {
    return round(raw <= 5.2 ? clamp(raw, 1, 5) : clamp(raw / 20, 1, 5), 2);
  }
  return round(clamp(num(fallbackScore, NEUTRAL) / 20, 1, 5), 2);
}

function evaluateStore(store, options) {
  const row = store || {};
  const opts = options || {};
  const dishes = safeArray(firstDefined(opts.dishes, row.dishes, row.menu));
  const staff = safeArray(firstDefined(opts.staff, row.staff, row.employees));
  const dishFromRows = averageDishScore(dishes);
  const customerRating = firstDefined(opts.customerRating, row.customerRating, row.rating);
  const customerScore = customerRating != null ? starScore(customerRating, NEUTRAL) : NEUTRAL;
  const dishQuality = scoreValue(firstDefined(row.dishQuality, row.foodQuality, dishFromRows), customerScore);
  const staffScore = staff.length ? mean(staff.map(item => evaluateEmployee(item).score), NEUTRAL) : null;
  const service = scoreValue(firstDefined(row.service, row.serviceScore, staffScore), customerScore);
  const environment = scoreValue(firstDefined(row.environment, row.environmentScore, row.ambience, row.renovationScore), 67);
  const hygiene = scoreValue(firstDefined(row.hygiene, row.hygieneScore, row.cleanliness, row.foodSafetyScore), 75);
  const repeatRate = firstDefined(opts.repeatRate, row.repeatRate);
  const value = scoreValue(firstDefined(row.valueScore, row.valueForMoney), repeatRate != null ? ratioScore(repeatRate, 67) : customerScore);
  const queueMinutes = firstDefined(opts.queueMinutes, row.queueMinutes, row.waitMinutes, row.avgWaitMinutes);
  const waiting = scoreValue(firstDefined(row.waitingScore, row.queueScore), queueMinutes != null ? inverseMinutes(queueMinutes, 3, 24, 68) : 68);
  const dimensions = { dishQuality, service, environment, hygiene, value, waiting };
  const labels = { dishQuality: '菜品', service: '服务', environment: '环境', hygiene: '卫生', value: '性价比', waiting: '等位' };
  const score = weightedScore(dimensions, {
    dishQuality: 0.25,
    service: 0.18,
    environment: 0.14,
    hygiene: 0.15,
    value: 0.14,
    waiting: 0.14
  });
  const previous = firstDefined(opts.previousScore, row.previousOperatingScore, row.previousRatingScore);
  return finalize('store', score, dimensions, labels, previous, {
    id: firstDefined(row.id, row.storeId, row.name),
    name: firstDefined(row.name, row.storeName, '门店'),
    consumerStars: consumerStars(customerRating, score),
    ratingMode: '经营评级 + 消费者口碑双轨'
  });
}

function evaluateStoreFromDashboard(dashboard, options) {
  const d = dashboard || {};
  const opts = options || {};
  const today = d.today || {};
  const store = d.store || {};
  const dishRows = safeArray(d.dishes);
  const staffRows = d.staff && safeArray(d.staff.staff);
  const supplyRows = d.supply && safeArray(d.supply.items);
  const dishScores = dishRows.map(item => evaluateDish(item).score);
  const dishQuality = dishScores.length ? mean(dishScores, NEUTRAL) : starScore(today.rating, 68);
  const avgSkill = d.staff ? scoreValue(d.staff.averageSkill, 65) : 65;
  const avgMorale = d.staff ? scoreValue(d.staff.averageMorale, 68) : 68;
  const service = mean([avgSkill, avgMorale, starScore(today.rating, 68)], 68);
  const environment = scoreValue(firstDefined(store.environment, store.environmentScore, store.renovationScore), 68);
  const supplyFreshness = supplyRows.length ? mean(supplyRows.map(item => scoreValue(item.freshness, 75)), 75) : 75;
  const hygiene = scoreValue(firstDefined(store.hygiene, store.hygieneScore, store.cleanliness), supplyFreshness);
  const repeatScore = today.repeatRate != null ? ratioScore(today.repeatRate, 68) : 68;
  const marginScore = today.grossMargin != null ? rangeScore(today.grossMargin, 0.30, 0.68, 65) : 65;
  const value = mean([repeatScore, marginScore, starScore(today.rating, 68)], 68);
  const queue = d.capacity && d.capacity.queueMinutes != null ? d.capacity.queueMinutes : today.queueMinutes;
  const waiting = inverseMinutes(queue, 3, 24, 70);
  const dimensions = { dishQuality, service, environment, hygiene, value, waiting };
  const labels = { dishQuality: '菜品', service: '服务', environment: '环境', hygiene: '卫生', value: '性价比', waiting: '等位' };
  const score = weightedScore(dimensions, {
    dishQuality: 0.25,
    service: 0.18,
    environment: 0.14,
    hygiene: 0.15,
    value: 0.14,
    waiting: 0.14
  });

  let previousScore = firstDefined(opts.previousScore, store.previousOperatingScore);
  if (previousScore == null && d.yesterday) {
    const y = d.yesterday;
    const yRating = starScore(y.rating, dishQuality);
    const yRepeat = y.repeatRate != null ? ratioScore(y.repeatRate, value) : value;
    const yMargin = y.grossMargin != null ? rangeScore(y.grossMargin, 0.30, 0.68, marginScore) : marginScore;
    const yWaiting = inverseMinutes(y.queueMinutes, 3, 24, waiting);
    previousScore = weightedScore({
      dishQuality: yRating,
      service: mean([service, yRating], service),
      environment,
      hygiene,
      value: mean([yRepeat, yMargin, yRating], value),
      waiting: yWaiting
    }, {
      dishQuality: 0.25,
      service: 0.18,
      environment: 0.14,
      hygiene: 0.15,
      value: 0.14,
      waiting: 0.14
    });
  }

  return finalize('store', score, dimensions, labels, previousScore, {
    id: firstDefined(store.id, store.storeId, store.name),
    name: firstDefined(store.name, store.storeName, '门店'),
    consumerStars: consumerStars(today.rating || store.rating, score),
    ratingMode: '经营评级 + 消费者口碑双轨'
  });
}

function storeConsistencyScore(stores) {
  const rows = safeArray(stores);
  if (rows.length <= 1) return 72;
  const scores = rows.map(row => {
    if (row && Number.isFinite(Number(row.score))) return clamp(row.score, 0, 100);
    return evaluateStore(row).score;
  });
  const avg = mean(scores, NEUTRAL);
  const variance = mean(scores.map(value => Math.pow(value - avg, 2)), 0);
  const stdev = Math.sqrt(Math.max(0, variance));
  return clamp(100 - stdev * 3.2, 45, 100);
}

function evaluateBrand(input, options) {
  const source = input || {};
  const opts = options || {};
  const brand = source.brand || source;
  const portfolio = source.portfolio || {};
  const stores = safeArray(firstDefined(source.stores, portfolio.stores));
  const storeCount = Math.max(1, num(firstDefined(source.storeCount, portfolio.storeCount, stores.length), 1));
  const reputationRaw = firstDefined(brand.reputation, brand.reputationScore, brand.score, source.reputation);
  const reputation = reputationRaw == null ? 68 : (num(reputationRaw) <= 5.2 ? starScore(reputationRaw) : clamp(num(reputationRaw) / (num(reputationRaw) > 100 ? 20 : 1), 0, 100));
  const awareness = scoreValue(firstDefined(brand.awareness, brand.fame, brand.heat, brand.popularity), clamp(42 + Math.log2(storeCount + 1) * 11 + reputation * 0.18, 0, 100));
  const loyalty = scoreValue(firstDefined(brand.loyalty, brand.loyaltyScore, source.loyalty), 66);
  const consistency = scoreValue(firstDefined(brand.consistency, brand.standardization), storeConsistencyScore(stores));
  const scale = clamp(18 + Math.log2(storeCount + 1) * 24, 0, 100);
  const eligibility = portfolio.eligibility || source.eligibility || {};
  const cap = num(firstDefined(eligibility.storeCap, source.storeCap), Math.max(2, storeCount + 1));
  const expansion = scoreValue(firstDefined(brand.expansion, brand.expansionAbility), clamp(45 + (cap > 0 ? storeCount / cap : 0.5) * 30 + scale * 0.20, 0, 100));
  const dimensions = { awareness, reputation, loyalty, consistency, scale, expansion };
  const labels = { awareness: '知名度', reputation: '口碑', loyalty: '忠诚', consistency: '一致性', scale: '规模', expansion: '扩张' };
  const score = weightedScore(dimensions, {
    awareness: 0.20,
    reputation: 0.25,
    loyalty: 0.15,
    consistency: 0.15,
    scale: 0.10,
    expansion: 0.15
  });
  const level = levelFromScore(score, 20);
  const tier = tierForLevel(level, BRAND_TIERS);
  const previous = firstDefined(opts.previousScore, brand.previousBrandScore, source.previousScore);
  return finalize('brand', score, dimensions, labels, previous, {
    id: firstDefined(brand.id, brand.brandId, brand.name, 'player-brand'),
    name: firstDefined(brand.name, source.name, '餐饮品牌'),
    brandLevel: level,
    levelMax: 20,
    tier,
    storeCount,
    display: 'Lv.' + level + ' · ' + tier
  });
}

function buildRatingDashboard(dashboard, brandInput) {
  const d = dashboard || {};
  const store = evaluateStoreFromDashboard(d);
  const dishes = safeArray(d.dishes).map(row => evaluateDish(row));
  const employees = d.staff && safeArray(d.staff.staff).map(row => evaluateEmployee(row)) || [];
  const brand = brandInput ? evaluateBrand(brandInput) : null;
  return { version: VERSION, store, dishes, employees, brand };
}

function snapshot(type, rating, key) {
  const r = rating || {};
  return {
    key: key || null,
    type: type || r.type || 'rating',
    score: round(r.score, 1),
    grade: r.grade || gradeForScore(r.score).grade,
    timestamp: Date.now()
  };
}

function pushHistory(root, type, rating, key, limit) {
  if (!root || typeof root !== 'object' || !rating) return null;
  if (!root.ratingHistory || typeof root.ratingHistory !== 'object') root.ratingHistory = {};
  if (!Array.isArray(root.ratingHistory[type])) root.ratingHistory[type] = [];
  const rows = root.ratingHistory[type];
  const item = snapshot(type, rating, key);
  const index = key == null ? -1 : rows.findIndex(row => row && row.key === key);
  if (index >= 0) rows[index] = item;
  else rows.push(item);
  const max = Math.max(7, Math.round(limit || 90));
  if (rows.length > max) rows.splice(0, rows.length - max);
  return item;
}

module.exports = {
  VERSION,
  NEUTRAL,
  GRADE_BANDS,
  EMPLOYEE_TIERS,
  BRAND_TIERS,
  gradeForScore,
  levelFromScore,
  tierForLevel,
  weightedScore,
  trendMeta,
  evaluateEmployee,
  evaluateDish,
  evaluateStore,
  evaluateStoreFromDashboard,
  evaluateBrand,
  buildRatingDashboard,
  pushHistory
};
