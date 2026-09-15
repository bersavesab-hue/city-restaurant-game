'use strict';

/**
 * V1.0.4 店铺经营形态 + 真实客流漏斗
 *
 * 设计目标：
 * 1. 小面积商铺不再默认拥有完整堂食能力。
 * 2. 在现有 demandSystem 的“商圈需求池”基础上，继续计算：
 *    门前经过 -> 目标客群 -> 注意到店 -> 产生兴趣 -> 尝试进店
 *    -> 排队/座位/厨房约束 -> 实际成交 -> 流失。
 * 3. 完全确定性计算，不在这里使用 Math.random，便于测试和数据解释。
 */

const FORMAT_RULES = [
  {
    id: 'stall',
    name: '摊位/窗口',
    minArea: 0,
    maxArea: 11.99,
    dineIn: false,
    minSeats: 0,
    maxSeats: 0,
    defaultKitchenRatio: 0.62,
    modes: ['takeaway']
  },
  {
    id: 'takeaway_shop',
    name: '外卖/打包小店',
    minArea: 12,
    maxArea: 24.99,
    dineIn: false,
    minSeats: 0,
    maxSeats: 2,
    defaultKitchenRatio: 0.58,
    modes: ['takeaway', 'delivery']
  },
  {
    id: 'micro_restaurant',
    name: '微型餐馆',
    minArea: 25,
    maxArea: 39.99,
    dineIn: true,
    minSeats: 4,
    maxSeats: 12,
    defaultKitchenRatio: 0.42,
    modes: ['dinein', 'takeaway', 'delivery']
  },
  {
    id: 'small_restaurant',
    name: '小型餐馆',
    minArea: 40,
    maxArea: 79.99,
    dineIn: true,
    minSeats: 12,
    maxSeats: 35,
    defaultKitchenRatio: 0.36,
    modes: ['dinein', 'takeaway', 'delivery']
  },
  {
    id: 'restaurant',
    name: '中型餐馆',
    minArea: 80,
    maxArea: 149.99,
    dineIn: true,
    minSeats: 30,
    maxSeats: 70,
    defaultKitchenRatio: 0.32,
    modes: ['dinein', 'takeaway', 'delivery']
  },
  {
    id: 'large_restaurant',
    name: '大型餐饮',
    minArea: 150,
    maxArea: Infinity,
    dineIn: true,
    minSeats: 60,
    maxSeats: 160,
    defaultKitchenRatio: 0.30,
    modes: ['dinein', 'takeaway', 'delivery', 'reservation']
  }
];

