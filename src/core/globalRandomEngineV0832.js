'use strict';

const gameState =
  require('./gameState.js');

const seedManager =
  require('./seedManagerV0813.js');

const {
  SeededRng
} = require('../foundation/rng.js');

const VERSION =
  '0.8.32';

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function getStore() {
  const data =
    gameState.getData();

  data.random =
    data.random &&
    typeof data.random ===
      'object' &&
    !Array.isArray(
      data.random
    )
      ? data.random
      : {};

  data.random.version =
    Number(
      data.random.version
    ) ||
    1;

  data.random.streamEngineVersion =
    VERSION;

  data.random.streams =
    data.random.streams &&
    typeof data.random.streams ===
      'object' &&
    !Array.isArray(
      data.random.streams
    )
      ? data.random.streams
      : {};

  return data.random;
}

function streamKey(
  namespace,
  scope
) {
  return [
    String(
      namespace ||
      'default'
    ),
    String(
      scope == null
        ? ''
        : scope
    )
  ].join('|');
}

function ensureStream(
  namespace,
  scope
) {
  const store =
    getStore();

  const key =
    streamKey(
      namespace,
      scope
    );

  const derivedSeed =
    seedManager
      .deriveSeed(
        namespace,
        scope
      );

  if (
    !store.streams[key] ||
    typeof store.streams[key] !==
      'object'
  ) {
    const rng =
      new SeededRng(
        derivedSeed
      );

    store.streams[key] = {
      version:VERSION,
      namespace:
        String(
          namespace ||
          'default'
        ),
      scope:
        scope == null
          ? ''
          : String(scope),
      seed:
        derivedSeed,
      state:
        rng.state >>> 0,
      draws:0
    };
  }

  const stream =
    store.streams[key];

  stream.version =
    VERSION;

  if (
    !Number.isFinite(
      Number(
        stream.seed
      )
    )
  ) {
    stream.seed =
      derivedSeed;
  }

  if (
    !Number.isFinite(
      Number(
        stream.state
      )
    )
  ) {
    const rng =
      new SeededRng(
        stream.seed
      );

    stream.state =
      rng.state >>> 0;
  }

  stream.draws =
    Math.max(
      0,
      Math.floor(
        Number(
          stream.draws
        ) ||
        0
      )
    );

  return stream;
}

function consume(
  namespace,
  scope,
  operation
) {
  const stream =
    ensureStream(
      namespace,
      scope
    );

  const rng =
    new SeededRng(
      stream.seed
    );

  rng.state =
    Number(
      stream.state
    ) >>> 0;

  const result =
    operation(rng);

  stream.state =
    rng.state >>> 0;

  stream.draws +=
    1;

  return result;
}

function next(
  namespace,
  scope
) {
  return consume(
    namespace,
    scope,
    rng =>
      rng.next()
  );
}

function float(
  namespace,
  scope,
  min,
  max
) {
  return consume(
    namespace,
    scope,
    rng =>
      rng.float(
        Number(min) || 0,
        Number(max) || 0
      )
  );
}

function int(
  namespace,
  scope,
  min,
  max
) {
  return consume(
    namespace,
    scope,
    rng =>
      rng.int(
        Math.floor(
          Number(min) || 0
        ),
        Math.floor(
          Number(max) || 0
        )
      )
  );
}

function chance(
  namespace,
  scope,
  probability
) {
  return consume(
    namespace,
    scope,
    rng =>
      rng.chance(
        Number(
          probability
        ) ||
        0
      )
  );
}

function pick(
  namespace,
  scope,
  items
) {
  return consume(
    namespace,
    scope,
    rng =>
      rng.pick(
        items
      )
  );
}

function weighted(
  namespace,
  scope,
  items,
  getWeight
) {
  return consume(
    namespace,
    scope,
    rng =>
      rng.weighted(
        items,
        getWeight
      )
  );
}

function shuffle(
  namespace,
  scope,
  items
) {
  const out =
    Array.isArray(items)
      ? items.slice()
      : [];

  for (
    let i =
      out.length -
      1;
    i >
    0;
    i--
  ) {
    const j =
      int(
        namespace,
        scope,
        0,
        i
      );

    const temp =
      out[i];

    out[i] =
      out[j];

    out[j] =
      temp;
  }

  return out;
}

function sample(
  namespace,
  scope,
  items,
  count
) {
  return shuffle(
    namespace,
    scope,
    items
  ).slice(
    0,
    Math.max(
      0,
      Math.min(
        Array.isArray(items)
          ? items.length
          : 0,
        Math.floor(
          Number(count) || 0
        )
      )
    )
  );
}

function preview(
  namespace,
  scope,
  count
) {
  const rng =
    seedManager
      .createRng(
        namespace,
        scope
      );

  const total =
    Math.max(
      1,
      Math.min(
        100,
        Number(count) || 5
      )
    );

  const rows = [];

  for (
    let i = 0;
    i < total;
    i++
  ) {
    rows.push(
      rng.next()
    );
  }

  return rows;
}

function resetStream(
  namespace,
  scope
) {
  const store =
    getStore();

  const key =
    streamKey(
      namespace,
      scope
    );

  delete store.streams[
    key
  ];

  return clone(
    ensureStream(
      namespace,
      scope
    )
  );
}

function resetNamespace(
  namespace
) {
  const store =
    getStore();

  const prefix =
    String(
      namespace ||
      'default'
    ) +
    '|';

  let count = 0;

  for (
    const key
    of Object.keys(
      store.streams
    )
  ) {
    if (
      key.startsWith(
        prefix
      )
    ) {
      delete store.streams[key];
      count += 1;
    }
  }

  return count;
}

function snapshot() {
  const store =
    getStore();

  return {
    version:VERSION,
    masterSeed:
      seedManager
        .ensureMasterSeed(),
    generation:
      Number(
        store.generation
      ) ||
      0,
    streamCount:
      Object.keys(
        store.streams
      ).length,
    streams:
      clone(
        store.streams
      )
  };
}

function diagnose() {
  const snap =
    snapshot();

  const invalid = [];

  for (
    const [
      key,
      stream
    ]
    of Object.entries(
      snap.streams
    )
  ) {
    if (
      !Number.isFinite(
        Number(
          stream.state
        )
      ) ||
      !Number.isFinite(
        Number(
          stream.seed
        )
      )
    ) {
      invalid.push(key);
    }
  }

  return {
    ok:
      invalid.length ===
      0,
    version:VERSION,
    masterSeed:
      snap.masterSeed,
    streamCount:
      snap.streamCount,
    invalid
  };
}

module.exports = {
  VERSION,
  getStore,
  streamKey,
  ensureStream,
  next,
  float,
  int,
  chance,
  pick,
  weighted,
  shuffle,
  sample,
  preview,
  resetStream,
  resetNamespace,
  snapshot,
  diagnose
};
