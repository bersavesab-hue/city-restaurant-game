'use strict';

const gameState =
  require('../core/gameState.js');

const reviewEngine =
  require('../systems/reviewEngine.js');

const dynamicWorld =
  require('../world/dynamicWorldSystemV0815.js');

const VERSION =
  '0.8.27';

const MEDIA_SOURCES =
  Object.freeze([
    {id:'local_review',name:'本地点评',reach:1,trust:0.88},
    {id:'short_video',name:'短视频探店',reach:1.35,trust:0.72},
    {id:'blogger',name:'美食博主',reach:1.18,trust:0.80},
    {id:'community',name:'社区讨论',reach:0.78,trust:0.90},
    {id:'local_media',name:'本地媒体',reach:1.12,trust:0.92},
    {id:'friend_circle',name:'熟客口碑',reach:0.68,trust:0.96},
    {id:'delivery_review',name:'外卖评价',reach:0.92,trust:0.84},
    {id:'anonymous',name:'匿名讨论',reach:0.88,trust:0.48}
  ]);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function clamp(value,min,max) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0
    )
  );
}

function getStore() {
  const business =
    gameState.getBusiness();

  business.reputationMedia =
    business.reputationMedia &&
    typeof business.reputationMedia ===
      'object'
      ? business.reputationMedia
      : {
          version:VERSION,
          shops:{}
        };

  business.reputationMedia.version =
    VERSION;

  business.reputationMedia.shops =
    business.reputationMedia.shops ||
    {};

  return business.reputationMedia;
}

function ensureShop(shopId) {
  const store =
    getStore();

  const id =
    String(shopId);

  if (!store.shops[id]) {
    store.shops[id] = {
      version:VERSION,
      shopId:id,
      reviews:[],
      rumors:[],
      mediaPosts:[],
      metrics:{
        reviews:0,
        positiveReviews:0,
        negativeReviews:0,
        rumorsCreated:0,
        rumorsResolved:0,
        mediaPosts:0,
        earnedReach:0
      }
    };
  }

  const state =
    store.shops[id];

  state.version =
    VERSION;

  for (
    const key
    of [
      'reviews',
      'rumors',
      'mediaPosts'
    ]
  ) {
    state[key] =
      Array.isArray(
        state[key]
      )
        ? state[key]
        : [];
  }

  state.metrics =
    state.metrics || {};

  return state;
}

function recordReview(
  shopId,
  shop,
  experience,
  options
) {
  const state =
    ensureShop(shopId);

  const opts =
    options || {};

  const scored =
    opts.stars != null
      ? {
          score100:
            clamp(
              (
                Number(
                  opts.stars
                ) -
                1
              ) /
              4 *
              100,
              0,
              100
            ),
          stars:
            clamp(
              opts.stars,
              1,
              5
            )
        }
      : reviewEngine
          .scoreExperience(
            experience || {}
          );

  const signals =
    reviewEngine
      .reviewSignals(
        experience || {}
      );

  const sourceId =
    MEDIA_SOURCES.some(
      item =>
        item.id ===
        opts.sourceId
    )
      ? opts.sourceId
      : 'local_review';

  const row = {
    id:
      'review_' +
      (
        state.reviews.length +
        1
      ),
    version:VERSION,
    day:
      opts.day == null
        ? null
        : Number(opts.day),
    customerId:
      opts.customerId ||
      null,
    sourceId,
    score100:
      scored.score100,
    stars:
      scored.stars,
    signals,
    text:
      String(
        opts.text ||
        ''
      ).slice(
        0,
        240
      )
  };

  state.reviews.push(
    row
  );

  state.reviews =
    state.reviews
      .slice(-500);

  state.metrics.reviews =
    (
      Number(
        state.metrics.reviews
      ) ||
      0
    ) +
    1;

  if (
    row.stars >=
    4
  ) {
    state.metrics
      .positiveReviews =
      (
        Number(
          state.metrics
            .positiveReviews
        ) ||
        0
      ) +
      1;
  }

  if (
    row.stars <=
    2.5
  ) {
    state.metrics
      .negativeReviews =
      (
        Number(
          state.metrics
            .negativeReviews
        ) ||
        0
      ) +
      1;
  }

  if (
    shop &&
    opts.applyShopRating ===
      true
  ) {
    const count =
      Math.max(
        0,
        Number(
          shop.reviewCount
        ) ||
        0
      );

    const old =
      Number(
        shop.rating
      ) ||
      4;

    shop.rating =
      Math.round(
        (
          (
            old *
            count +
            row.stars
          ) /
          (
            count +
            1
          )
        ) *
        100
      ) /
      100;

    shop.reviewCount =
      count +
      1;
  }

  return clone(row);
}

