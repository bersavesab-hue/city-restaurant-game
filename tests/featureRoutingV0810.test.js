'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const sceneManager = require('../src/core/sceneManager.js');
const router = require('../src/core/entryRouterV0810.js');

sceneManager.reset();

function scene(id) {
  return {
    id,
    enter(payload) {
      this.payload = payload || {};
    },
    exit() {},
    render() {},
    update() {},
    handleTap() { return false; }
  };
}

[
  'city',
  'shop',
  'district',
  'propertyMarket',
  'renovation',
  'equipment',
  'license',
  'staff',
  'schedule',
  'staffCareer',
  'research',
  'supply',
  'business',
  'dynamicWorld',
  'system',
  'featureHub'
].forEach(id => sceneManager.register(id, scene(id)));

assert.equal(router.VERSION, '0.8.10');
assert.equal(router.HISTORY_LIMIT, 32);
assert.ok(router.install(), 'router install must succeed');

assert.ok(sceneManager.switchTo('city'), 'legacy sceneManager.switchTo should be routed');
assert.equal(sceneManager.getCurrentId(), 'city');

assert.ok(sceneManager.switchTo('menu'), 'menu alias should resolve');
assert.equal(sceneManager.getCurrentId(), 'research');

assert.ok(
  sceneManager.switchTo('district', { districtId: 'university' }),
  'district route should accept params'
);
assert.equal(sceneManager.getCurrentScene().payload.districtId, 'university');

assert.ok(sceneManager.back(), 'router back should work');
assert.equal(sceneManager.getCurrentId(), 'research');

assert.equal(sceneManager.switchTo('missing-route'), false);
assert.equal(router.getLastError().code, 'ROUTE_NOT_FOUND');

for (let i = 0; i < 60; i++) {
  sceneManager.switchTo(i % 2 ? 'city' : 'shop');
}
assert.ok(router.getHistory().length <= 32, 'history must be capped');

const diagnosis = router.diagnose();
assert.equal(diagnosis.missing.length, 0, 'all standard routes should be registered in test');
assert.ok(diagnosis.routeCount >= 16, 'route table should expose core entries');

const mainSource = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');
assert.ok(mainSource.includes('V0810_ENTRY_ROUTER_BOOT'));
assert.ok(mainSource.includes("require('./core/entryRouterV0810.js')"));
assert.ok(mainSource.includes("'featureHub'"));

const systemSource = fs.readFileSync(path.join(ROOT, 'src/scenes/systemSceneV086.js'), 'utf8');
assert.ok(systemSource.includes("'feature:hub'"));
assert.ok(systemSource.includes("'featureHub'"));

console.log('V0.8.10 feature routing tests passed');
