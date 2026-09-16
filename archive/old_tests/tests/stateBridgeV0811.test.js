'use strict';

const assert = require('assert');
const busModule = require('../src/core/globalStateBusV0811.js');
const bridgeModule = require('../src/core/stateBridgeV0811.js');

function makeState() {
  const data = {
    player: { cash: 50000 },
    time: { year: 1, month: 4, day: 12, hour: 10, minute: 20, speed: 1, paused: false },
    world: { currentDistrictId: 'university', cityName: '', weather: 'sunny', temperature: 23 },
    business: {
      hasShop: false,
      currentShopId: null,
      shops: [],
      finance: { openingLoans: {} },
      propertyProcess: { visits: {}, negotiations: {}, leases: {} },
      restaurantOperations: { shops: {} }
    }
  };

  return {
    data,
    getPlayer() { return data.player; },
    getTime() { return data.time; },
    getWorld() { return data.world; },
    getBusiness() { return data.business; },
    getFinance() { return data.business.finance; },
    getPropertyProcess() { return data.business.propertyProcess; },
    getRestaurantOperations() { return data.business.restaurantOperations; },
    setCash(value) { data.player.cash = Math.max(0, Math.floor(value)); },
    addCash(value) { this.setCash(data.player.cash + value); },
    spendCash(value) {
      if (data.player.cash < value) return false;
      data.player.cash -= value;
      return true;
    },
    setCityName(name) { data.world.cityName = String(name || '').trim(); return !!data.world.cityName; },
    clearCityName() { data.world.cityName = ''; },
    setDistrict(id) { data.world.currentDistrictId = id; },
    setWeather(weather, temperature) { data.world.weather = weather; data.world.temperature = temperature; },
    addShop(shop) { data.business.shops.push(shop); data.business.hasShop = true; data.business.currentShopId = shop.id; },
    setTimeSpeed(speed) { data.time.speed = speed; data.time.paused = false; return true; },
    setTimePaused(value) { data.time.paused = !!value; },
    toggleTimePause() { data.time.paused = !data.time.paused; return data.time.paused; },
    reset() {
      data.player.cash = 50000;
      data.world.currentDistrictId = 'university';
      data.business.shops.length = 0;
      data.business.hasShop = false;
    },
    importSave() { return true; }
  };
}

const gameState = makeState();

const timeSystem = {
  setSpeed(speed) { return gameState.setTimeSpeed(speed); },
  pause() { gameState.setTimePaused(true); },
  resume() { gameState.setTimePaused(false); },
  togglePause() { return gameState.toggleTimePause(); },
  setTime(hour, minute) { gameState.data.time.hour = hour; gameState.data.time.minute = minute; return true; },
  addMinutes(minutes) {
    const total = gameState.data.time.hour * 60 + gameState.data.time.minute + Number(minutes || 0);
    gameState.data.time.hour = Math.floor((total / 60) % 24);
    gameState.data.time.minute = ((total % 60) + 60) % 60;
    return true;
  },
  addHours(hours) { return this.addMinutes(Number(hours || 0) * 60); },
  addDays(days) { gameState.data.time.day += Number(days || 0); return true; },
  nextDay() { gameState.data.time.day += 1; return true; },
  update(deltaMs, onStep) {
    if (gameState.data.time.paused) return 0;
    const advanced = Math.max(0, Math.floor(Number(deltaMs || 0) / 100));
    if (!advanced) return 0;
    this.addMinutes(advanced);
    if (typeof onStep === 'function') onStep(advanced);
    return advanced;
  }
};

const scenes = new Set(['city', 'shop', 'system']);
const sceneManager = {
  current: null,
  has(id) { return scenes.has(id); },
  getCurrentId() { return this.current; },
  switchTo(id) {
    if (!this.has(id)) return false;
    this.current = id;
    return true;
  }
};

const entryRouter = {
  history: [],
  getCurrentRoute() { return sceneManager.getCurrentId(); },
  getHistory() { return this.history.slice(); },
  open(id, payload) {
    const before = sceneManager.getCurrentId();
    const ok = sceneManager.switchTo(id, payload);
    if (ok && before && before !== id) this.history.push(before);
    return ok;
  },
  back() {
    const id = this.history.pop();
    return id ? sceneManager.switchTo(id) : false;
  }
};

const bus = busModule.createBus({ historyLimit: 128 });
const bridge = bridgeModule.createBridge({
  bus,
  gameState,
  timeSystem,
  sceneManager,
  entryRouter
});

assert.equal(bridge.VERSION, '0.8.11');
assert.ok(bridge.install(), 'bridge install should succeed');
assert.ok(bridge.install(), 'bridge install must be idempotent');

const events = [];
bus.on('*', event => events.push(event.type));

const playerRevisionBefore = bus.getDomainRevision('player');
gameState.setCash(60000);
assert.equal(gameState.getPlayer().cash, 60000);
assert.ok(bus.getDomainRevision('player') > playerRevisionBefore, 'cash mutation must revise player domain');
assert.ok(events.includes('player.cash.changed'), 'cash mutation must emit specific event');
assert.ok(events.includes('state.action'), 'cash mutation must emit generic action event');

const actionCountBefore = events.filter(x => x === 'state.action').length;
gameState.addCash(5000);
const actionCountAfter = events.filter(x => x === 'state.action').length;
assert.ok(actionCountAfter > actionCountBefore, 'nested addCash/setCash must still flush safely');
assert.equal(gameState.getPlayer().cash, 65000);

const worldRevisionBefore = bus.getDomainRevision('world');
gameState.setDistrict('cbd');
assert.ok(bus.getDomainRevision('world') > worldRevisionBefore);
assert.ok(events.includes('world.district.changed'));

gameState.setWeather('rain', 18);
assert.ok(events.includes('world.weather.changed'));

gameState.addShop({ id: 'shop-1', name: '测试门店' });
assert.ok(events.includes('business.shop.added'));
assert.equal(bus.getDomainSnapshot('business').shops.length, 1);

sceneManager.switchTo('city');
sceneManager.switchTo('shop');
assert.ok(events.includes('route.changed'), 'scene navigation must emit route event');
assert.equal(bus.getDomainSnapshot('route').sceneId, 'shop');

entryRouter.open('system');
assert.equal(sceneManager.getCurrentId(), 'system');
assert.ok(bus.getHistory('route.changed').length >= 3, 'router direct open must also be observable');

const timeRevisionBefore = bus.getDomainRevision('time');
const advanced = timeSystem.update(500);
assert.equal(advanced, 5);
assert.ok(bus.getDomainRevision('time') > timeRevisionBefore, 'time update must revise time domain');
assert.ok(events.includes('time.advanced'), 'time update must emit aggregated advance event');

const beforeRuntime = bus.getDomainRevision('player');
gameState.data.player.cash += 7; // simulate legacy subsystem direct nested mutation
const changed = bridge.syncRuntime({ restaurantChanged: true });
assert.ok(changed >= 1, 'runtime sync must discover direct legacy mutations');
assert.ok(bus.getDomainRevision('player') > beforeRuntime);
assert.ok(events.includes('runtime.synced'));

const diagnosis = bridge.diagnose();
assert.equal(diagnosis.installed, true);
assert.ok(diagnosis.wrappedCount >= 10);
assert.ok(diagnosis.bus.domains.player.initialized);
assert.ok(diagnosis.bus.domains.route.initialized);

bridge.uninstallForTests();
assert.equal(bridge.diagnose().installed, false);

console.log('V0.8.11 state bridge tests passed');
