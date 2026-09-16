'use strict';

/**
 * 统一经营系统启动层。
 * 通过依赖注入接收模块，统一注册业务系统。
 */
function create(deps) {
  const systems = Object.assign({
    restaurantSimulation: null,
    staffCareer: null,
    foodResearchSystem: null,
    financialSystem: null,
    ratingSystem: null,
    rankingSystem: null,
    awardSystem: null
  }, deps || {});

  function attachRuntime(runtime) {
    if (!runtime || typeof runtime !== 'object') return systems;

    runtime.businessSystems = systems;
    runtime.restaurantSimulation = systems.restaurantSimulation;
    runtime.staffCareer = systems.staffCareer;
    runtime.foodResearch = systems.foodResearchSystem;
    runtime.financialSystem = systems.financialSystem;
    runtime.ratingSystem = systems.ratingSystem;
    runtime.rankingSystem = systems.rankingSystem;
    runtime.awardSystem = systems.awardSystem;

    runtime.moduleRegistry =
      runtime.moduleRegistry && typeof runtime.moduleRegistry === 'object'
        ? runtime.moduleRegistry
        : {};

    Object.assign(runtime.moduleRegistry, {
      restaurant: systems.restaurantSimulation,
      staff: systems.staffCareer,
      food: systems.foodResearchSystem,
      finance: systems.financialSystem,
      rating: systems.ratingSystem,
      ranking: systems.rankingSystem,
      awards: systems.awardSystem
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
      names: Object.keys(systems).filter(name => !!systems[name])
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
