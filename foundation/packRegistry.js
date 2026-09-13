'use strict';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function unique(list) {
  return [...new Set((list || []).filter(Boolean))];
}

class PackRegistry {
  constructor() {
    this.packs = new Map();
  }

  registerPack(pack) {
    assert(pack && typeof pack === 'object', '资源包必须是对象');
    assert(pack.id, '资源包缺少 id');
    assert(Array.isArray(pack.items), `${pack.id} 缺少 items`);
    assert(!this.packs.has(pack.id), `重复资源包: ${pack.id}`);

    const seen = new Set();
    const normalized = pack.items.map((item) => {
      assert(item && item.id, `${pack.id} 存在无 id 项`);
      assert(!seen.has(item.id), `${pack.id} 存在重复项: ${item.id}`);
      seen.add(item.id);
      return {
        weight: 1,
        tags: [],
        requires: [],
        forbids: [],
        ...item,
        tags: unique(item.tags),
        requires: unique(item.requires),
        forbids: unique(item.forbids)
      };
    });

    this.packs.set(pack.id, {
      version: '1.0.0',
      mode: 'weighted',
      ...pack,
      items: normalized
    });
    return this;
  }

  getPack(id) {
    return this.packs.get(id) || null;
  }

  getItem(packId, itemId) {
    const pack = this.getPack(packId);
    if (!pack) return null;
    return pack.items.find((item) => item.id === itemId) || null;
  }

  list(packId) {
    const pack = this.getPack(packId);
    return pack ? [...pack.items] : [];
  }

  validateReferences() {
    for (const pack of this.packs.values()) {
      for (const item of pack.items) {
        assert(Number.isFinite(Number(item.weight)) && Number(item.weight) >= 0,
          `${pack.id}/${item.id} weight 非法`);
      }
    }
    return true;
  }
}

module.exports = PackRegistry;
