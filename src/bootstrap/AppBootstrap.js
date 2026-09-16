'use strict';

/**
 * V1.1 complete migration bootstrap.
 * Keeps legacy systems working while providing a unified startup point.
 */
class AppBootstrap {
  constructor(registry) {
    this.registry = registry;
  }

  register(name, module) {
    this.registry[name] = module;
  }

  start() {
    return this.registry;
  }
}

module.exports = AppBootstrap;
