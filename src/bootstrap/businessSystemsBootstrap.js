'use strict';

/**
 * 统一经营系统启动层。
 * 通过依赖注入接收旧模块，保留现有 require 路径与回归测试兼容。
 */
function create(deps) {
  const systems = Object.assign({
    restaurantSimulation: null,
    staffCareer: null,
    foodResearchSystem: null,
    financialSystem: null,
    ratingSystem: null
  }, deps || {});

  function attachRuntime(runtime) {
    if (!runtime || typeof runtime !== 'object') return systems;

    runtime.businessSystems = systems;
    runtime.restaurantSimulation = systems.restaurantSimulation;
    runtime.staffCareer = systems.staffCareer;
    runtime.foodResearch = systems.foodResearchSystem;
    runtime.financialSystem = systems.financialSystem;
    runtime.ratingSystem = systems.ratingSystem;

    runtime.moduleRegistry =
      runtime.moduleRegistry && typeof runtime.moduleRegistry === 'object'
        ? runtime.moduleRegistry
        : {};

    Object.assign(runtime.moduleRegistry, {
      restaurant: systems.restaurantSimulation,
      staff: systems.staffCareer,
      food: systems.foodResearchSystem,
      finance: systems.financialSystem,
      rating: systems.ratingSystem
    });

    return systems;
  }

  function installAfterRestore(runtime) {
    if (
      systems.foodResearchSystem &&
      typeof systems.foodResearchSystem.install === 'function'
    ) {
      systems.foodResearchSystem.install();
    }

    return attachRuntime(runtime);
  }

  function snapshot() {
    return {
      names: Object.keys(systems).filter(name => !!systems[name]),
      financeVersion:
        systems.financialSystem &&
        systems.financialSystem.VERSION || null,
      ratingVersion:
        systems.ratingSystem &&
        systems.ratingSystem.VERSION || null
    };
  }

  return {
    systems,
    attachRuntime,
    installAfterRestore,
    snapshot
  };
}

module.exports = { create };
