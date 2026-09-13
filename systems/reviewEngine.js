'use strict';

const { clamp, round } = require('../entities/entityFactory.js');

const DIMENSIONS = ['taste', 'value', 'portion', 'speed', 'service', 'hygiene', 'environment', 'consistency'];

function scoreExperience(experience, weights = {}) {
  let sum = 0;
  let total = 0;
  for (const key of DIMENSIONS) {
    const w = Number(weights[key] ?? 1);
    const value = clamp(Number(experience[key] ?? 60), 0, 100);
    sum += value * w;
    total += w;
  }
  const score100 = total ? sum / total : 60;
  const stars = clamp(1 + (score100 / 100) * 4, 1, 5);
  return { score100: round(score100, 1), stars: round(stars, 1) };
}

function reviewSignals(experience) {
  const signals = [];
  for (const key of DIMENSIONS) {
    const value = Number(experience[key] ?? 60);
    if (value <= 42) signals.push({ dimension: key, sentiment: 'negative', strength: 100 - value });
    else if (value >= 78) signals.push({ dimension: key, sentiment: 'positive', strength: value });
  }
  return signals.sort((a, b) => b.strength - a.strength);
}

module.exports = { DIMENSIONS, scoreExperience, reviewSignals };
