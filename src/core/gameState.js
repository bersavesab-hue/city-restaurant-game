'use strict';

/**
 * 游戏全局状态
 * 后续城市、门店、资金、日期、品牌等系统
 * 都从这里读取和修改。
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
    minute: 20
  },

  world: {
    currentCityId: 'yunzhou',
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

class GameState {
  constructor() {
    this.data = clone(INITIAL_STATE);
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

  setCash(value) {
    this.data.player.cash =
      Math.max(0, Math.floor(value));
  }

  addCash(value) {
    this.setCash(
      this.data.player.cash + value
    );
  }

  spendCash(value) {
    if (
      this.data.player.cash < value
    ) {
      return false;
    }

    this.data.player.cash -= value;

    return true;
  }

  setDistrict(id) {
    this.data.world.currentDistrictId =
      id;
  }

  addShop(shop) {
    this.data.business.shops.push(shop);

    this.data.business.hasShop = true;

    this.data.business.currentShopId =
      shop.id;
  }

  reset() {
    this.data = clone(INITIAL_STATE);
  }

  exportSave() {
    return clone(this.data);
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

    this.data = clone(saveData);

    return true;
  }
}

const gameState =
  new GameState();

module.exports = gameState;
