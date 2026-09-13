"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(ROOT, "src/main.js"), "utf8");

assert.ok(main.includes("V30_LAYOUT_CALIBRATION"), "V30版式层必须写入");
assert.ok(main.includes("CARD_H = VIEW_H < 740 ? 148 : 156"), "详情卡必须明显增高");
assert.ok(main.includes("metricW = Math.floor((w - 123 - metricGap * 5) / 6)"), "六项指标必须使用完整右侧宽度");
assert.ok(main.includes("const metricH = 52"), "指标卡高度必须增加");
assert.ok(main.includes("NAV_H = (VIEW_H < 740 ? 80 : 84) + SAFE_BOTTOM"), "底栏必须保留舒展高度");
assert.ok(main.includes("NAV_Y + 57"), "底栏文字需要更充分的上下间距");
assert.ok(main.includes("active ? 8.9 : 8.4"), "底栏字号必须增大");
assert.ok(main.includes("const boxW = Math.max(80, Math.min(96"), "商圈名称牌必须缩窄");
const v30Start = main.indexOf("/* V30_LAYOUT_CALIBRATION */");
assert.ok(v30Start >= 0, "V30版式层必须存在");
const v30Block = main.slice(v30Start);
assert.ok(
  !v30Block.includes("品牌：' + ((player.brandName"),
  "V30最终顶部覆盖层不得继续堆叠品牌副行"
);
assert.ok(main.includes("V29_CRISP_ICON_PASS"), "V29高清图标必须保留");
assert.ok(main.includes("V28_TARGET_MARKERS_AND_BADGES"), "V28商圈针标必须保留");
assert.ok(!main.includes("V27_TARGET_REFERENCE_SKIN"), "不能恢复V27整页截图覆盖层");

console.log("V30 layout calibration regression tests passed");
