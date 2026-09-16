"use strict";

const assert = require("assert");

const market = require("../src/property/propertyMarketSystem.js");

function compact(state) {
  return JSON.stringify({
    day: state.currentDay,

    listingState: state.listingState,

    activeEvents: state.activeEvents,

    stats: state.stats,
  });
}

function run() {
  market.reset({
    seed: 778899,

    currentDay: 1,
  });

  const initial = market.initialize();

  assert.strictEqual(
    initial.potentialPropertyCount,
    756,
    "42 条街道 × 18 个潜在地址，应为 756"
  );

  assert.ok(
    initial.activeListingCount > 120 && initial.activeListingCount < 500,
    "挂牌量应是动态市场子集，而不是全部潜在商铺"
  );

  const uniBefore = market.getDistrictSummary("university");

  const listingsBefore = market.getLiveListings({
    districtId: "university",
  });

  assert.ok(listingsBefore.length > 0, "大学城必须有动态挂牌");

  assert.ok(
    listingsBefore.every(
      (item) =>
        typeof item.askingMonthlyRent === "number" &&
        typeof item.daysOnMarket === "number" &&
        Array.isArray(item.competingTenants)
    ),
    "动态挂牌必须有报价、挂牌天数和 NPC 竞争信息"
  );

  market.addExternalModifier({
    id: "test_subway",

    name: "测试地铁开通",

    districtId: "university",

    endDay: 50,

    trafficFactor: 1.25,

    rentPressure: 1.12,

    listingSupplyFactor: 0.88,

    npcDemandFactor: 1.28,
  });

  const heatWithEvent =
    market.getDistrictSummary("university").hottestStreet.marketHeat;

  assert.ok(
    heatWithEvent >= uniBefore.hottestStreet.marketHeat,
    "正向事件应提高商圈热度"
  );

  market.advanceDays(45);

  const after = market.getMarketOverview();

  assert.strictEqual(after.currentDay, 46, "推进 45 天后应来到第 46 天");

  assert.ok(
    after.stats.totalNewListings > initial.activeListingCount,
    "长期推进后应有新房源持续进入市场"
  );

  assert.ok(
    after.stats.totalNpcRentals + after.stats.totalWithdrawals > 0,
    "房源应会被 NPC 租走或被房东撤回"
  );

  assert.ok(
    after.stats.totalPriceCuts + after.stats.totalPriceRaises > 0,
    "挂牌价格应在长期市场中发生调整"
  );

  const history = market.getHistory(300);

  assert.ok(
    history.some((item) => item.type === "npc_rented") ||
      history.some((item) => item.type === "owner_withdrawn"),
    "市场历史应记录真实退出原因"
  );

  const save = market.exportState();

  const snapshot = compact(save);

  market.reset({
    seed: 1,
  });

  assert.strictEqual(
    market.importState(save),
    true,
    "动态市场必须可以恢复存档"
  );

  assert.strictEqual(
    compact(market.exportState()),
    snapshot,
    "导入后的市场状态必须一致"
  );

  market.reset({
    seed: 778899,

    currentDay: 1,
  });

  market.initialize();
  market.addExternalModifier({
    id: "test_subway",

    name: "测试地铁开通",

    districtId: "university",

    endDay: 50,

    trafficFactor: 1.25,

    rentPressure: 1.12,

    listingSupplyFactor: 0.88,

    npcDemandFactor: 1.28,
  });
  market.advanceDays(45);

  const deterministic = compact(market.exportState());

  assert.strictEqual(
    deterministic,
    snapshot,
    "相同 seed、相同事件和相同推进应得到相同结果，便于存档和调试"
  );

  console.log("property dynamic market tests passed");

  console.log(
    JSON.stringify(
      {
        initialActive: initial.activeListingCount,

        day46Active: after.activeListingCount,

        newListings: after.stats.totalNewListings,

        npcRentals: after.stats.totalNpcRentals,

        withdrawals: after.stats.totalWithdrawals,

        priceCuts: after.stats.totalPriceCuts,

        priceRaises: after.stats.totalPriceRaises,

        activeEvents: after.activeEventCount,
      },
      null,
      2
    )
  );
}

run();
