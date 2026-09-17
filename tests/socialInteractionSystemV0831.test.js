'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const seedManager =
  require('../src/core/seedManagerV0813.js');

const social =
  require('../src/social/socialInteractionSystemV0831.js');

gameState.reset();

seedManager.setMasterSeed(
  'social-v0831-test',
  {
    resetSimulation:false
  }
);

const a =
  social
    .registerActor(
      'shop_social_v0831',
      {
        id:'actor_a',
        name:'陈启明',
        personality:{
          stability:68,
          extraversion:60,
          dominance:52,
          empathy:72,
          integrity:76
        },
        state:{
          mood:74,
          energy:78,
          stress:20
        },
        relationships:{},
        relationshipIds:[],
        memory:[]
      },
      {
        roleId:'manager',
        day:1
      }
    );

const b =
  social
    .registerActor(
      'shop_social_v0831',
      {
        id:'actor_b',
        name:'李雨桐',
        personality:{
          stability:62,
          extraversion:70,
          dominance:48,
          empathy:66,
          integrity:70
        },
        state:{
          mood:70,
          energy:75,
          stress:25
        },
        relationships:{},
        relationshipIds:[],
        memory:[]
      },
      {
        roleId:'server',
        day:1
      }
    );

assert.ok(a);
assert.ok(b);

const interaction =
  social
    .interact(
      'shop_social_v0831',
      'actor_a',
      'actor_b',
      {
        trust:8,
        respect:5,
        closeness:6,
        text:'今天高峰配合得不错',
        sentiment:60,
        memoryWeight:55
      },
      {
        day:2
      }
    );

assert.ok(interaction.ok);
assert.ok(
  interaction.relationship.trust >
  50
);

const relation =
  social
    .relationshipRow(
      'shop_social_v0831',
      'actor_a',
      'actor_b'
    );

assert.ok(relation);
assert.ok(relation.stage);

const dialogue =
  social
    .generateDialogue(
      'shop_social_v0831',
      'actor_a',
      'actor_b',
      {
        sceneId:'regular_chat',
        topic:'今天的营业情况',
        day:2,
        shop:'社交测试店'
      }
    );

assert.ok(dialogue.ok);
assert.ok(dialogue.dialogue);

const barrage =
  social
    .generateBarrage(
      'shop_social_v0831',
      {
        topicId:'service',
        topicText:'今天服务挺稳',
        score:82,
        day:2
      }
    );

assert.ok(barrage.ok);
assert.ok(barrage.barrage);

const network =
  social
    .network(
      'shop_social_v0831',
      'actor_a'
    );

assert.equal(network.length,1);

const overview =
  social
    .overview(
      'shop_social_v0831'
    );

assert.equal(
  overview.version,
  '0.8.31'
);

assert.equal(
  overview.actorCount,
  2
);

assert.equal(
  overview.metrics.interactions,
  1
);

assert.equal(
  overview.metrics.dialogues,
  1
);

assert.equal(
  overview.metrics.barrages,
  1
);

assert.ok(
  overview.dataScale.dialogue.scenes >
  0
);

assert.ok(
  overview.dataScale.barrage.sources >
  0
);

console.log(
  'V0.8.31 dialogue/barrage/social relationship tests passed'
);
