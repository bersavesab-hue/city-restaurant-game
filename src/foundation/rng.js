'use strict';

/**
 * 轻量确定性随机数。
 * 目的：同一 seed 能重放同一组世界生成结果，便于存档、测试和定位 bug。
 */
function hashString(input) {
  const text = String(input == null ? '' : input);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

class SeededRng {
  constructor(seed) {
    this.state = hashString(seed || 'city-restaurant-v02') || 0x6d2b79f5;
  }

  next() {
    // mulberry32
    let t = (this.state += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  float(min, max) {
    return min + (max - min) * this.next();
  }

  int(min, max) {
    return Math.floor(this.float(min, max + 1));
  }

  chance(probability) {
    return this.next() < Math.max(0, Math.min(1, probability));
  }

  pick(items) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[this.int(0, items.length - 1)];
  }

  weighted(items, getWeight) {
    if (!Array.isArray(items) || items.length === 0) return null;
    const weights = items.map((item) => Math.max(0, Number(getWeight(item)) || 0));
    const total = weights.reduce((sum, value) => sum + value, 0);
    if (total <= 0) return this.pick(items);
    let roll = this.float(0, total);
    for (let i = 0; i < items.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

module.exports = { SeededRng, hashString };
