"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(ROOT, "src/main.js"), "utf8");

assert.ok(!main.includes("V27_TARGET_REFERENCE_SKIN"), "不能残留整页截图覆盖层");
assert.ok(main.includes("V26_HARD_REBUILD_HOME"), "必须仍然基于V26动态主页");
assert.ok(main.includes("V28_TARGET_MARKERS_AND_BADGES"), "V28针标徽记层必须写入");
assert.ok(main.includes("resourceManager.loadImage('v28_marker_university'"), "必须加载目标图大学城针标");
assert.ok(main.includes("resourceManager.loadImage('v28_badge_high_popularity'"), "必须加载目标图状态徽记");
assert.ok(main.includes("V28_MARKER_IMAGE_KEYS"), "必须建立针标映射");
assert.ok(main.includes("V28_BADGE_IMAGE_KEYS"), "必须建立状态徽记映射");
assert.ok(main.includes("drawDistrictMarker = function (district)"), "必须接管商圈标记绘制");

const required = [
  "assets/images/target_home/markers/university.png",
  "assets/images/target_home/markers/hightech.png",
  "assets/images/target_home/markers/cbd.png",
  "assets/images/target_home/markers/oldtown.png",
  "assets/images/target_home/markers/village.png",
  "assets/images/target_home/markers/industry.png",
  "assets/images/target_home/markers/market.png",
  "assets/images/target_home/status/high_popularity.png",
  "assets/images/target_home/status/high_competition.png",
  "assets/images/target_home/status/low_rent.png",
  "assets/images/target_home/status/my_store.png"
];

for (const rel of required) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), "缺少目标资源: " + rel);
}

console.log("V28 marker and badge regression tests passed");
