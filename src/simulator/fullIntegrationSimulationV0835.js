'use strict';

const gameState =
  require('../core/gameState.js');

const seedManager =
  require('../core/seedManagerV0813.js');

const operations =
  require('../operations/operationsStoreV080.js');

const multiStore =
  require('../brand/multiStoreBrandRankingV0834.js');

const VERSION =
  '0.8.35';

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function makeShop(
  runIndex,
  districtId
) {
  return {
    id:
      'sim_shop_' +
      runIndex,
    name:
      '模拟门店' +
      runIndex,
    districtId:
      districtId,
    status:'open',
    usableArea:
      60 +
      (
        runIndex %
        7
      ) *
      10,
    grossArea:
      70 +
      (
        runIndex %
        7
      ) *
      11,
    seatEstimate:
      20 +
      (
        runIndex %
        6
      ) *
      4,
    monthlyRent:
      5000 +
      (
        runIndex %
        8
      ) *
      900,
    greaseTrap:'有',
    fireSprinkler:'有'
  };
}

function assertion(
  condition,
  code,
  detail
) {
  if (condition) {
    return null;
  }

  return {
    code,
    detail:
      detail ||
      code
  };
}

function runOne(
  runIndex,
  options
) {
  const opts =
    options || {};

  const districts = [
    'university',
    'cbd',
    'hightech',
    'oldtown',
    'village',
    'market',
    'industry'
  ];

  const districtId =
    districts[
      runIndex %
      districts.length
    ];

  const seed =
    String(
      opts.seedPrefix ||
      'full-integration-v0835'
    ) +
    ':' +
    runIndex;

  gameState.reset();

  seedManager.setMasterSeed(
    seed,
    {
      resetSimulation:false
    }
  );

  gameState.setCash(
    250000 +
    (
      runIndex %
      5
    ) *
      50000
  );

  if (
    typeof gameState.setDistrict ===
    'function'
  ) {
    gameState.setDistrict(
      districtId
    );
  } else if (
    typeof gameState.getWorld ===
    'function'
  ) {
    gameState
      .getWorld()
      .currentDistrictId =
      districtId;
  }

  gameState.setWeather(
    runIndex % 4 ===
      0
      ? '小雨'
      : runIndex % 4 ===
          1
        ? '晴'
        : runIndex % 4 ===
            2
          ? '多云'
          : '小雪',
    runIndex % 4 ===
      3
      ? -2
      : 18 +
        (
          runIndex %
          15
        )
  );

  const shop =
    makeShop(
      runIndex,
      districtId
    );

  gameState.addShop(
    shop
  );

  operations.resetCache();

  const runtime =
    operations.getRuntime(
      shop.id
    );

  const issues = [];

  issues.push(
    assertion(
      !!runtime,
      'RUNTIME_CREATE_FAILED'
    )
  );

  let candidateCount = 0;
  let hired = false;

  try {
    const candidates =
      operations
        .staffCandidateRows(
          shop.id
        );

    candidateCount =
      candidates.length;

    if (
      candidates.length
    ) {
      const result =
        operations
          .hireStaffCandidate(
            shop.id,
            candidates[0].id
          );

      hired =
        !!(
          result &&
          result.ok
        );
    }
  } catch (error) {
    issues.push({
      code:'STAFF_FLOW_THROW',
      detail:error.message
    });
  }

  let customerId = null;

  try {
    const customer =
      operations
        .generateCustomer(
          shop.id,
          {
            districtId
          }
        );

    if (
      customer &&
      customer.ok &&
      customer.customer
    ) {
      customerId =
        customer.customer.id;
    }
  } catch (error) {
    issues.push({
      code:'CUSTOMER_FLOW_THROW',
      detail:error.message
    });
  }

  try {
    if (
      typeof operations
        .configureMarketingPlatform ===
        'function'
    ) {
      operations
        .configureMarketingPlatform(
          shop.id,
          'short_video',
          {
            enabled:true
          }
        );
    }

    if (
      typeof operations
        .startMarketingCampaign ===
        'function'
    ) {
      operations
        .startMarketingCampaign(
          shop.id,
          'short_video',
          300 +
          (
            runIndex %
            4
          ) *
            100,
          3,
          {
            day:1
          }
        );
    }

    if (
      customerId &&
      typeof operations
        .enrollMember ===
        'function'
    ) {
      operations
        .enrollMember(
          shop.id,
          customerId,
          {
            day:1
          }
        );
    }
  } catch (error) {
    issues.push({
      code:'MARKETING_FLOW_THROW',
      detail:error.message
    });
  }

  try {
    if (
      typeof operations
        .recordManualReview ===
        'function'
    ) {
      operations
        .recordManualReview(
          shop.id,
          {
            taste:
              65 +
              (
                runIndex %
                25
              ),
            value:72,
            portion:70,
            speed:75,
            service:74,
            hygiene:80,
            environment:76,
            consistency:72
          },
          {
            day:1,
            sourceId:'local_review'
          }
        );
    }
  } catch (error) {
    issues.push({
      code:'REPUTATION_FLOW_THROW',
      detail:error.message
    });
  }

  try {
    if (
      typeof operations
        .runRegulatoryInspection ===
        'function'
    ) {
      operations
        .runRegulatoryInspection(
          shop.id,
          {
            day:2,
            typeId:
              runIndex %
              2 ===
              0
                ? 'food_safety'
                : 'hygiene',
            hygiene:78,
            traceability:76,
            staffCompliance:80,
            facility:82
          }
        );
    }
  } catch (error) {
    issues.push({
      code:'REGULATORY_FLOW_THROW',
      detail:error.message
    });
  }

  let randomA = null;
  let randomB = null;
  let saved = null;
  let replayB = null;

  try {
    randomA =
      operations.randomInt(
        'sim100',
        shop.id,
        1,
        1000000
      );

    saved =
      gameState.exportSave();

    randomB =
      operations.randomInt(
        'sim100',
        shop.id,
        1,
        1000000
      );

    const restored =
      gameState.importSave(
        saved
      );

    if (!restored) {
      issues.push({
        code:'SAVE_RESTORE_FAILED',
        detail:'gameState.importSave returned false'
      });
    } else {
      replayB =
        operations.randomInt(
          'sim100',
          shop.id,
          1,
          1000000
        );
    }

    issues.push(
      assertion(
        randomB ===
        replayB,
        'RANDOM_REPLAY_MISMATCH',
        [
          randomB,
          replayB
        ].join(' != ')
      )
    );
  } catch (error) {
    issues.push({
      code:'SAVE_RANDOM_FLOW_THROW',
      detail:error.message
    });
  }

  operations.resetCache();

  let runtimeAfter =
    null;

  try {
    runtimeAfter =
      operations
        .getRuntime(
          shop.id
        );

    issues.push(
      assertion(
        !!runtimeAfter,
        'RUNTIME_RELOAD_FAILED'
      )
    );
  } catch (error) {
    issues.push({
      code:'RUNTIME_RELOAD_THROW',
      detail:error.message
    });
  }

  let financeView = null;

  try {
    financeView =
      operations
        .financeSnapshot(
          shop.id
        );

    issues.push(
      assertion(
        Number(
          gameState
            .getPlayer()
            .cash
        ) >=
        0,
        'NEGATIVE_PLAYER_CASH'
      )
    );

    issues.push(
      assertion(
        !!financeView,
        'FINANCE_SNAPSHOT_FAILED'
      )
    );
  } catch (error) {
    issues.push({
      code:'FINANCE_FLOW_THROW',
      detail:error.message
    });
  }

  try {
    if (
      typeof operations
        .evaluateGrowth ===
        'function'
    ) {
      operations
        .evaluateGrowth(
          shop.id,
          {
            daysPlayed:
              5 +
              (
                runIndex %
                40
              ),
            profitDays:
              runIndex %
              12,
            bestDailyRevenue:
              5000 +
              runIndex *
              200,
            totalCustomers:
              100 +
              runIndex *
              17,
            reviewCount:
              10 +
              runIndex,
            rating:
              3.5 +
              (
                runIndex %
                14
              ) /
              10,
            memberCount:
              runIndex *
              3,
            campaignCount:
              1 +
              runIndex %
              10,
            inspectionsPassed:
              runIndex %
              8,
            noViolationStreak:
              runIndex %
              30
          }
        );
    }
  } catch (error) {
    issues.push({
      code:'GROWTH_FLOW_THROW',
      detail:error.message
    });
  }

  let portfolio = null;
  let ranking = null;

  try {
    multiStore
      .registerShop(
        shop.id,
        runtimeAfter ||
        runtime,
        {
          day:5
        }
      );

    portfolio =
      multiStore
        .portfolioSnapshot();

    ranking =
      multiStore
        .buildRanking({
          districtId,
          day:5,
          limit:10
        });

    issues.push(
      assertion(
        portfolio.storeCount >=
        1,
        'PORTFOLIO_STORE_MISSING'
      )
    );

    issues.push(
      assertion(
        Number.isFinite(
          Number(
            ranking.playerRank
          )
        ),
        'PLAYER_RANK_MISSING'
      )
    );
  } catch (error) {
    issues.push({
      code:'EXPANSION_RANKING_THROW',
      detail:error.message
    });
  }

  const filteredIssues =
    issues.filter(Boolean);

  return {
    runIndex,
    seed,
    districtId,
    ok:
      filteredIssues.length ===
      0,
    issues:
      filteredIssues,
    metrics:{
      candidateCount,
      hired,
      customerCreated:
        !!customerId,
      playerCash:
        Number(
          gameState
            .getPlayer()
            .cash
        ),
      randomA,
      randomB,
      replayB,
      transactionCount:
        financeView
          ? financeView
              .transactionCount
          : null,
      portfolioStores:
        portfolio
          ? portfolio
              .storeCount
          : null,
      playerRank:
        ranking
          ? ranking
              .playerRank
          : null
    }
  };
}

