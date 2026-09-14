'use strict';

/**
 * 游戏全局状态
 *
 * 原则：
 * - 静态规则放在各系统/config中
 * - 当前世界结果放在 state 中
 * - 新字段通过 mergeDefaults 兼容旧存档
 */

const INITIAL_STATE = {
  version: 1,

  player: {
    cash: 50000,
    brandName: '未命名品牌',
    reputation: 0
  },

  time: {
    year: 1,
    month: 4,
    day: 12,
    hour: 10,
    minute: 20,

    speed: 1,
    paused: false
  },

  world: {
    currentCityId: 'yunzhou',
    cityName: '',
    currentDistrictId: 'university',

    // 天气不再写死为“晴23℃”，由 simulationSystem 初始化并每日更新。
    weather: null,
    temperature: null,

    simulation: {
      initialized: false,
      lastProcessedDay: null,
      seed: null,

      districtState: {},

      weatherHistory: [],
      newsFeed: [],

      lastDailySnapshot: null
    },

    dynamicWorld: {
      version: '0.8.15',
      lastProcessedDay: null,
      eventState: null,
      policyState: null,
      npcPool: [],
      dialogueFeed: [],
      barrageFeed: [],
      signalHistory: [],
      modifiers: {},
      metrics: {
        eventsTriggered: 0,
        policiesProposed: 0,
        dialoguesGenerated: 0,
        barragesGenerated: 0
      }
    },

    // V084_LIVE_WORLD_STATE
    liveWorld: {
      version:'0.8.4',
      initialized:false,
      lastProcessedDay:null,
      competitors:[],
      competitorCounts:{
        core:0,
        local:0,
        background:0
      },
      districtPressure:{},
      staffHistory:[],
      marketHistory:[],
      metrics:{
        competitorActions:0,
        openings:0,
        closures:0,
        staffDepartures:0,
        staffEntrepreneurs:0
      }
    }
  },

  business: {
    hasShop: false,
    currentShopId: null,
    shops: [],

    propertyProcess: {
      visits: {},
      negotiations: {},
      leases: {}
    },

    renovations: {},

    renovationTemplates: [],

    openingPrep: {
      equipment: {},
      permits: {},
      staffing: {}
    },

    finance: {
      openingLoans: {}
    },

    restaurantOperations: {
      version: '0.8.3',
      sharedSupplierNetwork: null,
      shops: {}
    }
  },

  progress: {
    firstLaunch: true,
    tutorialStep: 0
  }
};

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function mergeDefaults(
  defaults,
  source
) {
  if (
    source === undefined ||
    source === null
  ) {
    return clone(defaults);
  }

  if (
    Array.isArray(defaults)
  ) {
    return Array.isArray(source)
      ? clone(source)
      : clone(defaults);
  }

  if (
    typeof defaults !== 'object'
  ) {
    return source;
  }

  const result =
    clone(defaults);

  const keys =
    Object.keys(source);

  for (
    let i = 0;
    i < keys.length;
    i++
  ) {
    const key =
      keys[i];

    if (
      defaults[key] !== undefined &&
      defaults[key] !== null &&
      typeof defaults[key] === 'object' &&
      !Array.isArray(defaults[key]) &&
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] =
        mergeDefaults(
          defaults[key],
          source[key]
        );
    } else {
      result[key] =
        clone(source[key]);
    }
  }

  return result;
}

class GameState {
  constructor() {
    this.data =
      clone(INITIAL_STATE);
  }

  getData() {
    return this.data;
  }

  getPlayer() {
    return this.data.player;
  }

  getTime() {
    return this.data.time;
  }

  getWorld() {
    return this.data.world;
  }

  getBusiness() {
    return this.data.business;
  }

  getPropertyProcess() {
    const business =
      this.data.business;

    if (
      !business.propertyProcess
    ) {
      business.propertyProcess = {
        visits: {},
        negotiations: {},
        leases: {}
      };
    }

    return business.propertyProcess;
  }

  getRenovations() {
    const business =
      this.data.business;

    if (
      !business.renovations
    ) {
      business.renovations = {};
    }

    return business.renovations;
  }

  getRenovationTemplates() {
    const business =
      this.data.business;

    if (
      !Array.isArray(
        business
          .renovationTemplates
      )
    ) {
      business
        .renovationTemplates =
        [];
    }

    return business
      .renovationTemplates;
  }

  getOpeningPrep() {
    const business =
      this.data.business;

    if (
      !business.openingPrep
    ) {
      business.openingPrep = {
        equipment: {},
        permits: {},
        staffing: {}
      };
    }

    return business.openingPrep;
  }

  getFinance() {
    const business =
      this.data.business;

    if (
      !business.finance
    ) {
      business.finance = {
        openingLoans: {}
      };
    }

    if (
      !business
        .finance
        .openingLoans
    ) {
      business
        .finance
        .openingLoans =
        {};
    }

    return business.finance;
  }

