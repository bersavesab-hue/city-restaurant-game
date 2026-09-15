'use strict';

const gameState = require('../core/gameState.js');

const VERSION = '0.8.62';

const WEEKLY_DEFS = Object.freeze([
  { id:'operate_4', name:'稳定开门', metric:'operatingDays', target:4, points:6 },
  { id:'profit_2', name:'两天盈利', metric:'profitDays', target:2, points:8 },
  { id:'revenue_week', name:'本周营收', metric:'weeklyRevenue', target:'dynamic', points:10 }
]);

const MILESTONES = Object.freeze([
  { id:'operate_3', name:'经营起步', metric:'operatingDays', target:3, points:5 },
  { id:'operate_7', name:'站稳一周', metric:'operatingDays', target:7, points:8 },
  { id:'operate_30', name:'稳定经营月', metric:'operatingDays', target:30, points:25 },
  { id:'profit_3', name:'盈利入门', metric:'profitDays', target:3, points:6 },
  { id:'profit_10', name:'稳定盈利', metric:'profitDays', target:10, points:15 },
  { id:'profit_30', name:'成熟盈利', metric:'profitDays', target:30, points:35 },
  { id:'best_revenue_5k', name:'单日五千', metric:'bestDailyRevenue', target:5000, points:8 },
  { id:'best_revenue_20k', name:'单日两万', metric:'bestDailyRevenue', target:20000, points:20 },
  { id:'customers_100', name:'百客积累', metric:'totalCustomers', target:100, points:8 },
  { id:'customers_1000', name:'千客门店', metric:'totalCustomers', target:1000, points:24 },
  { id:'members_25', name:'首批会员', metric:'memberCount', target:25, points:8 },
  { id:'members_100', name:'百人会员池', metric:'memberCount', target:100, points:18 },
  { id:'brand_3', name:'品牌三级', metric:'brandLevel', target:3, points:15 },
  { id:'second_store', name:'第二门店', metric:'storeCount', target:2, points:30 }
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function getRoot() {
  const business = gameState.getBusiness();
  business.operatingProgressV0862 =
    business.operatingProgressV0862 &&
    typeof business.operatingProgressV0862 === 'object'
      ? business.operatingProgressV0862
      : {
          version:VERSION,
          managementPoints:0,
          shops:{},
          claimedMilestones:{}
        };

  const root = business.operatingProgressV0862;
  root.version = VERSION;
  root.managementPoints = Math.max(0, Number(root.managementPoints) || 0);
  root.shops = root.shops || {};
  root.claimedMilestones = root.claimedMilestones || {};
  return root;
}

function ensureShop(shopId) {
  const root = getRoot();
  const id = String(shopId);
  if (!root.shops[id]) {
    root.shops[id] = {
      shopId:id,
      currentWeek:null,
      weeklyClaims:{},
      history:[]
    };
  }
  const state = root.shops[id];
  state.weeklyClaims = state.weeklyClaims || {};
  state.history = Array.isArray(state.history) ? state.history : [];
  return state;
}

function closedHistory(history) {
  return (history || [])
    .filter(row => row && row.status === 'closed' && row.financial)
    .slice()
    .sort((a,b) => Number(a.day) - Number(b.day));
}

function allMetrics(context) {
  const ctx = context || {};
  const history = closedHistory(ctx.history);
  const operatingDays = history.length;
  const profitDays = history.filter(row => Number(row.financial.profit) > 0).length;
  const bestDailyRevenue = history.reduce((m,row) => Math.max(m, Number(row.financial.revenue) || 0), 0);
  const totalCustomers = history.reduce((s,row) => s + (Number(row.financial.customers) || 0), 0);
  return {
    operatingDays,
    profitDays,
    bestDailyRevenue,
    totalCustomers,
    memberCount:Math.max(0, Number(ctx.memberCount) || 0),
    brandLevel:Math.max(1, Number(ctx.brandLevel) || 1),
    storeCount:Math.max(1, Number(ctx.storeCount) || 1)
  };
}

function weekIndexFor(day) {
  return Math.floor((Math.max(1, Number(day) || 1) - 1) / 7);
}

function makeWeek(shopId, day, history) {
  const rows = closedHistory(history);
  const index = weekIndexFor(day);
  const startDay = index * 7 + 1;
  const endDay = startDay + 6;
  const previous = rows.filter(row => Number(row.day) < startDay).slice(-7);
  const previousAvg = previous.length
    ? previous.reduce((s,row) => s + (Number(row.financial.revenue) || 0), 0) / previous.length
    : 900;
  const revenueTarget = Math.max(3000, Math.round(previousAvg * 4 * 0.9 / 100) * 100);
  return {
    id:String(shopId) + ':week:' + index,
    index,
    startDay,
    endDay,
    revenueTarget,
    createdDay:Math.max(1, Number(day) || 1)
  };
}

function ensureWeek(shopId, day, history) {
  const state = ensureShop(shopId);
  const index = weekIndexFor(day);
  if (!state.currentWeek || Number(state.currentWeek.index) !== index) {
    if (state.currentWeek) {
      state.history.unshift(clone(state.currentWeek));
      state.history = state.history.slice(0, 12);
    }
    state.currentWeek = makeWeek(shopId, day, history);
  }
  return state.currentWeek;
}

function weeklyMetrics(week, history) {
  const rows = closedHistory(history).filter(row => {
    const day = Number(row.day);
    return day >= week.startDay && day <= week.endDay;
  });
  return {
    operatingDays:rows.length,
    profitDays:rows.filter(row => Number(row.financial.profit) > 0).length,
    weeklyRevenue:Math.round(rows.reduce((s,row) => s + (Number(row.financial.revenue) || 0), 0) * 100) / 100
  };
}

function weeklyRows(shopId, day, history) {
  const state = ensureShop(shopId);
  const week = ensureWeek(shopId, day, history);
  const metrics = weeklyMetrics(week, history);
  return WEEKLY_DEFS.map(def => {
    const target = def.target === 'dynamic' ? week.revenueTarget : def.target;
    const actual = Number(metrics[def.metric]) || 0;
    return {
      ...clone(def),
      target,
      actual,
      completed:actual >= target,
      claimed:!!state.weeklyClaims[week.id + ':' + def.id]
    };
  });
}

function milestoneRows(context) {
  const root = getRoot();
  const metrics = allMetrics(context);
  return MILESTONES.map(def => {
    const actual = Number(metrics[def.metric]) || 0;
    return {
      ...clone(def),
      actual,
      completed:actual >= def.target,
      claimed:!!root.claimedMilestones[def.id]
    };
  });
}

function addPoints(amount, reason) {
  const root = getRoot();
  const delta = Math.max(0, Math.floor(Number(amount) || 0));
  root.managementPoints += delta;
  root.lastReward = { amount:delta, reason:reason || null };
  return root.managementPoints;
}

function claimWeekly(shopId, goalId, context) {
  const ctx = context || {};
  const state = ensureShop(shopId);
  const week = ensureWeek(shopId, ctx.day, ctx.history);
  const row = weeklyRows(shopId, ctx.day, ctx.history).find(item => item.id === goalId);
  if (!row) return {ok:false, reason:'周目标不存在'};
  const key = week.id + ':' + goalId;
  if (state.weeklyClaims[key]) return {ok:false, reason:'奖励已领取'};
  if (!row.completed) return {ok:false, reason:'目标尚未完成'};
  state.weeklyClaims[key] = true;
  return {ok:true, points:row.points, total:addPoints(row.points, 'weekly:' + goalId)};
}

function claimMilestone(milestoneId, context) {
  const root = getRoot();
  const row = milestoneRows(context).find(item => item.id === milestoneId);
  if (!row) return {ok:false, reason:'里程碑不存在'};
  if (root.claimedMilestones[milestoneId]) return {ok:false, reason:'奖励已领取'};
  if (!row.completed) return {ok:false, reason:'里程碑尚未完成'};
  root.claimedMilestones[milestoneId] = true;
  return {ok:true, points:row.points, total:addPoints(row.points, 'milestone:' + milestoneId)};
}

function overview(shopId, context) {
  const ctx = context || {};
  const root = getRoot();
  const week = ensureWeek(shopId, ctx.day, ctx.history);
  return {
    version:VERSION,
    managementPoints:root.managementPoints,
    week:clone(week),
    weekly:weeklyRows(shopId, ctx.day, ctx.history),
    milestones:milestoneRows(ctx),
    metrics:allMetrics(ctx)
  };
}

module.exports = {
  VERSION,
  WEEKLY_DEFS,
  MILESTONES,
  getRoot,
  ensureShop,
  overview,
  claimWeekly,
  claimMilestone
};