function recordVisitOutcome(
  shopId,
  shop,
  visitResult,
  options
) {
  if (
    !visitResult ||
    !visitResult.ok
  ) {
    return null;
  }

  const retention =
    visitResult.retention ||
    {};

  const stars =
    retention.reviewStars;

  if (
    stars == null
  ) {
    return null;
  }

  const production =
    visitResult.production ||
    {};

  const opts =
    options || {};

  const experience = {
    taste:
      Number(
        production.quality
      ) ||
      70,
    value:
      Number(
        retention.experience &&
        retention
          .experience
          .dimensions &&
        retention
          .experience
          .dimensions
          .value
      ) ||
      65,
    portion:72,
    speed:
      Math.max(
        20,
        100 -
        (
          Number(
            production.prepMinutes
          ) ||
          10
        ) *
        2.4
      ),
    service:
      Number(
        retention.experience &&
        retention
          .experience
          .dimensions &&
        retention
          .experience
          .dimensions
          .service
      ) ||
      70,
    hygiene:78,
    environment:74,
    consistency:75
  };

  return recordReview(
    shopId,
    shop,
    experience,
    {
      day:
        opts.day,
      customerId:
        visitResult
          .visit &&
        visitResult
          .visit
          .customerId ||
        visitResult
          .order &&
        visitResult
          .order
          .customerId ||
        null,
      sourceId:
        visitResult
          .order &&
        visitResult
          .order
          .channel ===
          'delivery'
          ? 'delivery_review'
          : 'local_review',
      stars,
      applyShopRating:false
    }
  );
}

function createRumor(
  shopId,
  options
) {
  const state =
    ensureShop(shopId);

  const opts =
    options || {};

  const sentiment =
    clamp(
      opts.sentiment == null
        ? -0.5
        : opts.sentiment,
      -1,
      1
    );

  const credibility =
    clamp(
      opts.credibility == null
        ? 0.55
        : opts.credibility,
      0,
      1
    );

  const heat =
    clamp(
      opts.heat == null
        ? 50
        : opts.heat,
      0,
      100
    );

  const rumor = {
    id:
      'rumor_' +
      (
        state.rumors.length +
        1
      ),
    version:VERSION,
    title:
      String(
        opts.title ||
        '门店讨论'
      ).slice(
        0,
        80
      ),
    text:
      String(
        opts.text ||
        ''
      ).slice(
        0,
        280
      ),
    sentiment,
    credibility,
    heat,
    createdDay:
      Number(
        opts.day
      ) ||
      1,
    status:'active',
    sourceId:
      opts.sourceId ||
      'anonymous',
    resolvedDay:null,
    resolution:null
  };

  state.rumors.push(
    rumor
  );

  state.metrics
    .rumorsCreated =
    (
      Number(
        state.metrics
          .rumorsCreated
      ) ||
      0
    ) +
    1;

  return clone(rumor);
}

function resolveRumor(
  shopId,
  rumorId,
  options
) {
  const state =
    ensureShop(shopId);

  const rumor =
    state.rumors
      .find(
        item =>
          item.id ===
          rumorId
      );

  if (!rumor) {
    return {
      ok:false,
      reason:'舆情不存在'
    };
  }

  if (
    rumor.status ===
    'resolved'
  ) {
    return {
      ok:true,
      existing:true,
      rumor:
        clone(rumor)
    };
  }

  const opts =
    options || {};

  rumor.status =
    'resolved';

  rumor.resolvedDay =
    Number(
      opts.day
    ) ||
    rumor.createdDay;

  rumor.resolution =
    String(
      opts.resolution ||
      'clarified'
    );

  rumor.heat =
    Math.round(
      rumor.heat *
      (
        rumor.resolution ===
        'ignored'
          ? 0.72
          : 0.28
      )
    );

  state.metrics
    .rumorsResolved =
    (
      Number(
        state.metrics
          .rumorsResolved
      ) ||
      0
    ) +
    1;

  return {
    ok:true,
    existing:false,
    rumor:
      clone(rumor)
  };
}

