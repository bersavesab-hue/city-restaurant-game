"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const main = fs.readFileSync(path.resolve(__dirname, "../src/main.js"), "utf8");
assert.ok(main.includes("V26_HARD_REBUILD_HOME"), "V26主页硬重构标记必须写入");
assert.ok(main.includes("university: { x: 0.18, y: 0.17"), "大学城锚点必须重排");
assert.ok(main.includes("market:     { x: 0.81, y: 0.79"), "东门市场必须移到右下主锚点");
assert.ok(main.includes("drawTopHud = function ()"), "V26必须接管顶部HUD");
assert.ok(main.includes("drawNewsTicker = function ()"), "V26必须接管城市播报");
assert.ok(main.includes("drawGoalBar = function ()"), "V26必须接管当前目标栏");
assert.ok(main.includes("drawDistrictCard = function ()"), "V26必须接管详情卡");
assert.ok(main.includes("drawBottomNav = function ()"), "V26必须接管底部导航");
assert.ok(main.includes("CARD_H = VIEW_H < 740 ? 118 : 126"), "V26详情卡高度必须重设");
assert.ok(main.includes("NAV_H = (VIEW_H < 740 ? 78 : 82)"), "V26底栏高度必须重设");
console.log("V26 hard rebuild regression tests passed");
