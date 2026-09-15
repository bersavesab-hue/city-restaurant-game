'use strict';

const gameState =
  require('./gameState.js');

const {
  SeededRng,
  hashString
} = require('../foundation/rng.js');

const VERSION = '0.8.13';

function toHex(value) {
  return (
    Number(value) >>> 0
  )
    .toString(16)
    .padStart(8, '0');
}

function createSeedManager(options) {
  const opts = options || {};
  const state =
    opts.gameState ||
    gameState;

  let entropyCounter = 0;

  function getStore() {
    const data =
      state.getData();

    data.random =
      data.random &&
      typeof data.random === 'object' &&
      !Array.isArray(data.random)
        ? data.random
        : {};

    data.random.version = 1;

    data.random.generation =
      Number.isFinite(
        Number(data.random.generation)
      )
        ? Math.max(
            0,
            Math.floor(
              Number(data.random.generation)
            )
          )
        : 0;

    data.random.streams =
      data.random.streams &&
      typeof data.random.streams === 'object' &&
      !Array.isArray(data.random.streams)
        ? data.random.streams
        : {};

    return data.random;
  }

  function legacySimulationSeed() {
    if (
      !state ||
      typeof state.getSimulation !== 'function'
    ) {
      return null;
    }

    const simulation =
      state.getSimulation();

    return simulation &&
      simulation.seed !== undefined &&
      simulation.seed !== null
        ? simulation.seed
        : null;
  }

  function makeMasterSeed(entropy) {
    const world =
      state &&
      typeof state.getWorld === 'function'
        ? state.getWorld()
        : {};

    const source =
      entropy !== undefined &&
      entropy !== null
        ? String(entropy)
        : [
            'auto',
            Date.now(),
            ++entropyCounter,
            world && world.currentCityId || 'city',
            world && world.cityName || 'unnamed'
          ].join('|');

    return (
      'master-' +
      toHex(
        hashString(source)
      )
    );
  }

  function ensureMasterSeed() {
    const store =
      getStore();

    if (
      store.masterSeed !== undefined &&
      store.masterSeed !== null &&
      String(store.masterSeed)
    ) {
      store.masterSeed =
        String(store.masterSeed);

      return store.masterSeed;
    }

    const legacy =
      legacySimulationSeed();

    if (
      legacy !== null &&
      legacy !== undefined
    ) {
      store.masterSeed =
        'legacy-' +
        toHex(
          hashString(
            String(legacy)
          )
        );
    } else {
      store.masterSeed =
        makeMasterSeed();
    }

    return store.masterSeed;
  }

  function setMasterSeed(
    seed,
    optionsValue
  ) {
    const settings =
      optionsValue || {};

    const store =
      getStore();

    store.masterSeed =
      seed === undefined ||
      seed === null ||
      seed === ''
        ? makeMasterSeed()
        : String(seed);

    store.generation =
      Number(store.generation || 0) +
      1;

    store.streams = {};

    if (
      settings.resetSimulation !==
        false &&
      state &&
      typeof state.getSimulation ===
        'function'
    ) {
      state.getSimulation().seed =
        null;
    }

    return store.masterSeed;
  }

  function reseed(entropy) {
    return setMasterSeed(
      makeMasterSeed(
        entropy !== undefined
          ? entropy
          : [
              'reseed',
              Date.now(),
              ++entropyCounter
            ].join('|')
      )
    );
  }

  function deriveSeed(
    namespace,
    scope
  ) {
    const ns =
      String(namespace || 'default');

    const detail =
      scope === undefined ||
      scope === null
        ? ''
        : String(scope);

    const value =
      hashString(
        ensureMasterSeed() +
        '|' + ns +
        '|' + detail
      ) >>> 0;

    return value || 1;
  }

  function createRng(
    namespace,
    scope
  ) {
    return new SeededRng(
      deriveSeed(
        namespace,
        scope
      )
    );
  }

  function getSnapshot() {
    const store =
      getStore();

    return JSON.parse(
      JSON.stringify({
        version:store.version,
        masterSeed:
          ensureMasterSeed(),
        generation:
          store.generation,
        streams:
          store.streams
      })
    );
  }

  function diagnose() {
    const snapshot =
      getSnapshot();

    return {
      version:VERSION,
      masterSeed:
        snapshot.masterSeed,
      generation:
        snapshot.generation,
      simulationSeed:
        legacySimulationSeed()
    };
  }

  return {
    VERSION,
    ensureMasterSeed,
    setMasterSeed,
    reseed,
    deriveSeed,
    createRng,
    getSnapshot,
    diagnose
  };
}

const seedManager =
  createSeedManager();

seedManager.createSeedManager =
  createSeedManager;

module.exports =
  seedManager;