function publishMediaPost(
  shopId,
  options
) {
  const state =
    ensureShop(shopId);

  const opts =
    options || {};

  const source =
    MEDIA_SOURCES
      .find(
        item =>
          item.id ===
          opts.sourceId
      ) ||
    MEDIA_SOURCES[0];

  const sentiment =
    clamp(
      opts.sentiment == null
        ? 0.2
        : opts.sentiment,
      -1,
      1
    );

  const baseReach =
    Math.max(
      1,
      Number(
        opts.reach
      ) ||
      100
    );

  const reach =
    Math.round(
      baseReach *
      source.reach
    );

  const row = {
    id:
      'media_' +
      (
        state.mediaPosts
          .length +
        1
      ),
    version:VERSION,
    day:
      Number(
        opts.day
      ) ||
      1,
    sourceId:
      source.id,
    title:
      String(
        opts.title ||
        source.name
      ).slice(
        0,
        100
      ),
    sentiment,
    reach,
    trust:
      source.trust
  };

  state.mediaPosts.push(
    row
  );

  state.mediaPosts =
    state.mediaPosts
      .slice(-300);

  state.metrics.mediaPosts =
    (
      Number(
        state.metrics.mediaPosts
      ) ||
      0
    ) +
    1;

  state.metrics.earnedReach =
    (
      Number(
        state.metrics.earnedReach
      ) ||
      0
    ) +
    reach;

  return clone(row);
}

function processDay(
  shopId,
  day
) {
  const state =
    ensureShop(shopId);

  const currentDay =
    Number(day) || 1;

  let activeImpact = 0;

  for (
    const rumor
    of state.rumors
  ) {
    if (
      rumor.status !==
      'active'
    ) {
      continue;
    }

    const age =
      Math.max(
        0,
        currentDay -
        Number(
          rumor.createdDay
        )
      );

    if (
      age >
      0
    ) {
      rumor.heat =
        Math.round(
          rumor.heat *
          0.86
        );
    }

    activeImpact +=
      rumor.sentiment *
      rumor.credibility *
      (
        rumor.heat /
        100
      );

    if (
      rumor.heat <
      8
    ) {
      rumor.status =
        'resolved';

      rumor.resolvedDay =
        currentDay;

      rumor.resolution =
        'natural_decay';

      state.metrics
        .rumorsResolved =
        (
          Number(
            state.metrics
              .rumorsResolved
          ) ||
          0
        ) +
        1;
    }
  }

  return {
    changed:true,
    activeImpact:
      Math.round(
        activeImpact *
        1000
      ) /
      1000
  };
}

function overview(
  shopId,
  shop
) {
  const state =
    ensureShop(shopId);

  const reviews =
    state.reviews;

  const averageStars =
    reviews.length
      ? reviews.reduce(
          (
            sum,
            row
          ) =>
            sum +
            row.stars,
          0
        ) /
        reviews.length
      : Number(
          shop &&
          shop.rating
        ) ||
        4;

  const activeRumors =
    state.rumors
      .filter(
        item =>
          item.status ===
          'active'
      );

  const rumorImpact =
    activeRumors
      .reduce(
        (
          sum,
          rumor
        ) =>
          sum +
          rumor.sentiment *
          rumor.credibility *
          (
            rumor.heat /
            100
          ),
        0
      );

  const worldDiscussion = {
    dialogues:
      dynamicWorld
        .getDialogueFeed()
        .filter(
          item =>
            !item.shopId ||
            item.shopId ===
              shopId
        )
        .slice(
          0,
          20
        ),
    barrages:
      dynamicWorld
        .getBarrageFeed()
        .filter(
          item =>
            !item.shopId ||
            item.shopId ===
              shopId
        )
        .slice(
          0,
          30
        )
  };

  return {
    version:VERSION,
    averageStars:
      Math.round(
        averageStars *
        100
      ) /
      100,
    shopRating:
      Number(
        shop &&
        shop.rating
      ) ||
      averageStars,
    reviewCount:
      reviews.length,
    positiveReviews:
      Number(
        state.metrics
          .positiveReviews
      ) ||
      0,
    negativeReviews:
      Number(
        state.metrics
          .negativeReviews
      ) ||
      0,
    activeRumorCount:
      activeRumors.length,
    rumorImpact:
      Math.round(
        rumorImpact *
        1000
      ) /
      1000,
    earnedReach:
      Number(
        state.metrics
          .earnedReach
      ) ||
      0,
    mediaPosts:
      state.mediaPosts
        .slice(-20)
        .map(clone),
    activeRumors:
      activeRumors
        .map(clone),
    discussion:
      worldDiscussion
  };
}

module.exports = {
  VERSION,
  MEDIA_SOURCES,
  getStore,
  ensureShop,
  recordReview,
  recordVisitOutcome,
  createRumor,
  resolveRumor,
  publishMediaPost,
  processDay,
  overview
};
