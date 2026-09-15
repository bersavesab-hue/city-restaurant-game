'use strict';

const { hashString } =
  require('../foundation/rng.js');

const CURRENT_SAVE_VERSION = 2;
const CURRENT_STATE_VERSION = 1;

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return !!value &&
    typeof value === 'object' &&
    !Array.isArray(value);
}

function stableSerialize(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map(stableSerialize).join(',') + ']';
  }

  const keys = Object.keys(value).sort();
  return '{' + keys.map(key =>
    JSON.stringify(key) + ':' + stableSerialize(value[key])
  ).join(',') + '}';
}

function checksumGameData(gameData) {
  const hash = hashString(
    stableSerialize(gameData)
  );

  return hash
    .toString(16)
    .padStart(8, '0');
}

function normalizeRandomState(gameData) {
  const data = gameData;

  data.random =
    isObject(data.random)
      ? data.random
      : {};

  data.random.version = 1;

  const legacySeed =
    data.world &&
    data.world.simulation
      ? data.world.simulation.seed
      : null;

  if (
    data.random.masterSeed === undefined ||
    data.random.masterSeed === null ||
    data.random.masterSeed === ''
  ) {
    data.random.masterSeed =
      legacySeed === undefined ||
      legacySeed === null
        ? null
        : 'legacy-' +
          hashString(
            String(legacySeed)
          )
            .toString(16)
            .padStart(8, '0');
  } else {
    data.random.masterSeed =
      String(data.random.masterSeed);
  }

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
    isObject(data.random.streams)
      ? data.random.streams
      : {};

  return data.random;
}

function normalizeGameData(input) {
  if (!isObject(input)) {
    return {
      ok:false,
      code:'GAME_DATA_INVALID',
      gameData:null
    };
  }

  const gameData = clone(input);

  if (
    gameData.version === undefined ||
    gameData.version === null
  ) {
    gameData.version = CURRENT_STATE_VERSION;
  }

  if (
    Number(gameData.version) !==
    CURRENT_STATE_VERSION
  ) {
    return {
      ok:false,
      code:'STATE_VERSION_UNSUPPORTED',
      gameData:null
    };
  }

  gameData.version =
    CURRENT_STATE_VERSION;

  normalizeRandomState(gameData);

  return {
    ok:true,
    code:null,
    gameData
  };
}

function looksLikeRawGameData(value) {
  return isObject(value) &&
    (
      value.player ||
      value.world ||
      value.business ||
      value.progress ||
      value.version !== undefined
    );
}

function createEnvelope(
  gameData,
  options
) {
  const opts = options || {};
  const normalized =
    normalizeGameData(gameData);

  if (!normalized.ok) {
    return null;
  }

  const data = normalized.gameData;

  return {
    saveVersion:
      CURRENT_SAVE_VERSION,
    gameVersion:
      opts.gameVersion ||
      null,
    savedAt:
      Number(opts.savedAt) ||
      Date.now(),
    checksum:
      checksumGameData(data),
    gameData:
      data
  };
}

function migrate(
  raw,
  options
) {
  const opts = options || {};

  if (!raw || typeof raw !== 'object') {
    return {
      ok:false,
      code:'SAVE_MISSING',
      migrated:false,
      envelope:null
    };
  }

  let envelope;
  let sourceVersion;

  if (
    isObject(raw) &&
    isObject(raw.gameData)
  ) {
    sourceVersion =
      raw.saveVersion === undefined ||
      raw.saveVersion === null
        ? 1
        : Number(raw.saveVersion);

    envelope = clone(raw);
  } else if (
    looksLikeRawGameData(raw)
  ) {
    sourceVersion = 0;
    envelope = {
      saveVersion:0,
      savedAt:null,
      gameVersion:null,
      gameData:clone(raw)
    };
  } else {
    return {
      ok:false,
      code:'SAVE_SHAPE_INVALID',
      migrated:false,
      envelope:null
    };
  }

  if (
    !Number.isFinite(sourceVersion) ||
    sourceVersion < 0
  ) {
    sourceVersion = 1;
  }

  if (
    sourceVersion >
    CURRENT_SAVE_VERSION
  ) {
    return {
      ok:false,
      code:'FUTURE_SAVE_VERSION',
      migrated:false,
      envelope:null
    };
  }

  const normalized =
    normalizeGameData(
      envelope.gameData
    );

  if (!normalized.ok) {
    return {
      ok:false,
      code:normalized.code,
      migrated:false,
      envelope:null
    };
  }

  if (
    sourceVersion ===
      CURRENT_SAVE_VERSION &&
    envelope.checksum &&
    String(envelope.checksum) !==
      checksumGameData(
        normalized.gameData
      )
  ) {
    return {
      ok:false,
      code:'CHECKSUM_MISMATCH',
      migrated:false,
      envelope:null
    };
  }

  const result =
    createEnvelope(
      normalized.gameData,
      {
        gameVersion:
          envelope.gameVersion ||
          opts.gameVersion ||
          null,
        savedAt:
          envelope.savedAt ||
          Date.now()
      }
    );

  if (!result) {
    return {
      ok:false,
      code:'MIGRATION_FAILED',
      migrated:false,
      envelope:null
    };
  }

  const hadMasterSeed =
    !!(
      envelope.gameData &&
      envelope.gameData.random &&
      envelope.gameData.random.masterSeed
    );

  return {
    ok:true,
    code:null,
    sourceVersion,
    migrated:
      sourceVersion !==
        CURRENT_SAVE_VERSION ||
      !envelope.checksum ||
      !hadMasterSeed,
    envelope:result
  };
}

module.exports = {
  CURRENT_SAVE_VERSION,
  CURRENT_STATE_VERSION,
  stableSerialize,
  checksumGameData,
  normalizeRandomState,
  normalizeGameData,
  createEnvelope,
  migrate
};
