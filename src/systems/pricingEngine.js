'use strict';

const { clamp, round } = require('../entities/entityFactory.js');

/**
 * 推荐价不是“成本乘倍率”。
 * 四个锚点：成本安全线、同类市场、客群预算、品牌溢价。
 * 玩家可以突破推荐范围，系统只负责真实反馈，不强制锁价。
 */
function weightedMedian(rows) {
  if (!rows || rows.length === 0) return null;
  const sorted = rows
    .map((r) => ({ value: Number(r.price), weight: Math.max(0.001, Number(r.weight || 1)) }))
    .filter((r) => Number.isFinite(r.value))
    .sort((a, b) => a.value - b.value);
  const total = sorted.reduce((s, r) => s + r.weight, 0);
  let cursor = 0;
  for (const row of sorted) {
    cursor += row.weight;
    if (cursor >= total / 2) return row.value;
  }
  return sorted[sorted.length - 1].value;
}

function recommendPrice(input) {
  const variableCost = Math.max(0.01, Number(input.variableCost || 0));
  const targetContributionMargin = clamp(Number(input.targetContributionMargin ?? 0.52), 0.20, 0.78);
  const costAnchor = variableCost / (1 - targetContributionMargin);

  const marketAnchor = weightedMedian(input.competitors || []) || Number(input.marketReference || costAnchor * 1.15);
  const budgetLow = Number(input.customerBudget?.[0] || marketAnchor * 0.75);
  const budgetHigh = Number(input.customerBudget?.[1] || marketAnchor * 1.35);
  const budgetAnchor = budgetLow * 0.35 + budgetHigh * 0.65;
  const brandPower = clamp(Number(input.brandPower || 35), 0, 100);
  const brandMultiplier = 0.88 + brandPower * 0.0036; // 0.88 ~ 1.24
  const brandAnchor = marketAnchor * brandMultiplier;

  let recommended =
    costAnchor * 0.30 +
    marketAnchor * 0.34 +
    budgetAnchor * 0.22 +
    brandAnchor * 0.14;

  // 不建议价低于必要毛利安全线，也不把推荐值无脑顶到客群预算上限之外。
  const hardFloor = variableCost * 1.15;
  recommended = clamp(recommended, hardFloor, Math.max(hardFloor, budgetHigh * 1.15));

  const low = Math.max(hardFloor, recommended * 0.91);
  const high = Math.max(low, recommended * 1.09);

  return {
    variableCost: round(variableCost, 2),
    costAnchor: round(costAnchor, 2),
    marketAnchor: round(marketAnchor, 2),
    budgetAnchor: round(budgetAnchor, 2),
    brandAnchor: round(brandAnchor, 2),
    recommended: round(recommended, 1),
    range: [round(low, 1), round(high, 1)],
    targetContributionMargin: round(targetContributionMargin, 3)
  };
}

function budgetAcceptance(price, budget) {
  const low = budget[0];
  const high = budget[1];
  if (price <= low) return 1;
  if (price >= high * 1.55) return 0.01;
  if (price <= high) {
    const t = (price - low) / Math.max(1, high - low);
    return 1 - 0.32 * t;
  }
  const t = (price - high) / Math.max(1, high * 0.55);
  return clamp(0.68 * (1 - t) ** 1.6, 0.01, 0.68);
}

function demandMultiplier(input) {
  const price = Math.max(0.01, Number(input.price));
  const reference = Math.max(0.01, Number(input.referencePrice));
  const elasticity = clamp(Number(input.elasticity ?? 1), 0.25, 2.2);
  const budget = input.customerBudget || [reference * 0.7, reference * 1.4];
  const brandPower = clamp(Number(input.brandPower || 35), 0, 100);
  const quality = clamp(Number(input.quality || 60), 0, 100);
  const rating = clamp(Number(input.rating || 4.0), 1, 5);
  const waitMinutes = Math.max(0, Number(input.waitMinutes || 0));

  const relativePrice = price / reference;
  const priceEffect = relativePrice ** (-elasticity);
  const budgetEffect = budgetAcceptance(price, budget);
  const valueExpectation = clamp(
    0.72 + quality / 250 + brandPower / 500 + (rating - 3) * 0.08 - Math.max(0, waitMinutes - 8) * 0.012,
    0.35, 1.45
  );
  return round(clamp(priceEffect * budgetEffect * valueExpectation, 0.02, 2.6), 3);
}

function unitEconomics(price, variableCost, platformRate = 0, promoShare = 0) {
  const revenue = Math.max(0, Number(price));
  const fees = revenue * clamp(Number(platformRate), 0, 0.40) + Math.max(0, Number(promoShare));
  const contribution = revenue - Math.max(0, Number(variableCost)) - fees;
  return {
    revenue: round(revenue, 2),
    fees: round(fees, 2),
    contribution: round(contribution, 2),
    contributionMargin: revenue > 0 ? round(contribution / revenue, 3) : 0
  };
}

module.exports = {
  recommendPrice,
  demandMultiplier,
  unitEconomics,
  weightedMedian,
  budgetAcceptance
};
