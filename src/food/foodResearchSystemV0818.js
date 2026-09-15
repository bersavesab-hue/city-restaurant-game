'use strict';

const gameState =
  require('../core/gameState.js');

const globalStateBus =
  require('../core/globalStateBusV0811.js');

const timeScheduleCoordinator =
  require('../core/timeScheduleCoordinatorV0812.js');

const database =
  require('./foodResearchDatabaseV0818.js');

const VERSION =
  '0.8.18';

const HISTORY_LIMIT =
  96;

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function createSystem(options) {
  const opts =
    options ||
    {};

  const state =
    opts.gameState ||
    gameState;

  const bus =
    opts.bus ||
    globalStateBus;

  const clock =
    opts.timeCoordinator ||
    timeScheduleCoordinator;

  const db =
    opts.database ||
    database;

  const unsubscribers =
    [];

  let installed =
    false;

  function currentMinute() {
    if (
      typeof opts.currentMinute ===
        'function'
    ) {
      return Math.max(
        0,
        Number(
          opts.currentMinute()
        ) ||
        0
      );
    }

    return Math.max(
      0,
      Number(
        clock.absoluteMinute(
          state.getTime()
        )
      ) ||
      0
    );
  }

  function getBusiness() {
    return state
      .getBusiness();
  }

  function collectLegacyMenuRecipeIds() {
    const business =
      getBusiness();

    const ids = [];

    const operations =
      business &&
      business
        .restaurantOperations;

    const shops =
      operations &&
      operations.shops &&
      typeof operations.shops ===
        'object'
        ? operations.shops
        : {};

    for (
      const shopId
      of Object.keys(
        shops
      )
    ) {
      const stored =
        shops[
          shopId
        ];

      const menu =
        stored &&
        Array.isArray(
          stored.menu
        )
          ? stored.menu
          : [];

      for (
        const item
        of menu
      ) {
        if (
          item &&
          item.recipeId
        ) {
          ids.push(
            item.recipeId
          );
        }
      }
    }

    return ids;
  }

  function ensureState() {
    const business =
      getBusiness();

    business.foodResearch =
      business.foodResearch &&
      typeof business.foodResearch ===
        'object' &&
      !Array.isArray(
        business.foodResearch
      )
        ? business.foodResearch
        : {};

    const store =
      business.foodResearch;

    store.version =
      VERSION;

    store.initialized =
      store.initialized ===
        true;

    store.unlockedRecipeIds =
      Array.isArray(
        store.unlockedRecipeIds
      )
        ? store.unlockedRecipeIds
        : [];

    store.activeProjects =
      Array.isArray(
        store.activeProjects
      )
        ? store.activeProjects
        : [];

    store.history =
      Array.isArray(
        store.history
      )
        ? store.history
        : [];

    store.metrics =
      store.metrics &&
      typeof store.metrics ===
        'object'
        ? store.metrics
        : {
            started:0,
            completed:0,
            spent:0
          };

    store.metrics.started =
      Math.max(
        0,
        Number(
          store.metrics.started
        ) ||
        0
      );

    store.metrics.completed =
      Math.max(
        0,
        Number(
          store.metrics.completed
        ) ||
        0
      );

    store.metrics.spent =
      Math.max(
        0,
        Number(
          store.metrics.spent
        ) ||
        0
      );

    const validIds =
      new Set(
        db.pack.RECIPES
          .map(
            item =>
              item.id
          )
      );

    const adopted =
      [
        ...db.STARTER_RECIPE_IDS,
        ...store.unlockedRecipeIds,
        ...collectLegacyMenuRecipeIds()
      ]
        .filter(
          id =>
            validIds.has(
              id
            )
        );

    store.unlockedRecipeIds =
      Array.from(
        new Set(
          adopted
        )
      );

    store.activeProjects =
      store.activeProjects
        .filter(
          project =>
            project &&
            validIds.has(
              project.recipeId
            ) &&
            !store
              .unlockedRecipeIds
              .includes(
                project.recipeId
              )
        );

    if (
      store.history.length >
      HISTORY_LIMIT
    ) {
      store.history =
        store.history.slice(
          -HISTORY_LIMIT
        );
    }

    store.initialized =
      true;

    return store;
  }

  function emit(
    type,
    payload
  ) {
    if (
      bus &&
      typeof bus.emit ===
        'function'
    ) {
      bus.emit(
        type,
        payload,
        {
          source:
            'foodResearchSystemV0818'
        }
      );
    }
  }

  function syncDomains(
    reason
  ) {
    if (
      bus &&
      typeof bus.syncDomain ===
        'function'
    ) {
      bus.syncDomain(
        'business',
        reason
      );

      bus.syncDomain(
        'operations',
        reason
      );
    }
  }

  function isUnlocked(
    recipeId
  ) {
    return ensureState()
      .unlockedRecipeIds
      .includes(
        recipeId
      );
  }

  function getProject(
    recipeId
  ) {
    return (
      ensureState()
        .activeProjects
        .find(
          item =>
            item.recipeId ===
            recipeId
        ) ||
      null
    );
  }

  function unlockRecipe(
    recipeId,
    reason
  ) {
    const recipe =
      db.getRecipe(
        recipeId
      );

    if (!recipe) {
      return {
        ok:false,
        reason:
          '配方不存在'
      };
    }

    const store =
      ensureState();

    if (
      !store
        .unlockedRecipeIds
        .includes(
          recipeId
        )
    ) {
      store
        .unlockedRecipeIds
        .push(
          recipeId
        );
    }

    store.activeProjects =
      store
        .activeProjects
        .filter(
          item =>
            item.recipeId !==
            recipeId
        );

    store.history.push({
      type:'unlocked',
      recipeId,
      minute:
        currentMinute(),
      reason:
        reason ||
        'unlock'
    });

    if (
      store.history.length >
      HISTORY_LIMIT
    ) {
      store.history =
        store.history.slice(
          -HISTORY_LIMIT
        );
    }

    return {
      ok:true,
      recipeId,
      unlocked:true
    };
  }

  function startResearch(
    recipeId
  ) {
    const recipe =
      db.getRecipe(
        recipeId
      );

    if (!recipe) {
      return {
        ok:false,
        reason:
          '配方不存在'
      };
    }

    const store =
      ensureState();

    if (
      store
        .unlockedRecipeIds
        .includes(
          recipeId
        )
    ) {
      return {
        ok:false,
        reason:
          '该菜品已经掌握'
      };
    }

    if (
      getProject(
        recipeId
      )
    ) {
      return {
        ok:false,
        reason:
          '该菜品正在研发'
      };
    }

    if (
      store
        .activeProjects
        .length >=
      1
    ) {
      return {
        ok:false,
        reason:
          '当前已有研发项目进行中'
      };
    }

    const meta =
      recipe.research;

    const cost =
      Math.max(
        0,
        Number(
          meta.researchCost
        ) ||
        0
      );

    if (
      !state
        .spendCash(
          cost
        )
    ) {
      return {
        ok:false,
        reason:
          '研发资金不足',
        cost
      };
    }

    const startMinute =
      currentMinute();

    const finishMinute =
      startMinute +
      Math.max(
        1,
        Number(
          meta.researchDays
        ) ||
        1
      ) *
      1440;

    const project = {
      recipeId,
      name:
        recipe.name,
      trackId:
        meta.trackId,
      tier:
        meta.tier,
      cost,
      researchDays:
        meta.researchDays,
      startMinute,
      finishMinute,
      status:
        'researching'
    };

    store
      .activeProjects
      .push(
        project
      );

    store.metrics.started +=
      1;

    store.metrics.spent +=
      cost;

    store.history.push({
      type:'started',
      recipeId,
      minute:
        startMinute,
      cost,
      finishMinute
    });

    if (
      store.history.length >
      HISTORY_LIMIT
    ) {
      store.history =
        store.history.slice(
          -HISTORY_LIMIT
        );
    }

    emit(
      'food.research.started',
      clone(
        project
      )
    );

    syncDomains(
      'food-research-started'
    );

    return {
      ok:true,
      project:
        clone(
          project
        )
    };
  }

  function sync(
    reason
  ) {
    const store =
      ensureState();

    if (
      !store
        .activeProjects
        .length
    ) {
      return {
        changed:false,
        completed:[]
      };
    }

    const minute =
      currentMinute();

    const completed =
      [];

    const remaining =
      [];

    for (
      const project
      of store
          .activeProjects
    ) {
      if (
        minute <
        Number(
          project.finishMinute
        )
      ) {
        remaining.push(
          project
        );
        continue;
      }

      if (
        !store
          .unlockedRecipeIds
          .includes(
            project.recipeId
          )
      ) {
        store
          .unlockedRecipeIds
          .push(
            project.recipeId
          );
      }

      const row = {
        ...clone(project),
        status:'completed',
        completedMinute:
          minute
      };

      completed.push(
        row
      );

      store.history.push({
        type:'completed',
        recipeId:
          project.recipeId,
        minute,
        reason:
          reason ||
          'time-advanced'
      });

      store.metrics.completed +=
        1;

      emit(
        'food.research.completed',
        clone(row)
      );
    }

    store.activeProjects =
      remaining;

    if (
      store.history.length >
      HISTORY_LIMIT
    ) {
      store.history =
        store.history.slice(
          -HISTORY_LIMIT
        );
    }

    if (
      completed.length
    ) {
      syncDomains(
        'food-research-completed'
      );
    }

    return {
      changed:
        completed.length >
        0,
      completed
    };
  }

  function getCatalog(
    filters
  ) {
    sync(
      'catalog-read'
    );

    const store =
      ensureState();

    const f =
      filters ||
      {};

    return db
      .queryRecipes(
        f
      )
      .map(
        recipe => {
          const project =
            store
              .activeProjects
              .find(
                item =>
                  item.recipeId ===
                  recipe.id
              ) ||
            null;

          return {
            ...recipe,
            unlocked:
              store
                .unlockedRecipeIds
                .includes(
                  recipe.id
                ),
            researching:
              !!project,
            project:
              project
                ? clone(
                    project
                  )
                : null
          };
        }
      );
  }

  function getOverview() {
    const synced =
      sync(
        'overview'
      );

    const store =
      ensureState();

    return {
      version:VERSION,
      unlockedCount:
        store
          .unlockedRecipeIds
          .length,
      totalRecipes:
        db
          .getStats()
          .recipes,
      researchableCount:
        db
          .getStats()
          .researchableRecipes,
      activeProjects:
        clone(
          store.activeProjects
        ),
      history:
        clone(
          store.history
            .slice(-12)
        ),
      metrics:
        clone(
          store.metrics
        ),
      changed:
        synced.changed
    };
  }

  function install() {
    if (installed) {
      return true;
    }

    ensureState();
    sync(
      'install'
    );

    if (
      bus &&
      typeof bus.on ===
        'function'
    ) {
      for (
        const eventName
        of [
          'time.advanced',
          'time.changed'
        ]
      ) {
        const unsubscribe =
          bus.on(
            eventName,
            () => {
              sync(
                eventName
              );
            }
          );

        if (
          typeof unsubscribe ===
            'function'
        ) {
          unsubscribers.push(
            unsubscribe
          );
        }
      }
    }

    installed =
      true;

    emit(
      'food.research.installed',
      {
        version:VERSION,
        unlockedCount:
          ensureState()
            .unlockedRecipeIds
            .length
      }
    );

    return true;
  }

  function diagnose() {
    const store =
      ensureState();

    return {
      version:VERSION,
      installed,
      database:
        db.getStats(),
      unlockedCount:
        store
          .unlockedRecipeIds
          .length,
      activeCount:
        store
          .activeProjects
          .length,
      historyCount:
        store
          .history
          .length
    };
  }

  function resetForTests() {
    while (
      unsubscribers.length
    ) {
      const unsubscribe =
        unsubscribers.pop();

      try {
        unsubscribe();
      } catch (error) {
      }
    }

    installed =
      false;
  }

  return {
    VERSION,
    HISTORY_LIMIT,
    ensureState,
    isUnlocked,
    getProject,
    unlockRecipe,
    startResearch,
    sync,
    getCatalog,
    getOverview,
    install,
    diagnose,
    resetForTests
  };
}

const system =
  createSystem();

system.createSystem =
  createSystem;

module.exports =
  system;