const MEAL_PERIOD = {
  breakfast: { passerShare: 0.12, minutes: 150, dineMinutes: 28 },
  lunch: { passerShare: 0.22, minutes: 150, dineMinutes: 38 },
  afternoon: { passerShare: 0.12, minutes: 180, dineMinutes: 42 },
  dinner: { passerShare: 0.24, minutes: 180, dineMinutes: 52 },
  night: { passerShare: 0.14, minutes: 180, dineMinutes: 44 }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function firstPositive(values, fallback) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

function boolKnownFalse(value) {
  return value === false;
}

function getUsableArea(store) {
  const gross = firstPositive(
    [store.grossArea, store.area, store.totalArea],
    0
  );

  return firstPositive(
    [store.usableArea, store.availableArea],
    gross > 0 ? gross * 0.82 : 0
  );
}

function getFormatRule(area) {
  const safeArea = Math.max(0, Number(area) || 0);
  return FORMAT_RULES.find(rule => (
    safeArea >= rule.minArea && safeArea <= rule.maxArea
  )) || FORMAT_RULES[FORMAT_RULES.length - 1];
}

function estimateSeatCapacity(store, rule, usableArea, dineInAllowed) {
  if (!dineInAllowed || !rule.dineIn) return 0;

  const explicitSeats = firstPositive(
    [store.seatCapacity, store.seatEstimate, store.seats],
    0
  );

  if (explicitSeats > 0) {
    return Math.max(
      rule.minSeats,
      Math.min(rule.maxSeats, Math.floor(explicitSeats))
    );
  }

  const kitchenArea = firstPositive(
    [store.kitchenArea, store.kitchenSuggestedArea],
    usableArea * rule.defaultKitchenRatio
  );

  const diningArea = Math.max(
    0,
    firstPositive(
      [store.diningArea, store.diningSuggestedArea],
      usableArea - kitchenArea
    )
  );

  const estimated = Math.floor(diningArea / 1.65);

  return Math.max(
    rule.minSeats,
    Math.min(rule.maxSeats, estimated)
  );
}

function classifyStore(store) {
  const input = store || {};
  const usableArea = getUsableArea(input);
  const rule = getFormatRule(usableArea);

  const warnings = [];

  // 面积不足 25㎡时默认不开放正式堂食。
  // 已明确缺少排水或消防时也不允许正式堂食；未知值不做“一刀切”。
  let dineInAllowed = rule.dineIn;

  if (usableArea < 25) {
    dineInAllowed = false;
    warnings.push('面积不足25㎡，默认仅支持窗口、打包或外卖经营');
  }

  if (boolKnownFalse(input.drainage)) {
    dineInAllowed = false;
    warnings.push('明确缺少排水条件，暂不支持正式堂食');
  }

  if (boolKnownFalse(input.fireSprinkler) || boolKnownFalse(input.fireSafety)) {
    dineInAllowed = false;
    warnings.push('消防条件不满足，暂不支持正式堂食');
  }

  const hotKitchenReady = !(
    boolKnownFalse(input.exhaust) ||
    boolKnownFalse(input.drainage) ||
    boolKnownFalse(input.greaseTrap) ||
    (
      boolKnownFalse(input.gas) &&
      boolKnownFalse(input.threePhase)
    )
  );

  if (boolKnownFalse(input.exhaust)) {
    warnings.push('无排烟条件，热厨品类将受到明显限制');
  }

  if (boolKnownFalse(input.greaseTrap)) {
    warnings.push('无隔油条件，热厨与重餐饮适配度下降');
  }

  const seatCapacity = estimateSeatCapacity(
    input,
    rule,
    usableArea,
    dineInAllowed
  );

  const serviceModes = rule.modes.filter(mode => (
    mode !== 'dinein' || dineInAllowed
  ));

  return {
    id: rule.id,
    name: rule.name,
    usableArea: Math.round(usableArea * 10) / 10,
    dineInAllowed,
    hotKitchenReady,
    seatCapacity,
    serviceModes,
    warnings
  };
}

function weightedSpeedSensitivity(demandPool, customerTypes) {
  if (!demandPool || !demandPool.customerGroups) return 0.68;

  let total = 0;
  let weighted = 0;

  for (const [typeId, group] of Object.entries(demandPool.customerGroups)) {
    const amount = Math.max(0, Number(group && group.demand) || 0);
    const profile = customerTypes && customerTypes[typeId];
    const sensitivity = profile
      ? clamp(profile.speedSensitivity, 0, 1)
      : 0.68;

    total += amount;
    weighted += amount * sensitivity;
  }

  return total > 0 ? weighted / total : 0.68;
}

function buildCapacity(store, format, mealPeriod) {
  const profile = MEAL_PERIOD[mealPeriod] || MEAL_PERIOD.lunch;
  const usableArea = Math.max(1, format.usableArea || 1);

  const kitchenArea = firstPositive(
    [store.kitchenArea, store.kitchenSuggestedArea],
    usableArea * (
      format.id === 'stall' ? 0.66 :
      format.id === 'takeaway_shop' ? 0.58 :
      format.id === 'micro_restaurant' ? 0.42 :
      format.id === 'small_restaurant' ? 0.36 :
      format.id === 'restaurant' ? 0.32 : 0.30
    )
  );

  // 一餐期内的厨房极限吞吐。显式值优先，其次按厨房面积估算。
  let kitchenCapacity = firstPositive(
    [store.kitchenCapacity, store.kitchenPeriodCapacity],
    kitchenArea * 4.2
  );

  if (!format.hotKitchenReady) {
    kitchenCapacity *= 0.66;
  }

  // 堂食一餐期可服务人数 = 座位数 × 可完成轮次。
  const turns = profile.minutes / profile.dineMinutes;
  const dineInCapacity = format.dineInAllowed
    ? Math.floor(format.seatCapacity * Math.max(1, turns * 0.78))
    : 0;

  // 打包/外卖通道：小店也有价值，不强迫所有店做堂食。
  const takeawayCapacity = Math.floor(
    firstPositive(
      [store.takeawayCapacity, store.pickupCapacity],
      Math.max(8, usableArea * 1.15)
    )
  );

  const staffCount = firstPositive(
    [store.serviceStaffCount, store.staffCount, store.employeeCount],
    format.id === 'stall' ? 1 : format.id === 'takeaway_shop' ? 2 : 3
  );

  const staffCapacity = Math.floor(
    firstPositive(
      [store.serviceCapacity],
      staffCount * 22
    )
  );

  const frontCapacity = Math.max(
    1,
    dineInCapacity + takeawayCapacity
  );

  return {
    kitchenCapacity: Math.max(1, Math.floor(kitchenCapacity)),
    dineInCapacity,
    takeawayCapacity,
    staffCapacity: Math.max(1, staffCapacity),
    serviceCapacity: Math.max(
      1,
      Math.min(frontCapacity, staffCapacity + Math.floor(takeawayCapacity * 0.45))
    )
  };
}

function getDailyFootfall(store, demandPool, district) {
  const explicit = firstPositive(
    [
      store.footfall,
      store.dailyFootfall,
      store.footTraffic,
      store.passersPerDay,
      store.listing && store.listing.footfall
    ],
    0
  );

  if (explicit > 0) return explicit;

  const demand = Math.max(
    1,
    Number(demandPool && demandPool.totalDemand) ||
      Number(district && district.baseDemand) ||
      100
  );

  return Math.max(300, demand * 5.5);
}

function getAttraction(store) {
  const visibility = clamp(
    firstPositive([store.visibility, store.exposureScore], 62),
    0,
    100
  );
  const frontage = clamp(
    firstPositive([store.frontage, store.frontageWidth], 3.2),
    0,
    20
  );
  const rating = clamp(
    firstPositive([store.rating], 3.7),
    1,
    5
  );
  const reputation = clamp(
    firstPositive([store.reputation, store.reputationScore], 45),
    0,
    100
  );
  const priceFit = clamp(
    firstPositive([store.priceFit, store.priceMatch], 62),
    0,
    100
  );
  const menuAppeal = clamp(
    firstPositive([store.menuAppeal, store.menuScore], 58),
    0,
    100
  );
  const marketing = clamp(
    firstPositive([store.marketingBoost, store.marketingScore], 0),
    0,
    100
  );

  const noticeRate = clamp(
    0.12 +
      visibility * 0.0058 +
      Math.min(0.16, frontage * 0.018),
    0.18,
    0.88
  );

  const interestRate = clamp(
    0.08 +
      (rating / 5) * 0.19 +
      (reputation / 100) * 0.14 +
      (priceFit / 100) * 0.12 +
      (menuAppeal / 100) * 0.16 +
      (marketing / 100) * 0.08,
    0.16,
    0.72
  );

  return {
    noticeRate,
    interestRate,
    visibility,
    frontage,
    rating,
    reputation,
    priceFit,
    menuAppeal,
    marketing
  };
}

function simulate(input) {
  const options = input || {};
  const store = options.store || {};
  const demandPool = options.demandPool || {
    totalDemand: 0,
    remainingDemand: 0,
    customerGroups: {}
  };
  const district = options.district || {};
  const mealPeriod = options.mealPeriod || demandPool.mealPeriod || 'lunch';
  const mealProfile = MEAL_PERIOD[mealPeriod] || MEAL_PERIOD.lunch;
  const format = classifyStore(store);
  const capacity = buildCapacity(store, format, mealPeriod);
  const attraction = getAttraction(store);

  const dailyFootfall = getDailyFootfall(store, demandPool, district);
  const periodPassers = Math.max(
    0,
    Math.floor(dailyFootfall * mealProfile.passerShare)
  );

  const availableDemand = Math.max(
    0,
    Number(demandPool.remainingDemand != null
      ? demandPool.remainingDemand
      : demandPool.totalDemand) || 0
  );

  // “目标客群”不是所有路人。优先用商圈需求/时段路人形成比例，
  // 并设上下限避免出现 100% 路人都想吃饭的假数据。
  const targetRatio = clamp(
    availableDemand / Math.max(1, periodPassers * 2.15),
    0.08,
    0.52
  );

  const targetCustomers = Math.min(
    availableDemand,
    Math.floor(periodPassers * targetRatio)
  );

  const noticed = Math.floor(
    targetCustomers * attraction.noticeRate
  );

  const interested = Math.floor(
    noticed * attraction.interestRate
  );

  const saturation = clamp(
    firstPositive([district.saturation, store.saturation], 65),
    0,
    100
  );
  const competitorCount = Math.max(
    0,
    Number(store.competitorCount) || 0
  );

  const competitionFactor = clamp(
    1 - saturation * 0.0032 - Math.min(0.18, competitorCount * 0.018),
    0.48,
    0.94
  );

  const attempted = Math.min(
    availableDemand,
    Math.max(0, Math.floor(interested * competitionFactor))
  );

  const hardCapacity = Math.max(
    1,
    Math.min(
      capacity.serviceCapacity,
      capacity.kitchenCapacity
    )
  );

  // 高峰刚到店时能立刻承接的比例，剩余形成排队。
  const immediateCapacity = Math.max(
    1,
    Math.floor(hardCapacity * 0.68)
  );

  const queueCandidates = Math.max(
    0,
    attempted - immediateCapacity
  );

  const hourlyThroughput = Math.max(
    1,
    hardCapacity / Math.max(1, mealProfile.minutes / 60)
  );

  const averageWaitMinutes = queueCandidates > 0
    ? Math.min(60, (queueCandidates / hourlyThroughput) * 60 * 0.56)
    : 0;

  const speedSensitivity = weightedSpeedSensitivity(
    demandPool,
    options.customerTypes || {}
  );

  const queuePressure = clamp(
    queueCandidates / Math.max(1, hardCapacity),
    0,
    2.5
  );

  const queueAbandonRate = queueCandidates > 0
    ? clamp(
        Math.max(0, averageWaitMinutes - 4) / 34 * 0.52 * speedSensitivity +
          queuePressure * 0.10,
        0,
        0.72
      )
    : 0;

  const lostByQueue = Math.min(
    queueCandidates,
    Math.floor(queueCandidates * queueAbandonRate)
  );

  const afterQueue = Math.max(0, attempted - lostByQueue);
  const actualCustomers = Math.min(afterQueue, hardCapacity);
  const lostByCapacity = Math.max(0, afterQueue - actualCustomers);

  const kitchenIsBottleneck = capacity.kitchenCapacity <= capacity.serviceCapacity;
  const lostByKitchen = kitchenIsBottleneck
    ? lostByCapacity
    : 0;
  const lostByFrontService = kitchenIsBottleneck
    ? 0
    : lostByCapacity;

  const noSeatPressure = format.dineInAllowed
    ? Math.max(0, attempted - capacity.dineInCapacity - capacity.takeawayCapacity)
    : 0;

  const conversionRate = periodPassers > 0
    ? actualCustomers / periodPassers
    : 0;

  const attemptConversionRate = attempted > 0
    ? actualCustomers / attempted
    : 0;

  const lostCustomers = Math.max(0, attempted - actualCustomers);

  return {
    version: '1.0.4',
    mealPeriod,
    format,
    capacity,
    funnel: {
      dailyFootfall: Math.round(dailyFootfall),
      periodPassers,
      targetCustomers,
      noticed,
      interested,
      attempted,
      actualCustomers,
      lostCustomers
    },
    rates: {
      targetRatio,
      noticeRate: attraction.noticeRate,
      interestRate: attraction.interestRate,
      competitionFactor,
      queueAbandonRate,
      conversionRate,
      attemptConversionRate
    },
    queue: {
      queueCandidates,
      averageWaitMinutes: Math.round(averageWaitMinutes * 10) / 10,
      lostByQueue,
      queuePressure: Math.round(queuePressure * 100) / 100
    },
    losses: {
      lostByQueue,
      lostByCapacity,
      lostByKitchen,
      lostByFrontService,
      potentialNoSeatPressure: noSeatPressure
    },
    bottleneck: kitchenIsBottleneck
      ? 'kitchen'
      : capacity.serviceCapacity < capacity.kitchenCapacity
        ? 'front_service'
        : 'balanced',
    explain: {
      passers: '当前餐期门前经过人数',
      targetCustomers: '路人中当前有餐饮需求且与本商圈客群匹配的人',
      noticed: '真正注意到门店的人',
      interested: '被门店、菜单、价格与口碑吸引的人',
      attempted: '在竞争分流后真正尝试进店/下单的人',
      actualCustomers: '经过排队、座位、员工和厨房约束后完成消费的人'
    }
  };
}

module.exports = {
  FORMAT_RULES,
  MEAL_PERIOD,
  classifyStore,
  simulate
};
