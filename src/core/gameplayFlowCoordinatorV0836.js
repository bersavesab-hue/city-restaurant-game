'use strict';

const gameState =
  require('./gameState.js');

const newGameFlow =
  require('./newGameFlowV0814.js');

const businessLifecycle =
  require('./businessLifecycleV086.js');

const openingPrep =
  require('../opening/openingPrepSystem.js');

const VERSION =
  '0.8.36';

const OPENING_STAGE_ORDER =
  Object.freeze([
    'city_setup',
    'property_search',
    'renovation',
    'equipment',
    'license',
    'staff',
    'trial',
    'formal_open',
    'complete'
  ]);

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function createCoordinator(options) {
  const opts =
    options ||
    {};

  const deps = {
    gameState:
      opts.gameState ||
      gameState,
    newGameFlow:
      opts.newGameFlow ||
      newGameFlow,
    businessLifecycle:
      opts.businessLifecycle ||
      businessLifecycle,
    openingPrep:
      opts.openingPrep ||
      openingPrep
  };

  function business() {
    return deps.gameState
      .getBusiness();
  }

  function currentShop() {
    const b =
      business();

    const shops =
      Array.isArray(
        b.shops
      )
        ? b.shops
        : [];

    const active =
      shops.find(
        item =>
          item &&
          item.id ===
            b.currentShopId &&
          item.status !==
            'closed'
      );

    if (active) {
      return active;
    }

    return (
      shops.find(
        item =>
          item &&
          item.status !==
            'closed'
      ) ||
      null
    );
  }

  function repairSafeInvariants() {
    const b =
      business();

    const repairs = [];

    b.shops =
      Array.isArray(
        b.shops
      )
        ? b.shops
        : [];

    const validShops =
      b.shops.filter(Boolean);

    const activeShops =
      validShops.filter(
        item =>
          item.status !==
          'closed'
      );

    const hasAny =
      activeShops.length >
      0;

    if (
      !!b.hasShop !==
      hasAny
    ) {
      b.hasShop =
        hasAny;

      repairs.push(
        'business.hasShop'
      );
    }

    if (hasAny) {
      const selected =
        validShops.find(
          item =>
            item.id ===
            b.currentShopId &&
          item.status !==
            'closed'
        );

      if (!selected) {
        const next =
          activeShops[0];

        b.currentShopId =
          next.id;

        repairs.push(
          'business.currentShopId'
        );
      }
    } else if (
      b.currentShopId !=
      null
    ) {
      b.currentShopId =
        null;

      repairs.push(
        'business.currentShopId'
      );
    }

    return {
      changed:
        repairs.length >
        0,
      repairs
    };
  }

  function openingProgress() {
    repairSafeInvariants();

    if (
      deps.newGameFlow &&
      typeof deps.newGameFlow
        .getProgress ===
        'function'
    ) {
      return deps.newGameFlow
        .getProgress();
    }

    return {
      stage:
        currentShop()
          ? 'complete'
          : 'property_search',
      completed:
        !!currentShop(),
      recommended:{
        routeId:
          currentShop()
            ? 'shop'
            : 'city',
        params:{}
      }
    };
  }

  function lifecycleStage(shop) {
    if (!shop) {
      return null;
    }

    if (
      deps.businessLifecycle &&
      typeof deps.businessLifecycle
        .deriveStage ===
        'function'
    ) {
      try {
        return deps
          .businessLifecycle
          .deriveStage(
            shop
          );
      } catch (error) {
      }
    }

    return (
      shop.lifecycleStage ||
      shop.status ||
      null
    );
  }

  function phase() {
    const progress =
      openingProgress();

    const shop =
      currentShop();

    if (
      progress.stage ===
      'city_setup'
    ) {
      return 'new_game';
    }

    if (
      progress.stage ===
      'property_search'
    ) {
      return 'property';
    }

    if (
      [
        'renovation',
        'equipment',
        'license',
        'staff'
      ].includes(
        progress.stage
      )
    ) {
      return 'preparation';
    }

    if (
      progress.stage ===
        'trial' ||
      progress.stage ===
        'formal_open'
    ) {
      return 'trial';
    }

    if (!shop) {
      return 'property';
    }

    return 'operation';
  }

  function readiness(shop) {
    if (!shop) {
      return null;
    }

    if (
      deps.openingPrep &&
      typeof deps.openingPrep
        .getReadiness ===
        'function'
    ) {
      try {
        return deps.openingPrep
          .getReadiness(
            shop.id
          );
      } catch (error) {
      }
    }

    return null;
  }

  function blockers() {
    const progress =
      openingProgress();

    const shop =
      currentShop();

    const rows = [];

    if (
      progress.stage ===
      'city_setup'
    ) {
      rows.push({
        id:'city',
        message:
          '先确认创业城市'
      });
    }

    if (
      progress.stage ===
      'property_search'
    ) {
      rows.push({
        id:'property',
        message:
          '需要先找到并签下首店'
      });
    }

    if (shop) {
      const ready =
        readiness(shop);

      if (ready) {
        if (
          !ready.renovationReady
        ) {
          rows.push({
            id:'renovation',
            message:
              '装修尚未完成'
          });
        }

        if (
          !ready.equipmentReady
        ) {
          rows.push({
            id:'equipment',
            message:
              '设备尚未到位'
          });
        }

        if (
          !ready.permitsReady
        ) {
          rows.push({
            id:'license',
            message:
              '证照尚未齐全'
          });
        }

        if (
          !ready.staffingReady
        ) {
          rows.push({
            id:'staff',
            message:
              '人员配置尚未达标'
          });
        }
      }
    }

    return rows;
  }

  function recommendedRoute() {
    const progress =
      openingProgress();

    if (
      progress &&
      progress.recommended &&
      progress.recommended.routeId
    ) {
      return clone(
        progress.recommended
      );
    }

    const shop =
      currentShop();

    return {
      routeId:
        shop
          ? 'shop'
          : 'city',
      params:
        shop
          ? {
              shopId:
                shop.id
            }
          : {}
    };
  }

  function primaryAction() {
    const progress =
      openingProgress();

    const shop =
      currentShop();

    if (
      !shop ||
      progress.stage ===
        'city_setup' ||
      progress.stage ===
        'property_search' ||
      [
        'renovation',
        'equipment',
        'license',
        'staff'
      ].includes(
        progress.stage
      )
    ) {
      const route =
        recommendedRoute();

      return {
        type:'route',
        id:'open:' +
          route.routeId,
        routeId:
          route.routeId,
        params:
          route.params ||
          {}
      };
    }

    const life =
      lifecycleStage(
        shop
      );

    if (
      progress.stage ===
        'trial' &&
      life ===
        'ready_for_trial'
    ) {
      return {
        type:'action',
        id:'start_trial',
        shopId:
          shop.id,
        label:'开始试营业'
      };
    }

    if (
      progress.stage ===
        'formal_open' ||
      life ===
        'trial_complete'
    ) {
      return {
        type:'action',
        id:'formal_open',
        shopId:
          shop.id,
        label:'正式开业'
      };
    }

    return {
      type:'route',
      id:'open:shop',
      routeId:'shop',
      params:{
        shopId:
          shop.id
      }
    };
  }

  function executePrimary() {
    const action =
      primaryAction();

    if (
      action.type ===
      'route'
    ) {
      return {
        ok:true,
        performed:false,
        route:{
          routeId:
            action.routeId,
          params:
            clone(
              action.params ||
              {}
            )
        }
      };
    }

    if (
      action.id ===
      'start_trial'
    ) {
      const result =
        deps.businessLifecycle
          .startTrialOpening(
            action.shopId
          );

      return {
        ...result,
        performed:
          !!(
            result &&
            result.ok
          ),
        actionId:
          action.id,
        shopId:
          action.shopId,
        next:
          result &&
          result.ok
            ? {
                routeId:'shop',
                params:{
                  shopId:
                    action.shopId
                }
              }
            : null
      };
    }

    if (
      action.id ===
      'formal_open'
    ) {
      const result =
        deps.businessLifecycle
          .formalOpen(
            action.shopId
          );

      return {
        ...result,
        performed:
          !!(
            result &&
            result.ok
          ),
        actionId:
          action.id,
        shopId:
          action.shopId,
        next:
          result &&
          result.ok
            ? {
                routeId:'shop',
                params:{
                  shopId:
                    action.shopId
                }
              }
            : null
      };
    }

    return {
      ok:false,
      performed:false,
      message:
        '当前没有可执行的主操作'
    };
  }

  function goal() {
    const progress =
      openingProgress();

    const shop =
      currentShop();

    const stage =
      progress.stage;

    if (
      stage ===
      'city_setup'
    ) {
      return {
        version:VERSION,
        phase:'new_game',
        title:'确认创业城市',
        steps:[
          '城市',
          '选址',
          '签约',
          '筹备',
          '开业'
        ],
        current:0,
        completed:false,
        recommended:
          recommendedRoute(),
        primaryAction:
          primaryAction(),
        blockers:
          blockers()
      };
    }

    if (
      stage ===
      'property_search'
    ) {
      const process =
        business()
          .propertyProcess ||
        {
          visits:{},
          negotiations:{},
          leases:{}
        };

      let current = 0;

      if (
        Object.keys(
          process.visits ||
          {}
        ).length
      ) {
        current = 1;
      }

      if (
        Object.keys(
          process.negotiations ||
          {}
        ).length
      ) {
        current = 2;
      }

      if (
        Object.keys(
          process.leases ||
          {}
        ).length
      ) {
        current = 3;
      }

      return {
        version:VERSION,
        phase:'property',
        title:'开设首店',
        steps:[
          '选址',
          '看铺',
          '谈判',
          '签约',
          '装修'
        ],
        current,
        completed:false,
        recommended:
          recommendedRoute(),
        primaryAction:
          primaryAction(),
        blockers:
          blockers()
      };
    }

    if (
      [
        'renovation',
        'equipment',
        'license',
        'staff'
      ].includes(
        stage
      )
    ) {
      const order = [
        'renovation',
        'equipment',
        'license',
        'staff'
      ];

      return {
        version:VERSION,
        phase:'preparation',
        title:'筹备首店',
        steps:[
          '装修',
          '设备',
          '证照',
          '招聘',
          '试营业'
        ],
        current:
          Math.max(
            0,
            order.indexOf(
              stage
            )
          ),
        completed:false,
        recommended:
          recommendedRoute(),
        primaryAction:
          primaryAction(),
        blockers:
          blockers()
      };
    }

    if (
      stage ===
        'trial' ||
      stage ===
        'formal_open'
    ) {
      const life =
        lifecycleStage(
          shop
        );

      let current = 0;

      if (
        life ===
        'trial_opening'
      ) {
        current = 2;
      }

      if (
        life ===
        'trial_complete' ||
        stage ===
        'formal_open'
      ) {
        current = 3;
      }

      return {
        version:VERSION,
        phase:'trial',
        title:
          life ===
          'trial_complete'
            ? '准备正式开业'
            : '完成试营业',
        steps:[
          '筹备完成',
          '开始试营业',
          '3日经营',
          '正式开业',
          '稳定经营'
        ],
        current,
        completed:false,
        recommended:
          recommendedRoute(),
        primaryAction:
          primaryAction(),
        blockers:
          blockers()
      };
    }

    return {
      version:VERSION,
      phase:'operation',
      title:'长期经营与扩张',
      steps:[
        '营业',
        '菜单',
        '供应',
        '口碑',
        '扩张'
      ],
      current:
        shop
          ? 1
          : 0,
      completed:false,
      recommended:{
        routeId:'shop',
        params:
          shop
            ? {
                shopId:
                  shop.id
              }
            : {}
      },
      primaryAction:
        primaryAction(),
      blockers:[]
    };
  }

  function startupRoute() {
    repairSafeInvariants();

    const progress =
      openingProgress();

    if (
      progress.stage ===
      'city_setup'
    ) {
      return {
        routeId:'newGame',
        params:{}
      };
    }

    return recommendedRoute();
  }

  function diagnose() {
    const repair =
      repairSafeInvariants();

    const progress =
      openingProgress();

    const shop =
      currentShop();

    const issues = [];

    if (
      business().hasShop &&
      !shop
    ) {
      issues.push(
        'HAS_SHOP_WITHOUT_ACTIVE_SHOP'
      );
    }

    if (
      !business().hasShop &&
      business().shops.length
    ) {
      issues.push(
        'SHOP_ARRAY_WITHOUT_HAS_SHOP'
      );
    }

    return {
      ok:
        issues.length ===
        0,
      version:VERSION,
      phase:
        phase(),
      stage:
        progress.stage,
      currentShopId:
        shop
          ? shop.id
          : null,
      issues,
      repair,
      goal:
        goal()
    };
  }

  return {
    VERSION,
    OPENING_STAGE_ORDER,
    business,
    currentShop,
    repairSafeInvariants,
    openingProgress,
    lifecycleStage,
    phase,
    readiness,
    blockers,
    recommendedRoute,
    primaryAction,
    executePrimary,
    goal,
    startupRoute,
    diagnose
  };
}

const coordinator =
  createCoordinator();

coordinator.createCoordinator =
  createCoordinator;

module.exports =
  coordinator;
