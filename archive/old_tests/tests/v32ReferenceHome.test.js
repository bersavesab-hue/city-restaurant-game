"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(ROOT, "src/main.js"), "utf8");

assert.ok(main.includes("V32_REFERENCE_HOME_REBUILD"), "V32主页重制层必须存在");
assert.ok(!main.includes("V30_LAYOUT_CALIBRATION"), "V32必须清理V30旧版式层");
assert.ok(!main.includes("V31_ALIGNMENT_MONEY_REMAP"), "V32必须清理V31旧版式层");
assert.ok(main.includes("v32_home_background"), "V32必须加载新的干净城市背景");
assert.ok(main.includes("v32_bottom_nav_reference"), "V32必须使用参考图底栏资源");
const v32Start = main.indexOf("/* V32_REFERENCE_HOME_REBUILD */");
assert.ok(v32Start >= 0, "V32主页重制层必须存在");
const v32Block = main.slice(v32Start);

assert.ok(
  v32Block.includes("{ id: 'renovation', label: '装修'"),
  "V32最终底栏第三项必须改成装修"
);

assert.ok(
  !v32Block.includes("{ id: 'traffic', label: '客流'"),
  "V32最终覆盖层不能保留客流入口"
);
assert.ok(main.includes("function v32FormatMoney"), "可用资金必须支持自适应格式");
assert.ok(main.includes("'万亿'") && main.includes("'亿'") && main.includes("'万'"), "资金格式必须支持大额");
assert.ok(main.includes("V32_PREVIEW_KEYS"), "详情卡必须使用7个新商圈小图");
assert.ok(main.includes("V32_MARKER_KEYS"), "地图必须使用7个新立体标记");
assert.ok(main.includes("drawDistrictCard = function ()"), "必须重制详情卡");
assert.ok(main.includes("drawBottomNav = function ()"), "必须重制底部导航");
assert.ok(!main.includes("V27_TARGET_REFERENCE_SKIN"), "不能恢复整页静态截图覆盖");

const required = [
  "assets/images/v32_home/home_background.jpg",
  "assets/images/v32_home/bottom_nav_reference.png",
  "assets/images/v32_home/nav_renovation.png",
  "assets/images/v32_home/marker_university.png",
  "assets/images/v32_home/marker_hightech.png",
  "assets/images/v32_home/marker_cbd.png",
  "assets/images/v32_home/marker_oldtown.png",
  "assets/images/v32_home/marker_village.png",
  "assets/images/v32_home/marker_industry.png",
  "assets/images/v32_home/marker_market.png",
  "assets/images/v32_home/preview_university.jpg",
  "assets/images/v32_home/preview_hightech.jpg",
  "assets/images/v32_home/preview_cbd.jpg",
  "assets/images/v32_home/preview_oldtown.jpg",
  "assets/images/v32_home/preview_village.jpg",
  "assets/images/v32_home/preview_industry.jpg",
  "assets/images/v32_home/preview_market.jpg"
];

for (const rel of required) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), "缺少V32资源: " + rel);
}

console.log("V32 reference homepage regression tests passed");
