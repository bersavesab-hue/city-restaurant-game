'use strict';

const assert = require('assert');
const bootstrap = require('../src/bootstrap/businessSystemsBootstrap.js');

let installed = 0;
const deps = {
  restaurantSimulation: { update() {} },
  staffCareer: { update() {} },
  foodResearchSystem: { install() { installed += 1; } },
  financialSystem: { VERSION: 103 },
  ratingSystem: { VERSION: 104 }
};

const business = bootstrap.create(deps);
const runtime = {};

business.installAfterRestore(runtime);

assert.strictEqual(installed, 1);
assert.strictEqual(runtime.financialSystem, deps.financialSystem);
assert.strictEqual(runtime.ratingSystem, deps.ratingSystem);
assert.strictEqual(runtime.foodResearch, deps.foodResearchSystem);
assert.strictEqual(runtime.moduleRegistry.restaurant, deps.restaurantSimulation);
assert.deepStrictEqual(business.snapshot().names.sort(), Object.keys(deps).sort());

console.log('businessSystemsBootstrapV111.test.js passed');
