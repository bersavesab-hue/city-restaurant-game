'use strict';

const assert = require('assert');
const registry = require('../src/data/dataDomainRegistry.js');
const idRules = require('../src/data/idRules.js');
const contract = require('../src/data/gameDataContract.js');
const RuntimeDataRegistry = require('../src/data/runtimeDataRegistry.js');
const { audit } = require('../scripts/data-contract-audit.js');

assert.strictEqual(registry.domains.length, 24);
assert.strictEqual(registry.getDomainsByKind(registry.DOMAIN_KIND.CONTENT).length, 18);
assert.strictEqual(registry.getDomainsByKind(registry.DOMAIN_KIND.RULE).length, 6);

assert.strictEqual(idRules.makeEntityId('ingredients', 1), 'ing_0001');
assert.strictEqual(idRules.makeEntityId('dishes', 350), 'dish_0350');
assert.strictEqual(idRules.makeEntityId('recipes', 500), 'recipe_0500');
assert.strictEqual(idRules.validateEntityId('ingredients', 'ing_0001').ok, true);
assert.strictEqual(idRules.validateEntityId('ingredients', 'dish_0001').ok, false);
assert.strictEqual(idRules.policy.neverReuseIds, true);

assert.ok(contract.domains.ingredients);
assert.ok(contract.domains.recipes);
assert.ok(contract.domains.economyBalance);
assert.ok(contract.semantics.level);
assert.ok(contract.semantics.quality);
assert.ok(contract.semantics.tier);
assert.ok(contract.semantics.type);

const runtime = new RuntimeDataRegistry();
runtime.register('ingredients', [{ id: 'ing_0001', name: '测试食材' }]);
assert.strictEqual(runtime.has('ingredients'), true);
assert.strictEqual(runtime.get('ingredients')[0].name, '测试食材');
assert.deepStrictEqual(runtime.listMissingDependencies('suppliers'), []);
runtime.register('cookingMethods', [{ id: 'cook_0001', name: '测试烹饪方式' }]);
assert.deepStrictEqual(runtime.listMissingDependencies('equipment'), []);

assert.throws(
  () => runtime.register('dishes', [{ id: 'food_0001', name: '错误前缀' }]),
  /Invalid entity id/
);
assert.throws(
  () => runtime.register('ingredients', [
    { id: 'ing_0002', name: '重复A' },
    { id: 'ing_0002', name: '重复B' }
  ]),
  /Duplicate id/
);

const report = audit();
assert.deepStrictEqual(report.errors, []);

console.log('dataContractV2.test.js PASS');
