'use strict';

const gameState =
  require('../core/gameState.js');

const personEngine =
  require('../systems/personEngine.js');

const dialogueEngine =
  require('../dialogue/dialogueEngineV0815.js');

const dialoguePack =
  require('../dialogue/dialoguePackV0815.js');

const barrageEngine =
  require('../barrage/barrageEngineV0815.js');

const barragePack =
  require('../barrage/barragePackV0815.js');

const seedManager =
  require('../core/seedManagerV0813.js');

const VERSION =
  '0.8.31';

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function getRoot() {
  const business =
    gameState.getBusiness();

  business.socialRelations =
    business.socialRelations &&
    typeof business.socialRelations ===
      'object'
      ? business.socialRelations
      : {
          version:VERSION,
          shops:{}
        };

  business.socialRelations.version =
    VERSION;

  business.socialRelations.shops =
    business.socialRelations.shops ||
    {};

  return business.socialRelations;
}

function ensureShop(shopId) {
  const root =
    getRoot();

  const id =
    String(shopId);

  if (!root.shops[id]) {
    root.shops[id] = {
      version:VERSION,
      shopId:id,
      actors:{},
      interactions:[],
      dialogueFeed:[],
      barrageFeed:[],
      metrics:{
        interactions:0,
        dialogues:0,
        barrages:0,
        memoriesWritten:0,
        relationshipsCreated:0
      }
    };
  }

  const state =
    root.shops[id];

  state.version =
    VERSION;

  state.actors =
    state.actors || {};

  for (
    const key
    of [
      'interactions',
      'dialogueFeed',
      'barrageFeed'
    ]
  ) {
    state[key] =
      Array.isArray(state[key])
        ? state[key]
        : [];
  }

  state.metrics =
    state.metrics || {};

  return state;
}

function registerActor(
  shopId,
  actor,
  options
) {
  if (
    !actor ||
    typeof actor !==
      'object'
  ) {
    return null;
  }

  const state =
    ensureShop(shopId);

  const opts =
    options || {};

  const id =
    String(
      actor.id ||
      opts.id ||
      actor.name ||
      (
        'actor_' +
        (
          Object.keys(
            state.actors
          ).length +
          1
        )
      )
    );

  const existed =
    !!state.actors[id];

  const row = {
    ...clone(
      state.actors[id] ||
      {}
    ),
    ...clone(actor),
    id,
    roleId:
      opts.roleId ||
      actor.roleId ||
      actor.currentRole &&
      actor.currentRole.roleId ||
      null,
    source:
      opts.source ||
      actor.source ||
      'shop',
    lastSeenDay:
      opts.day == null
        ? actor.lastSeenDay ||
          null
        : Number(opts.day)
  };

  row.relationships =
    row.relationships &&
    typeof row.relationships ===
      'object'
      ? row.relationships
      : {};

  row.relationshipIds =
    Array.isArray(
      row.relationshipIds
    )
      ? row.relationshipIds
      : [];

  row.memory =
    Array.isArray(
      row.memory
    )
      ? row.memory
      : [];

  state.actors[id] =
    row;

  if (!existed) {
    state.metrics
      .relationshipsCreated =
      (
        Number(
          state.metrics
            .relationshipsCreated
        ) ||
        0
      ) +
      1;
  }

  return clone(row);
}

function actor(
  shopId,
  actorId
) {
  const state =
    ensureShop(shopId);

  return state.actors[
    String(actorId)
  ] ||
  null;
}

function interact(
  shopId,
  actorId,
  otherId,
  effect,
  options
) {
  const state =
    ensureShop(shopId);

  const first =
    actor(
      shopId,
      actorId
    );

  const second =
    actor(
      shopId,
      otherId
    );

  if (!first || !second) {
    return {
      ok:false,
      reason:'互动人物不存在'
    };
  }

  const opts =
    options || {};

  const data = {
    ...(effect || {}),
    day:
      opts.day == null
        ? effect &&
          effect.day
        : Number(opts.day)
  };

  const before =
    first.relationships[
      second.id
    ]
      ? clone(
          first.relationships[
            second.id
          ]
        )
      : null;

  const relationship =
    personEngine
      .interact(
        first,
        second.id,
        data
      );

  const reciprocal = {
    trust:
      Number(
        data.trust
      ) || 0,
    respect:
      Number(
        data.respect
      ) || 0,
    closeness:
      Number(
        data.closeness
      ) || 0,
    rivalry:
      Number(
        data.rivalry
      ) || 0,
    day:
      data.day,
    typeId:
      data.typeId,
    text:
      data.text
        ? (
            first.name ||
            first.id
          ) +
          '：' +
          data.text
        : null,
    memoryTypeId:
      data.memoryTypeId,
    memoryWeight:
      data.memoryWeight,
    sentiment:
      data.sentiment
  };

  personEngine
    .interact(
      second,
      first.id,
      reciprocal
    );

  if (data.text) {
    state.metrics
      .memoriesWritten =
      (
        Number(
          state.metrics
            .memoriesWritten
        ) ||
        0
      ) +
      2;
  }

  const row = {
    id:
      'social_' +
      (
        state.interactions
          .length +
        1
      ),
    version:VERSION,
    day:
      data.day == null
        ? null
        : Number(data.day),
    actorId:first.id,
    otherId:second.id,
    before,
    after:
      clone(relationship),
    effect:
      clone(data)
  };

  state.interactions.push(
    row
  );

  state.interactions =
    state.interactions
      .slice(-500);

  state.metrics.interactions =
    (
      Number(
        state.metrics
          .interactions
      ) ||
      0
    ) +
    1;

  return {
    ok:true,
    interaction:
      clone(row),
    relationship:
      clone(relationship)
  };
}