  getRestaurantOperations() {
    const business =
      this.data.business;

    if (
      !business.restaurantOperations
    ) {
      business.restaurantOperations = {
        version: '0.8.3',
        sharedSupplierNetwork: null,
        shops: {}
      };
    }

    return business.restaurantOperations;
  }

  // V084_GET_LIVE_WORLD
  getLiveWorld() {
    const world =
      this.data.world;

    if (
      !world.liveWorld ||
      typeof world.liveWorld !==
        'object'
    ) {
      world.liveWorld = {
        version:'0.8.4',
        initialized:false,
        lastProcessedDay:null,
        competitors:[],
        competitorCounts:{
          core:0,
          local:0,
          background:0
        },
        districtPressure:{},
        staffHistory:[],
        marketHistory:[],
        metrics:{
          competitorActions:0,
          openings:0,
          closures:0,
          staffDepartures:0,
          staffEntrepreneurs:0
        }
      };
    }

    return world.liveWorld;
  }

  getDynamicWorld() {
    const world =
      this.data.world;

    if (
      !world.dynamicWorld
    ) {
      world.dynamicWorld = {
        version: '0.8.15',
        lastProcessedDay: null,
        eventState: null,
        policyState: null,
        npcPool: [],
        dialogueFeed: [],
        barrageFeed: [],
        signalHistory: [],
        modifiers: {},
        metrics: {
          eventsTriggered: 0,
          policiesProposed: 0,
          dialoguesGenerated: 0,
          barragesGenerated: 0
        }
      };
    }

    return world.dynamicWorld;
  }

  getSimulation() {
    const world =
      this.data.world;

    if (!world.simulation) {
      world.simulation =
        clone(
          INITIAL_STATE
            .world
            .simulation
        );
    }

    return world.simulation;
  }

  /* =========================
     城市名称
  ========================= */

  getCityName() {
    const name =
      this.data.world.cityName;

    return name &&
      name.trim()
      ? name
      : '未命名城市';
  }

  setCityName(name) {
    const cleanName =
      String(
        name || ''
      ).trim();

    if (!cleanName) {
      return false;
    }

    this.data.world.cityName =
      cleanName.slice(
        0,
        12
      );

    return true;
  }

  clearCityName() {
    this.data.world.cityName =
      '';
  }

  /* =========================
     时间控制
  ========================= */

  getTimeSpeed() {
    const config =
      require('./simulationConfig.js');

    const allowed =
      config.time
        .allowedSpeeds;

    const raw =
      Number(
        this.data.time.speed
      ) ||
      1;

    if (
      allowed.indexOf(
        raw
      ) >= 0
    ) {
      return raw;
    }

    let migrated =
      allowed[0];

    for (
      const value
      of allowed
    ) {
      if (
        Math.abs(
          value -
          raw
        ) <
        Math.abs(
          migrated -
          raw
        )
      ) {
        migrated =
          value;
      }
    }

    this.data.time.speed =
      migrated;

    return migrated;
  }

  setTimeSpeed(speed) {
    const config =
      require('./simulationConfig.js');

    const value =
      Number(speed);

    if (
      config.time
        .allowedSpeeds
        .indexOf(
          value
        ) === -1
    ) {
      return false;
    }

    this.data.time.speed =
      value;

    this.data.time.paused =
      false;

    return true;
  }

  isTimePaused() {
    return !!this.data.time.paused;
  }

  setTimePaused(value) {
    this.data.time.paused =
      !!value;
  }

  toggleTimePause() {
    this.data.time.paused =
      !this.data.time.paused;

    return (
      this.data.time.paused
    );
  }

  /* =========================
     玩家资金
  ========================= */

  setCash(value) {
    this.data.player.cash =
      Math.max(
        0,
        Math.floor(value)
      );
  }

  addCash(value) {
    this.setCash(
      this.data.player.cash +
      value
    );
  }

  spendCash(value) {
    if (
      this.data.player.cash <
      value
    ) {
      return false;
    }

    this.data.player.cash -=
      value;

    return true;
  }

  /* =========================
     世界状态
  ========================= */

  setDistrict(id) {
    this.data.world.currentDistrictId =
      id;
  }

  setWeather(
    weather,
    temperature
  ) {
    this.data.world.weather =
      weather || null;

    this.data.world.temperature =
      temperature == null
        ? null
        : Number(
            temperature
          );
  }

  addShop(shop) {
    this.data.business.shops.push(
      shop
    );

    this.data.business.hasShop =
      true;

    this.data.business.currentShopId =
      shop.id;
  }

  /* =========================
     存档
  ========================= */

  reset() {
    this.data =
      clone(INITIAL_STATE);
  }

  exportSave() {
    return clone(
      this.data
    );
  }

  importSave(saveData) {
    if (!saveData) {
      return false;
    }

    if (
      saveData.version !==
      INITIAL_STATE.version
    ) {
      return false;
    }

    this.data =
      mergeDefaults(
        INITIAL_STATE,
        saveData
      );

    return true;
  }
}

const gameState =
  new GameState();

module.exports =
  gameState;
