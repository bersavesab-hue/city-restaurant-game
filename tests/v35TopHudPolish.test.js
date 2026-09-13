"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(ROOT, "src/main.js"), "utf8");

const start = main.indexOf("/* V35_TOP_HUD_POLISH */");
assert.ok(start >= 0, "V35顶部HUD精修层必须存在");

const block = main.slice(start);

assert.ok(
  block.includes("assets/images/target_home/hud/icon_cash.png"),
  "V35必须复用图库里的小钞票图标"
);

assert.ok(
  block.includes("const w = 22") &&
  block.includes("const h = 17"),
  "资金图标必须缩小，避免挡住金额"
);

assert.ok(
  block.includes("const timeX = 244") &&
  block.includes("const timeH = 26"),
  "时间必须改成独立HUD信息框"
);

assert.ok(
  block.includes("display.time || '--:--'"),
  "时间文本必须继续动态读取"
);

assert.ok(
  block.includes("MEAL_NAMES[display.mealPeriod]"),
  "餐段必须继续动态读取"
);

assert.ok(
  main.includes("V34_MONEY_FORMAT_FIX"),
  "不能破坏V34金额万/亿格式"
);

assert.ok(
  main.includes("V33_GLOBAL_NAV_UNIFICATION"),
  "不能破坏V33统一底栏"
);

assert.ok(
  !main.includes("V27_TARGET_REFERENCE_SKIN"),
  "不能恢复错误的整页截图覆盖"
);

console.log("V35 top HUD polish regression tests passed");
