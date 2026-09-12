"use strict";

const assert = require("assert");

const propertySystem = require("../src/property/propertySystem.js");

function run() {
  const stats = propertySystem.getMarketStats();

  assert.strictEqual(stats.districtCount, 7, "应有 7 个商圈");

  assert.strictEqual(stats.streetCount, 42, "应有 42 条街道");

  assert.strictEqual(stats.listingCount, 336, "默认应生成 336 套商铺");

  const university = propertySystem.getListingsByDistrict("university");

  assert.strictEqual(university.length, 48, "大学城应有 48 套默认商铺");

  const sample = university[0];

  const requiredKeys = [
    "grossArea",
    "usableArea",
    "layoutTypeName",
    "floor",
    "frontage",
    "depth",
    "monthlyRent",
    "depositMonths",
    "freeRentDays",
    "leaseYears",
    "transferFee",
    "exhaust",
    "gas",
    "threePhase",
    "drainage",
    "greaseTrap",
    "fireSprinkler",
    "electricCapacityKw",
    "visibility",
    "risks",
    "upfrontCash",
  ];

  requiredKeys.forEach((key) => {
    assert.ok(
      Object.prototype.hasOwnProperty.call(sample, key),
      "缺少字段：" + key
    );
  });

  const same = propertySystem.getListing(sample.id);

  assert.deepStrictEqual(same, sample, "同一 marketEpoch 下房源必须稳定");

  const filtered = propertySystem.searchListings({
    districtId: "university",

    minArea: 50,

    maxArea: 120,

    requireExhaust: true,

    maxRiskLevel: 2,

    sortBy: "monthlyRent",
  });

  assert.ok(
    filtered.every(
      (item) =>
        item.grossArea >= 50 &&
        item.grossArea <= 120 &&
        item.exhaust === true &&
        item.riskLevel <= 2
    ),
    "筛选结果不符合条件"
  );

  console.log("property foundation tests passed");

  console.log(JSON.stringify(stats, null, 2));
}

run();