function generateDialogue(
  shopId,
  actorId,
  otherId,
  options
) {
  const state =
    ensureShop(shopId);

  const first =
    actor(
      shopId,
      actorId
    );

  const second =
    otherId
      ? actor(
          shopId,
          otherId
        )
      : null;

  if (!first) {
    return {
      ok:false,
      reason:'发言人物不存在'
    };
  }

  const opts =
    options || {};

  const relation =
    second
      ? first.relationships[
          second.id
        ] ||
        null
      : null;

  const scope = [
    shopId,
    actorId,
    otherId || 'none',
    opts.sceneId ||
      'scene',
    opts.day ||
      0,
    state.metrics.dialogues ||
      0
  ].join(':');

  const rng =
    seedManager
      .createRng(
        'social_dialogue',
        scope
      );

  const dialogue =
    dialogueEngine
      .generateDialogue(
        rng,
        {
          ...opts,
          actor:first,
          relation,
          other:
            second,
          shopId,
          shopName:
            opts.shopName ||
            opts.shop ||
            shopId
        }
      );

  const row = {
    id:
      'dialogue_' +
      (
        state.dialogueFeed
          .length +
        1
      ),
    version:VERSION,
    shopId,
    actorId:first.id,
    otherId:
      second &&
      second.id ||
      null,
    day:
      opts.day == null
        ? null
        : Number(opts.day),
    ...clone(dialogue)
  };

  state.dialogueFeed.unshift(
    row
  );

  state.dialogueFeed =
    state.dialogueFeed
      .slice(0,200);

  state.metrics.dialogues =
    (
      Number(
        state.metrics.dialogues
      ) ||
      0
    ) +
    1;

  return {
    ok:true,
    dialogue:
      clone(row)
  };
}

function generateBarrage(
  shopId,
  options
) {
  const state =
    ensureShop(shopId);

  const opts =
    options || {};

  const scope = [
    shopId,
    opts.topicId ||
      'event',
    opts.day ||
      0,
    state.metrics.barrages ||
      0
  ].join(':');

  const rng =
    seedManager
      .createRng(
        'social_barrage',
        scope
      );

  const barrage =
    barrageEngine
      .generate(
        rng,
        {
          ...opts,
          shopId
        }
      );

  const row = {
    id:
      'shop_barrage_' +
      (
        state.barrageFeed
          .length +
        1
      ),
    version:VERSION,
    day:
      opts.day == null
        ? null
        : Number(opts.day),
    shopId,
    ...clone(barrage)
  };

  state.barrageFeed.unshift(
    row
  );

  state.barrageFeed =
    state.barrageFeed
      .slice(0,300);

  state.metrics.barrages =
    (
      Number(
        state.metrics.barrages
      ) ||
      0
    ) +
    1;

  return {
    ok:true,
    barrage:
      clone(row)
  };
}

function relationshipRow(
  shopId,
  actorId,
  otherId
) {
  const first =
    actor(
      shopId,
      actorId
    );

  if (!first) {
    return null;
  }

  const relation =
    first.relationships[
      String(otherId)
    ] ||
    null;

  if (!relation) {
    return null;
  }

  return {
    actorId:
      first.id,
    otherId:
      String(otherId),
    stage:
      dialogueEngine
        .relationshipStage(
          relation
        ),
    ...clone(relation)
  };
}

function network(
  shopId,
  actorId
) {
  const state =
    ensureShop(shopId);

  const first =
    actor(
      shopId,
      actorId
    );

  if (!first) {
    return [];
  }

  return Object
    .entries(
      first.relationships ||
      {}
    )
    .map(
      ([otherId,relation]) => ({
        actorId:
          first.id,
        otherId,
        otherName:
          state.actors[
            otherId
          ] &&
          state.actors[
            otherId
          ].name ||
          otherId,
        stage:
          dialogueEngine
            .relationshipStage(
              relation
            ),
        ...clone(relation)
      })
    )
    .sort(
      (
        a,
        b
      ) =>
        (
          Number(
            b.trust
          ) ||
          0
        ) -
        (
          Number(
            a.trust
          ) ||
          0
        )
    );
}

function overview(shopId) {
  const state =
    ensureShop(shopId);

  return {
    version:VERSION,
    shopId,
    dataScale:{
      dialogue:
        dialoguePack
          .stats(),
      barrage:
        barragePack
          .stats()
    },
    actorCount:
      Object.keys(
        state.actors
      ).length,
    interactions:
      state.interactions
        .length,
    latestDialogues:
      state.dialogueFeed
        .slice(0,30)
        .map(clone),
    latestBarrages:
      state.barrageFeed
        .slice(0,50)
        .map(clone),
    metrics:
      clone(state.metrics)
  };
}

module.exports = {
  VERSION,
  getRoot,
  ensureShop,
  registerActor,
  actor,
  interact,
  generateDialogue,
  generateBarrage,
  relationshipRow,
  network,
  overview
};