function summarize(results) {
  const rows =
    Array.isArray(
      results
    )
      ? results
      : [];

  const issueCounts = {};

  for (
    const result
    of rows
  ) {
    for (
      const issue
      of result.issues ||
      []
    ) {
      issueCounts[
        issue.code
      ] =
        (
          issueCounts[
            issue.code
          ] ||
          0
        ) +
        1;
    }
  }

  const passed =
    rows.filter(
      item =>
        item.ok
    ).length;

  return {
    version:VERSION,
    runs:
      rows.length,
    passed,
    failed:
      rows.length -
      passed,
    passRate:
      rows.length
        ? Math.round(
            passed /
            rows.length *
            10000
          ) /
          100
        : 0,
    issueCounts,
    failureRuns:
      rows
        .filter(
          item =>
            !item.ok
        )
        .map(
          item => ({
            runIndex:
              item.runIndex,
            seed:
              item.seed,
            issues:
              clone(
                item.issues
              )
          })
        )
  };
}

function runMany(
  count,
  options
) {
  const total =
    Math.max(
      1,
      Math.min(
        500,
        Number(count) || 100
      )
    );

  const results = [];

  for (
    let i = 0;
    i < total;
    i++
  ) {
    results.push(
      runOne(
        i,
        options
      )
    );
  }

  return {
    summary:
      summarize(
        results
      ),
    results
  };
}

function run100(options) {
  return runMany(
    100,
    options
  );
}

module.exports = {
  VERSION,
  makeShop,
  runOne,
  summarize,
  runMany,
  run100
};
