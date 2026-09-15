'use strict';

const gameState =
  require('../core/gameState.js');

const marketingEngine =
  require('./marketingEngineV10.js');

const finance =
  require('../finance/completeFinanceSystemV0825.js');

const VERSION =
  '0.8.26';

const PLATFORMS =
  Object.freeze([
    {id:'dine_in',name:'到店自然客流',feeRate:0,acquisition:1,retention:1},
    {id:'delivery',name:'外卖平台',feeRate:0.18,acquisition:1.18,retention:0.86},
    {id:'groupbuy',name:'团购平台',feeRate:0.08,acquisition:1.14,retention:0.90},
    {id:'search',name:'本地搜索',feeRate:0.04,acquisition:1.08,retention:0.96},
    {id:'short_video',name:'短视频平台',feeRate:0.05,acquisition:1.20,retention:0.82},
    {id:'community',name:'社区渠道',feeRate:0.02,acquisition:1.06,retention:1.12},
    {id:'corporate',name:'企业团餐',feeRate:0.06,acquisition:1.05,retention:1.20},
    {id:'private',name:'私域会员',feeRate:0,acquisition:0.94,retention:1.30}
  ]);

const MEMBER_TIERS =
  Object.freeze([
    {id:'member',name:'普通会员',minSpend:0,pointsRate:1,discount:1},
    {id:'silver',name:'银卡会员',minSpend:500,pointsRate:1.1,discount:0.99},
    {id:'gold',name:'金卡会员',minSpend:1500,pointsRate:1.25,discount:0.97},
    {id:'platinum',name:'铂金会员',minSpend:4000,pointsRate:1.5,discount:0.95},
    {id:'vip',name:'核心会员',minSpend:10000,pointsRate:2,discount:0.93}
  ]);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function getStore() {
  const business =
    gameState.getBusiness();

  business.marketingMembership =
    business.marketingMembership &&
    typeof business.marketingMembership ===
      'object'
      ? business.marketingMembership
      : {
          version:VERSION,
          shops:{}
        };

  business.marketingMembership.version =
    VERSION;

  business.marketingMembership.shops =
    business.marketingMembership.shops ||
    {};

  return business.marketingMembership;
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
      platforms:{},
      members:{},
      campaignHistory:[],
      metrics:{
        campaignsStarted:0,
        marketingSpend:0,
        membersJoined:0,
        memberRevenue:0,
        pointsIssued:0,
        pointsRedeemed:0
      }
    };
  }

  const state =
    store.shops[id];

  state.version =
    VERSION;

  state.platforms =
    state.platforms || {};

  state.members =
    state.members || {};

  state.campaignHistory =
    Array.isArray(
      state.campaignHistory
    )
      ? state.campaignHistory
      : [];

  state.metrics =
    state.metrics || {};

  for (
    const key
    of [
      'campaignsStarted',
      'marketingSpend',
      'membersJoined',
      'memberRevenue',
      'pointsIssued',
      'pointsRedeemed'
    ]
  ) {
    state.metrics[key] =
      Math.max(
        0,
        Number(
          state.metrics[key]
        ) || 0
      );
  }

  return state;
}

function campaignCatalog() {
  return marketingEngine
    .CAMPAIGN_TYPES
    .map(clone);
}

function platformCatalog() {
  return PLATFORMS.map(clone);
}

function memberTierFor(spend) {
  const total =
    Math.max(
      0,
      Number(spend) || 0
    );

  return MEMBER_TIERS
    .filter(
      tier =>
        total >=
        tier.minSpend
    )
    .slice(-1)[0] ||
    MEMBER_TIERS[0];
}

function configurePlatform(
  shopId,
  platformId,
  options
) {
  const def =
    PLATFORMS.find(
      item =>
        item.id ===
        platformId
    );

  if (!def) {
    return {
      ok:false,
      reason:'未知渠道'
    };
  }

  const state =
    ensureShop(shopId);

  const opts =
    options || {};

  state.platforms[
    platformId
  ] = {
    id:platformId,
    enabled:
      opts.enabled !==
      false,
    feeRate:
      opts.feeRate == null
        ? def.feeRate
        : Math.max(
            0,
            Number(
              opts.feeRate
            ) || 0
          ),
    rating:
      opts.rating == null
        ? 4
        : Math.max(
            1,
            Math.min(
              5,
              Number(
                opts.rating
              ) || 4
            )
          ),
    orders:
      Math.max(
        0,
        Number(
          opts.orders
        ) || 0
      )
  };

  return {
    ok:true,
    platform:
      clone(
        state.platforms[
          platformId
        ]
      )
  };
}

