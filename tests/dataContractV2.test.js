'use strict';

const assert = require('assert');
const registry = require('../src/data/dataDomainRegistry.js');
const idRules = require('../src/data/idRules.js');
const contract = require('../src/data/gameDataContract.js');
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

const report = audit();
assert.deepStrictEqual(report.errors, []);

console.log('dataContractV2.test.js PASS');
