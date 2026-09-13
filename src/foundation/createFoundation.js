'use strict';

const PackRegistry = require('./packRegistry.js');
const CompositionEngine = require('./compositionEngine.js');
const { SeededRng } = require('./rng.js');
const { EntityFactory } = require('../entities/entityFactory.js');
const { registerFoundationPacks } = require('../packs/base/foundationPacks.js');

function createFoundation(seed = 'yunzhou-v02') {
  const rng = new SeededRng(seed);
  const registry = registerFoundationPacks(new PackRegistry());
  const composer = new CompositionEngine(registry, rng);
  const entities = new EntityFactory(registry, composer, rng);
  return { rng, registry, composer, entities };
}

module.exports = createFoundation;
