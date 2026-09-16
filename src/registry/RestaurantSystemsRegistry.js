'use strict';

/**
 * 餐厅系统统一注册中心
 *
 * 负责集中管理：
 * food / staff / rating / ranking / awards
 * 避免 UI 或其他模块直接依赖大量底层文件。
 */

class RestaurantSystemsRegistry {
  constructor() {
    this.systems = {};
  }

  register(name, system) {
    if (!name || !system) return false;
    this.systems[name] = system;
    return true;
  }

  get(name) {
    return this.systems[name] || null;
  }

  getAll() {
    return this.systems;
  }

  snapshot() {
    return Object.keys(this.systems);
  }
}

module.exports = RestaurantSystemsRegistry;
