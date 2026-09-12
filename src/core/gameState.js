'use strict';

/**
 * 游戏全局状态
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

    // 时间倍率
    speed: 1,

    // 是否暂停
    paused: false
  },

  world: {
    // 内部城市ID，不给玩家看
    currentCityId: 'yunzhou',

    // 显示名称由玩家命名或随机生成
    cityName: '',

    currentDistrictId: 'university',

    weather: 'sunny',
    temperature: 23
  },

  business: {
    hasShop: false,
    currentShopId: null,
    shops: []
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

/**
 * 兼容旧存档。
 * 新增字段时不会把旧存档直接弄坏。
 */
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
    const speed =
      Number(
        this.data.time.speed
      );

    return speed || 1;
  }

  setTimeSpeed(speed) {
    const value =
      Number(speed);

    const allowed = [
      1,
      2,
      5,
      10
    ];

    if (
      allowed.indexOf(
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
