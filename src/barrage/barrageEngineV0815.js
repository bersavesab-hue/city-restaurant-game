'use strict';

const pack =
  require('./barragePackV0815.js');

function sourceForTopic(
  rng,
  topicId
) {
  const preferred = {
    supplier:['supplier','merchant','competitor'],
    staff:['employee','former_employee','customer'],
    competitor:['competitor','merchant','foodie'],
    policy:['media','merchant','resident','anonymous'],
    delivery:['rider','platform','customer'],
    hygiene:['customer','regular','blogger','media'],
    rent:['landlord','merchant','competitor'],
    crowd:['customer','rider','merchant','foodie'],
    brand:['blogger','media','foodie','regular']
  };

  const ids =
    preferred[
      topicId
    ];

  if (
    ids &&
    ids.length
  ) {
    const chosenId =
      rng.pick(
        ids
      );

    return (
      pack.SOURCES.find(
        item =>
          item.id ===
          chosenId
      ) ||
      rng.pick(
        pack.SOURCES
      ) ||
      null
    );
  }

  return (
    rng.pick(
      pack.SOURCES
    ) ||
    null
  );
}

function emotionForScore(
  rng,
  score
) {
  const value =
    Number(
      score
    );

  let pool;

  if (
    Number.isFinite(
      value
    ) &&
    value >=
    72
  ) {
    pool =
      pack.EMOTIONS.slice(
        0,
        8
      );
  } else if (
    Number.isFinite(
      value
    ) &&
    value <=
    38
  ) {
    pool =
      pack.EMOTIONS.slice(
        14,
        24
      );
  } else {
    pool =
      pack.EMOTIONS.slice(
        7,
        16
      );
  }

  return rng.pick(
    pool
  );
}

function fill(
  text,
  topic
) {
  return String(text)
    .replace(
      /\{\{topic\}\}/g,
      topic
    );
}

function generate(
  rng,
  options={}
) {
  const topic =
    pack.TOPICS.find(
      item =>
        item.id ===
        options.topicId
    ) ||
    rng.pick(
      pack.TOPICS
    ) ||
    {
      id:'event',
      name:'事件',
      text:'今天发生的事'
    };

  const source =
    pack.SOURCES.find(
      item =>
        item.id ===
        options.sourceId
    ) ||
    sourceForTopic(
      rng,
      topic.id
    ) ||
    pack.SOURCES[0] ||
    {
      id:'anonymous',
      name:'匿名账号'
    };

  const emotion =
    pack.EMOTIONS.find(
      item =>
        item.id ===
        options.emotionId
    ) ||
    emotionForScore(
      rng,
      options.score
    ) ||
    pack.EMOTIONS[0] ||
    {
      id:'emotion_1',
      name:'中立'
    };

  const fragments =
    pack.BARRAGE_FRAGMENTS.filter(
      item =>
        item.sourceId ===
          source.id &&
        item.emotionId ===
          emotion.id
    );

  const fragment =
    rng.pick(
      fragments
    ) ||
    pack.BARRAGE_FRAGMENTS[0];

  const base =
    fill(
      fragment.pattern,
      options.topicText ||
      topic.text
    );

  const prefixes = {
    customer:'',
    regular:'老顾客表示：',
    resident:'附近居民说：',
    student:'学生党：',
    office:'上班族：',
    employee:'店员私下说：',
    former_employee:'前员工说：',
    supplier:'供应商那边说：',
    landlord:'房东群里有人说：',
    competitor:'同行老板说：',
    rider:'骑手反馈：',
    blogger:'探店博主：',
    media:'本地餐饮观察：',
    anonymous:'匿名用户：',
    family:'带娃家长：',
    tourist:'游客说：',
    merchant:'附近商户：',
    foodie:'本地吃货：',
    platform:'平台用户：',
    business_customer:'商务顾客：'
  };

  return {
    id:
      options.id ||
      `barrage_${options.day || 0}_${Math.floor(rng.next()*100000000)}`,
    day:
      options.day ||
      null,
    sourceId:
      source.id,
    sourceName:
      source.name,
    emotionId:
      emotion.id,
    emotionName:
      emotion.name,
    topicId:
      topic.id,
    topicName:
      topic.name,
    speaker:
      options.speaker ||
      source.name,
    text:
      (
        prefixes[
          source.id
        ] ||
        ''
      ) +
      base,
    shopId:
      options.shopId ||
      null,
    eventId:
      options.eventId ||
      null,
    policyId:
      options.policyId ||
      null,
    score:
      options.score == null
        ? null
        : Number(
            options.score
          )
  };
}

module.exports = {
  sourceForTopic,
  emotionForScore,
  generate
};
