"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const main = fs.readFileSync(
  path.resolve(__dirname, "../src/main.js"),
  "utf8"
);

assert.ok(main.includes("V25_STRICT_HOME_LAYOUT"), "V25最终覆盖层必须写入");
assert.ok(main.includes("university: { x: 0.17, y: 0.13"), "大学城必须明显上移");
assert.ok(main.includes("hightech:   { x: 0.80, y: 0.15"), "高新区必须明显上移");
assert.ok(main.includes("CARD_H = VIEW_H < 740 ? 96 : 102"), "详情卡必须明显变矮");
assert.ok(main.includes("NAV_H = (VIEW_H < 740 ? 64 : 68)"), "底栏必须增高");
assert.ok(main.includes("v21DrawImage(key, 0, -4, 46, 58)"), "商圈针标必须继续放大");
assert.ok(main.includes("drawBottomNav = function ()"), "V25必须最终接管底栏");
assert.ok(main.includes("demandSystem.getTotalDemand(district.id).toLocaleString()"), "需求必须继续读取真实动态数据");

console.log("V25 strict homepage layout regression tests passed");
