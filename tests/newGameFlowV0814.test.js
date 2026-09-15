'use strict';

const assert =
  require('assert');

const moduleUnderTest =
  require('../src/core/newGameFlowV0814.js');

function makeState() {
  let data;

  function reset() {
    data = {
      version:1,
      player:{
        cash:50000,
        brandName:'未命名品牌',
        reputation:0
      },
      world:{
        cityName:'',
        currentCityId:'yunzhou',
        currentDistrictId:'university',
        simulation:{ seed:null }
      },
      business:{
        hasShop:false,
        currentShopId:null,
        shops:[],
        renovations:{},
        openingPrep:{
          equipment:{},
          permits:{},
          staffing:{}
        }
      },
      progress:{
        firstLaunch:true,
        tutorialStep:0
      }
    };
  }

  reset();

  return {
    getData:() => data,
    getPlayer:() => data.player,
    getWorld:() => data.world,
    getBusiness:() => data.business,
    getRenovations:() => data.business.renovations,
    getOpeningPrep:() => data.business.openingPrep,
    getSimulation:() => data.world.simulation,
    setCityName(name) {
      const clean = String(name || '').trim();
      if (!clean) return false;
      data.world.cityName = clean.slice(0, 12);
      return true;
    },
    getCityName() {
      return data.world.cityName || '未命名城市';
    },
    reset
  };
}

const state =
  makeState();

let coverage = 0;
let saveCalls = 0;
let autoSaveCalls = 0;
let simulationInitCalls = 0;
let busEvents = [];

const fakeSave = {
  newGame() {
    state.reset();
    saveCalls++;
    return true;
  },
  save() {
    saveCalls++;
    return true;
  },
  autoSave() {
    autoSaveCalls++;
    return true;
  }
};

const flow =
  moduleUnderTest
    .createFlow({
      gameState:state,
      saveSystem:fakeSave,
      simulationSystem:{
        initialize() {
          simulationInitCalls++;
          return true;
        }
      },
      openingPrepSystem:{
        getStaffOverview() {
          return { coverage };
        }
      },
      bus:{
        emit(type, payload) {
          busEvents.push({ type, payload });
        }
      },
      now:() => 123456789
    });

let progress =
  flow.initialize({
    fresh:true,
    restoredFromSave:false
  });

assert.equal(
  progress.stage,
  'city_setup'
);
assert.equal(
  flow.getStartupRoute().routeId,
  'newGame'
);

const confirmed =
  flow.confirmCityName(
    '星河市'
  );

assert.ok(confirmed.ok);
assert.equal(
  state.getWorld().cityName,
  '星河市'
);
assert.equal(
  confirmed.stage,
  'property_search'
);
assert.equal(
  confirmed.next.routeId,
  'city'
);
assert.ok(autoSaveCalls > 0);

const business =
  state.getBusiness();

business.hasShop = true;
business.currentShopId = 'shop_1';
business.shops.push({
  id:'shop_1',
  name:'首店',
  status:'leased_pending_renovation'
});

assert.equal(
  flow.deriveStage(),
  'renovation'
);

state.getRenovations().shop_1 = {
  status:'completed'
};

assert.equal(
  flow.deriveStage(),
  'equipment'
);

state.getOpeningPrep()
  .equipment
  .shop_1 = {
    status:'installed'
  };

assert.equal(
  flow.deriveStage(),
  'license'
);

state.getOpeningPrep()
  .permits
  .shop_1 = {
    items:{
      business:{ status:'approved' },
      food:{ status:'approved' },
      fire:{ status:'approved_with_conditions' }
    }
  };

assert.equal(
  flow.deriveStage(),
  'staff'
);

coverage = 1;

assert.equal(
  flow.deriveStage(),
  'trial'
);
assert.equal(
  flow.getRecommendedRoute().routeId,
  'shop'
);

business.shops[0].status =
  'trial_opening';
assert.equal(
  flow.deriveStage(),
  'trial'
);

business.shops[0].status =
  'trial_complete';
assert.equal(
  flow.deriveStage(),
  'formal_open'
);

business.shops[0].status =
  'open';
assert.equal(
  flow.deriveStage(),
  'complete'
);

progress =
  flow.getProgress();
assert.ok(progress.completed);

const restarted =
  flow.restart();

assert.equal(
  restarted.stage,
  'city_setup'
);
assert.equal(
  state.getBusiness().shops.length,
  0
);
assert.equal(
  simulationInitCalls,
  1
);
assert.ok(saveCalls >= 2);
assert.ok(
  busEvents.some(
    item =>
      item.type ===
      'openingFlow.restarted'
  )
);

console.log(
  'V0.8.14 new game flow tests passed'
);
