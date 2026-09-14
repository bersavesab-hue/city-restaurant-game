'use strict';

const pack =
  require('./dialoguePackV0815.js');

const personEngine =
  require('../systems/personEngine.js');

function clamp(v,min=0,max=100){
  return Math.max(min,Math.min(max,Number(v)||0));
}

function chooseTone(
  actor,
  ctx={}
) {
  if (ctx.toneId) {
    return ctx.toneId;
  }

  const state =
    actor &&
    actor.state ||
    {};

  const p =
    actor &&
    actor.personality ||
    {};

  if (
    Number(state.stress || 0) >
    78
  ) {
    return Number(p.stability || 50) >
      58
      ? 'firm'
      : 'angry';
  }

  if (
    Number(state.energy || 100) <
    35
  ) {
    return 'tired';
  }

  if (
    Number(state.mood || 50) >
    78
  ) {
    return Number(p.extraversion || 50) >
      60
      ? 'excited'
      : 'happy';
  }

  if (
    Number(p.dominance || 50) >
    68
  ) {
    return 'direct';
  }

  if (
    Number(p.empathy || 50) >
    68
  ) {
    return 'warm';
  }

  if (
    Number(p.integrity || 50) >
    72
  ) {
    return 'professional';
  }

  return 'calm';
}

function relationshipStage(
  relation
) {
  if (!relation) {
    return 'stranger';
  }

  const trust =
    Number(relation.trust || 50);

  const closeness =
    Number(relation.closeness || 25);

  const rivalry =
    Number(relation.rivalry || 0);

  if (
    rivalry >
    70
  ) {
    return 'rival';
  }

  if (
    trust <
    22
  ) {
    return 'conflict';
  }

  if (
    trust >
      78 &&
    closeness >
      70
  ) {
    return 'close';
  }

  if (
    trust >
    70
  ) {
    return 'trusted';
  }

  if (
    closeness >
    45
  ) {
    return 'familiar';
  }

  return 'known';
}

function fill(
  text,
  vars
) {
  return String(text)
    .replace(/\{\{opening\}\}/g,vars.opening || '')
    .replace(/\{\{topic\}\}/g,vars.topic || '这件事')
    .replace(/\{\{shop\}\}/g,vars.shop || '门店')
    .replace(/\{\{name\}\}/g,vars.name || '你');
}

function generateDialogue(
  rng,
  options={}
) {
  const actor =
    options.actor ||
    {
      name:'匿名人物',
      personality:{},
      state:{}
    };

  const scene =
    pack.SCENES.find(
      item =>
        item.id ===
        options.sceneId
    ) ||
    rng.pick(
      pack.SCENES
    );

  const intent =
    pack.INTENTS.find(
      item =>
        item.id ===
        options.intentId
    ) ||
    rng.pick(
      pack.INTENTS
    );

  const toneId =
    chooseTone(
      actor,
      options
    );

  const tone =
    pack.TONES.find(
      item =>
        item.id ===
        toneId
    ) ||
    pack.TONES[0];

  const relation =
    options.relation ||
    null;

  const relationId =
    options.relationshipStageId ||
    relationshipStage(
      relation
    );

  const relationStage =
    pack.RELATIONSHIP_STAGES.find(
      item =>
        item.id ===
        relationId
    ) ||
    pack.RELATIONSHIP_STAGES[0];

  const pool =
    pack.DIALOGUE_FRAGMENTS.filter(
      item =>
        item.sceneId ===
        scene.id
    );

  const fragment =
    rng.pick(
      pool
    ) ||
    pack.DIALOGUE_FRAGMENTS[0];

  const topic =
    options.topic ||
    scene.topic;

  const text =
    fill(
      fragment.text,
      {
        opening:
          pack.OPENINGS[
            tone.id
          ] ||
          '',
        topic,
        shop:
          options.shopName,
        name:
          actor.name
      }
    );

  const record = {
    id:
      options.id ||
      `dialogue_${options.day || 0}_${Math.floor(rng.next()*100000000)}`,
    day:
      options.day ||
      null,
    actorId:
      actor.id ||
      actor.name,
    actorName:
      actor.name,
    sceneId:
      scene.id,
    sceneName:
      scene.name,
    intentId:
      intent.id,
    intentName:
      intent.name,
    toneId:
      tone.id,
    toneName:
      tone.name,
    relationshipStageId:
      relationStage.id,
    relationshipStageName:
      relationStage.name,
    topic,
    text,
    eventId:
      options.eventId ||
      null,
    policyId:
      options.policyId ||
      null,
    shopId:
      options.shopId ||
      null
  };

  if (
    actor &&
    actor.memory &&
    options.remember !==
      false
  ) {
    personEngine.remember(
      actor,
      {
        typeId:
          options.memoryTypeId ||
          'social',
        text,
        weight:
          clamp(
            options.memoryWeight ||
            42
          ),
        sentiment:
          Number(
            options.sentiment ||
            0
          ),
        day:
          options.day
      }
    );
  }

  return record;
}

module.exports = {
  chooseTone,
  relationshipStage,
  generateDialogue
};
