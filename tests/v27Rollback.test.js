"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const mainPath = path.join(ROOT, "src/main.js");
const main = fs.readFileSync(mainPath, "utf8");

assert.ok(
  !main.includes("V27_TARGET_REFERENCE_SKIN"),
  "V27整页截图覆盖层必须被完全移除"
);

assert.ok(
  main.includes("V26_HARD_REBUILD_HOME"),
  "恢复后必须继续保留V26动态主页"
);

assert.ok(
  !main.includes("v27_target_home_full"),
  "主页代码不能继续依赖整张目标截图作为底板"
);

assert.ok(
  main.includes("drawDistrictMarker = function (district)") &&
  main.includes("drawDistrictCard = function ()") &&
  main.includes("drawBottomNav = function ()"),
  "V26动态主页关键绘制逻辑必须继续存在"
);

assert.ok(
  main.includes("demandSystem.getTotalDemand(district.id).toLocaleString()"),
  "真实需求数据逻辑必须继续存在"
);

console.log("V27 rollback regression tests passed");
