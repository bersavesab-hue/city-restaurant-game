'use strict';

// V1.1_REAL_PATCH_02
// 统一系统注册器

class SystemRegistry {
  constructor() {
    this.modules = {};
  }

  register(name, module) {
    this.modules[name] = module;
  }

  get(name) {
    return this.modules[name];
  }

  list() {
    return Object.keys(this.modules);
  }
}

module.exports = SystemRegistry;
