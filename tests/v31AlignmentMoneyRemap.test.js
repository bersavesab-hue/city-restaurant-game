"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const main = fs.readFileSync(
  path.join(ROOT, "src/main.js"),
  "utf8"
);

assert.ok(
  main.includes("V31_ALIGNMENT_MONEY_REMAP"),
  "V31覆盖层必须写入"
);

assert.ok(
  main.includes("function v31FormatMoney"),
  "必须存在可用资金紧凑格式化函数"
);

assert.ok(
  main.includes("'万亿'") &&
  main.includes("'亿'") &&
  main.includes("'万'"),
  "金额格式必须支持万、亿、万亿"
);

assert.ok(
  main.includes("CARD_Y = NAV_Y - CARD_H"),
  "详情卡底边必须与底栏顶边对齐"
);

assert.ok(
  main.includes("industry:   { x: 0.185, y: 0.710"),
  "工业园必须映射到左下工业区域"
);

assert.ok(
  main.includes("village:    { x: 0.780, y: 0.465"),
  "城中村必须映射到右中区域"
);

assert.ok(
  main.includes("market:     { x: 0.735, y: 0.670"),
  "东门市场必须映射到右下市场区域"
);

assert.ok(
  main.includes("const subW = Math.max"),
  "商圈副标题必须支持动态宽度，避免东门市场文字截断"
);

assert.ok(
  main.includes("V28_MARKER_IMAGE_KEYS[district.id]"),
  "详情卡商圈小图标必须使用正确的商圈映射"
);

assert.ok(
  !main.includes("V27_TARGET_REFERENCE_SKIN"),
  "不能恢复错误的整页截图覆盖层"
);

console.log("V31 alignment, money and district remap regression tests passed");
