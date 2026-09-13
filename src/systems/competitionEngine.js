'use strict';

const { clamp, round } = require('../entities/entityFactory.js');

/**
 * “玩家赚钱 => AI 必定来打”是禁止的。
 * 这里用市场可进入性计算：需求缺口、利润信号、可复制性、房源、租金、饱和度共同决定。
 */
function marketEntryScore(input) {
  const demandGap = clamp(Number(input.demandGapRatio || 0), -0.5, 0.8); // 未满足需求/总需求
  const profitSignal = clamp(Number(input.profitability || 0), -0.2, 0.5);
  const visibleSuccess = clamp(Number(input.successVisibility || 0), 0, 1);
  const copyEase = 1 - clamp(Number(input.copyDifficulty || 0.5), 0, 1);
  const vacancy = clamp(Number(input.vacancyAvailability || 0.5), 0, 1);
  const saturation = clamp(Number(input.saturation || 0.5), 0, 1);
  const rentPressure = clamp(Number(input.rentPressure || 0.5), 0, 1);

  let score = 18;
  score += demandGap * 52;
  score += profitSignal * 62;
  score += visibleSuccess * copyEase * 24;
  score += vacancy * 12;
  score -= saturation * 30;
  score -= rentPressure * 15;

  return round(clamp(score, 0, 100), 1);
}

function imitationPressure(input) {
  const sustainedDays = Math.max(0, Number(input.sustainedProfitDays || 0));
  const marketShare = clamp(Number(input.marketShare || 0), 0, 1);
  const queueSignal = clamp(Number(input.queueSignal || 0), 0, 1);
  const socialBuzz = clamp(Number(input.socialBuzz || 0), 0, 1);
  const copyEase = 1 - clamp(Number(input.copyDifficulty || 0.5), 0, 1);
  const competitorLearning = clamp(Number(input.competitorLearning || 0.5), 0, 1);

  const maturity = clamp((sustainedDays - 7) / 35, 0, 1);
  const score =
    maturity * 34 +
    marketShare * 22 +
    queueSignal * 16 +
    socialBuzz * 12 +
    copyEase * competitorLearning * 24;
  return round(clamp(score, 0, 100), 1);
}

function actionWeights(competitor, signal) {
  const pressure = clamp(Number(signal.imitationPressure || 0), 0, 100) / 100;
  const entry = clamp(Number(signal.entryScore || 0), 0, 100) / 100;
  return {
    observe: round(Math.max(0.08, 0.82 - pressure * 0.55), 3),
    menuImitation: round(pressure * (competitor.imitationAbility / 100) * 0.72, 3),
    priceResponse: round(pressure * (competitor.priceWarTolerance / 100) * 0.58, 3),
    marketingResponse: round(pressure * (competitor.aggression / 100) * 0.46, 3),
    openNearby: round(entry * pressure * (competitor.expansionDesire / 100) * 0.48, 3)
  };
}

module.exports = { marketEntryScore, imitationPressure, actionWeights };
