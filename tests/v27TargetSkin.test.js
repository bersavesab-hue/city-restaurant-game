"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(ROOT, "src/main.js"), "utf8");

assert.ok(main.includes("V27_TARGET_REFERENCE_SKIN"), "V27.1皮肤必须写入");
assert.ok(main.includes("v27_target_home_full"), "必须加载目标图视觉母版");
assert.ok(main.includes("assets/images/target_home/reference/target_game_ui.png"), "目标图资源路径必须接入");
assert.ok(main.includes("const V27_REF_W = 691"), "必须按691参考宽度缩放");
assert.ok(main.includes("V27_DISTRICT_HOTSPOTS"), "必须采用目标图商圈坐标");
assert.ok(main.includes("drawMapBase = function ()"), "必须接管主页视觉背景");
assert.ok(main.includes("drawTopHud = function ()"), "必须接管HUD动态覆盖");
assert.ok(main.includes("drawDistrictMarker = function (district)"), "必须接管商圈点击层");
assert.ok(main.includes("drawDistrictCard = function ()"), "必须接管详情卡动态值");
assert.ok(main.includes("drawBottomNav = function ()"), "必须接管底栏交互层");

const required = [
  "assets/images/target_home/reference/target_game_ui.png",
  "assets/images/target_home/reference/map_visual_reference.png",
  "assets/images/target_home/detail/market_preview.png",
  "assets/images/target_home/detail/enter_button.png"
];

for (const rel of required) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), "缺少目标图资源: " + rel);
}

console.log("V27.1 target reference skin regression tests passed");