function startCampaign(
  shopId,
  runtime,
  typeId,
  budget,
  days,
  options
) {
  if (!runtime) {
    return {
      ok:false,
      reason:'门店运行时不存在'
    };
  }

  const amount =
    Math.max(
      0,
      Number(budget) || 0
    );

  if (amount <= 0) {
    return {
      ok:false,
      reason:'营销预算必须大于0'
    };
  }

  const state =
    ensureShop(shopId);

  let campaign;

  try {
    campaign =
      marketingEngine
        .createCampaign(
          typeId,
          amount,
          Math.max(
            1,
            Number(days) || 7
          )
        );
  } catch (error) {
    return {
      ok:false,
      reason:error.message
    };
  }

  const day =
    options &&
    options.day != null
      ? Number(options.day)
      : Number(runtime.day) || 1;

  const paid =
    finance
      .recordExternalExpense(
        shopId,
        'marketing',
        amount,
        {
          day,
          referenceId:
            'campaign:' +
            campaign.id,
          applyCash:true,
          note:
            '营销活动：' +
            campaign.name,
          meta:{
            typeId,
            days:
              campaign.days
          }
        }
      );

  if (!paid.ok) {
    return paid;
  }

  runtime.campaigns =
    Array.isArray(
      runtime.campaigns
    )
      ? runtime.campaigns
      : [];

  runtime.campaigns.push(
    campaign
  );

  state.metrics
    .campaignsStarted +=
    1;

  state.metrics
    .marketingSpend +=
    amount;

  state.campaignHistory.push({
    id:campaign.id,
    typeId,
    name:campaign.name,
    budget:amount,
    days:campaign.days,
    startDay:day
  });

  state.campaignHistory =
    state.campaignHistory
      .slice(-120);

  return {
    ok:true,
    campaign:
      clone(campaign)
  };
}

function enrollMember(
  shopId,
  customerId,
  options
) {
  const state =
    ensureShop(shopId);

  const id =
    String(
      customerId || ''
    );

  if (!id) {
    return {
      ok:false,
      reason:'顾客ID不能为空'
    };
  }

  if (
    state.members[id]
  ) {
    return {
      ok:true,
      existing:true,
      member:
        clone(
          state.members[id]
        )
    };
  }

  const opts =
    options || {};

  const member = {
    customerId:id,
    joinedDay:
      Number(
        opts.day
      ) || 1,
    spend:0,
    visits:0,
    points:0,
    tierId:'member',
    birthday:
      opts.birthday ||
      null,
    tags:
      Array.isArray(
        opts.tags
      )
        ? opts.tags.slice()
        : []
  };

  state.members[id] =
    member;

  state.metrics
    .membersJoined +=
    1;

  return {
    ok:true,
    existing:false,
    member:
      clone(member)
  };
}

function recordMemberSpend(
  shopId,
  customerId,
  amount,
  options
) {
  const state =
    ensureShop(shopId);

  const id =
    String(
      customerId || ''
    );

  const member =
    state.members[id];

  if (!member) {
    return {
      ok:false,
      reason:'顾客尚未加入会员'
    };
  }

  const paid =
    Math.max(
      0,
      Number(amount) || 0
    );

  const tierBefore =
    memberTierFor(
      member.spend
    );

  const points =
    Math.floor(
      paid *
      tierBefore.pointsRate
    );

  member.spend +=
    paid;

  member.visits +=
    Math.max(
      1,
      Number(
        options &&
        options.visits
      ) || 1
    );

  member.points +=
    points;

  member.lastVisitDay =
    options &&
    options.day != null
      ? Number(
          options.day
        )
      : member.lastVisitDay;

  const tierAfter =
    memberTierFor(
      member.spend
    );

  member.tierId =
    tierAfter.id;

  state.metrics
    .memberRevenue +=
    paid;

  state.metrics
    .pointsIssued +=
    points;

  return {
    ok:true,
    pointsIssued:points,
    tierChanged:
      tierBefore.id !==
      tierAfter.id,
    member:
      clone(member)
  };
}

function redeemPoints(
  shopId,
  customerId,
  points
) {
  const state =
    ensureShop(shopId);

  const member =
    state.members[
      String(
        customerId || ''
      )
    ];

  if (!member) {
    return {
      ok:false,
      reason:'会员不存在'
    };
  }

  const amount =
    Math.max(
      1,
      Math.floor(
        Number(points) || 0
      )
    );

  if (
    member.points <
    amount
  ) {
    return {
      ok:false,
      reason:'积分不足'
    };
  }

  member.points -=
    amount;

  state.metrics
    .pointsRedeemed +=
    amount;

  return {
    ok:true,
    redeemed:amount,
    value:
      Math.round(
        amount /
        100 *
        100
      ) /
      100,
    member:
      clone(member)
  };
}

function overview(
  shopId,
  runtime
) {
  const state =
    ensureShop(shopId);

  const members =
    Object.values(
      state.members
    );

  const campaigns =
    runtime &&
    Array.isArray(
      runtime.campaigns
    )
      ? runtime.campaigns
      : [];

  const active =
    campaigns.filter(
      item =>
        item.status ===
        'active'
    );

  const tierCounts = {};

  for (
    const member
    of members
  ) {
    tierCounts[
      member.tierId ||
      'member'
    ] =
      (
        tierCounts[
          member.tierId ||
          'member'
        ] ||
        0
      ) +
      1;
  }

  return {
    version:VERSION,
    campaignTypes:
      marketingEngine
        .CAMPAIGN_TYPES
        .length,
    activeCampaigns:
      active.map(clone),
    demandMultiplier:
      marketingEngine
        .demandMultiplier(
          campaigns
        ),
    platforms:
      clone(
        state.platforms
      ),
    memberCount:
      members.length,
    tierCounts,
    metrics:
      clone(
        state.metrics
      )
  };
}

module.exports = {
  VERSION,
  PLATFORMS,
  MEMBER_TIERS,
  getStore,
  ensureShop,
  campaignCatalog,
  platformCatalog,
  memberTierFor,
  configurePlatform,
  startCampaign,
  enrollMember,
  recordMemberSpend,
  redeemPoints,
  overview
};
