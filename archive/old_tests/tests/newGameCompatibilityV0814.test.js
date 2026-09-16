'use strict';

const assert = require('assert');
const flowModule = require('../src/core/newGameFlowV0814.js');

function legacyState() {
  const data = {
    version:1,
    player:{ cash:43210, brandName:'旧品牌', reputation:88 },
    world:{
      cityName:'旧档城市',
      currentCityId:'yunzhou',
      currentDistrictId:'cbd',
      simulation:{ seed:20260915 }
    },
    business:{
      hasShop:true,
      currentShopId:'legacy_shop',
      shops:[{ id:'legacy_shop', name:'旧档首店', status:'open' }],
      renovations:{},
      openingPrep:{ equipment:{}, permits:{}, staffing:{} }
    },
    progress:{ firstLaunch:false, tutorialStep:3 }
  };

  return {
    getData:() => data,
    getPlayer:() => data.player,
    getWorld:() => data.world,
    getBusiness:() => data.business,
    getRenovations:() => data.business.renovations,
    getOpeningPrep:() => data.business.openingPrep,
    getSimulation:() => data.world.simulation,
    getCityName:() => data.world.cityName || '未命名城市',
    setCityName(name) { data.world.cityName=String(name||'').trim(); return !!data.world.cityName; },
    reset() { throw new Error('legacy init must not reset state'); }
  };
}

const state = legacyState();
const beforeCash = state.getPlayer().cash;
const beforeShopCount = state.getBusiness().shops.length;
let newGameCalls = 0;

const flow = flowModule.createFlow({
  gameState:state,
  saveSystem:{
    save(){ return true; },
    autoSave(){ return true; },
    newGame(){ newGameCalls++; return true; }
  },
  simulationSystem:{ initialize(){ return true; } },
  openingPrepSystem:{ getStaffOverview(){ return { coverage:1 }; } },
  bus:{ emit(){} },
  now:() => 1000
});

const progress = flow.initialize({ fresh:false, restoredFromSave:true });

assert.equal(flow.getStartupRoute().routeId,'city','旧存档不能被强制送回新手页');
assert.equal(progress.state.legacyAdopted,true,'旧存档必须标记兼容接管');
assert.equal(progress.stage,'complete','已有正式营业门店应保持完成状态');
assert.equal(state.getPlayer().cash,beforeCash,'兼容初始化不能改资金');
assert.equal(state.getBusiness().shops.length,beforeShopCount,'兼容初始化不能删门店');
assert.equal(newGameCalls,0,'加载旧存档不能触发新开局');

console.log('V0.8.14 legacy onboarding compatibility tests passed');
