'use strict';

/**
 * 组合原则：
 * 1. fixed: 已知且不可随机改变的事实（商圈、楼层、已签合同等）
 * 2. weighted: 受现实条件影响的概率组合（租约、房东、瑕疵、职业等）
 * 3. free: 不影响物理/经济合理性的表现组合（部分视觉、姓名、装饰）
 *
 * requires/forbids 使用 tag 约束，避免“20㎡80座”“无条件三楼自然客流极佳”等硬冲突。
 */
class CompositionEngine {
  constructor(registry, rng) {
    this.registry = registry;
    this.rng = rng;
  }

  isCompatible(item, contextTags) {
    const tags = new Set(contextTags || []);
    const requiresOk = (item.requires || []).every((tag) => tags.has(tag));
    const forbidsOk = (item.forbids || []).every((tag) => !tags.has(tag));
    return requiresOk && forbidsOk;
  }

  candidates(packId, contextTags, predicate) {
    return this.registry.list(packId).filter((item) =>
      this.isCompatible(item, contextTags) && (!predicate || predicate(item))
    );
  }

  pickWeighted(packId, contextTags, weightModifier, predicate) {
    const rows = this.candidates(packId, contextTags, predicate);
    return this.rng.weighted(rows, (item) => {
      const modifier = weightModifier ? weightModifier(item) : 1;
      return Math.max(0, Number(item.weight || 1) * Number(modifier || 0));
    });
  }

  pickFree(packId, contextTags, predicate) {
    const rows = this.candidates(packId, contextTags, predicate);
    return this.rng.pick(rows);
  }

  applyTags(contextTags, item) {
    return [...new Set([...(contextTags || []), ...((item && item.tags) || [])])];
  }
}

module.exports = CompositionEngine;
