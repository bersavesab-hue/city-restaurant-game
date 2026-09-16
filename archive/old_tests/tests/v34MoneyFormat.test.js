"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(ROOT, "src/main.js"), "utf8");

const start = main.indexOf("/* V34_MONEY_FORMAT_FIX */");
assert.ok(start >= 0, "V34资金修复层必须存在");

const block = main.slice(start);

assert.ok(
  block.includes("v32FormatMoney = function (value)"),
  "V34必须接管顶部资金格式化"
);

assert.ok(
  block.includes("abs >= 10000"),
  "超过1万元必须切换为万单位"
);

assert.ok(
  block.includes("abs >= 100000000"),
  "超过1亿元必须切换为亿单位"
);

assert.ok(
  block.includes("abs >= 1000000000000"),
  "超大资金必须支持万亿单位"
);

assert.ok(
  block.includes("+ '万'") &&
  block.includes("+ '亿'") &&
  block.includes("+ '万亿'"),
  "资金单位必须完整"
);

assert.ok(
  main.includes("V33_GLOBAL_NAV_UNIFICATION"),
  "不能破坏V33全局统一底栏"
);

assert.ok(
  main.includes("V32_REFERENCE_HOME_REBUILD"),
  "不能破坏V32主页"
);

assert.ok(
  !main.includes("V27_TARGET_REFERENCE_SKIN"),
  "不能恢复错误的整页截图覆盖层"
);

console.log("V34 money format regression tests passed");
