"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(ROOT, "src/main.js"), "utf8");

const start = main.indexOf("/* V33_GLOBAL_NAV_UNIFICATION */");
assert.ok(start >= 0, "V33全局导航覆盖层必须存在");

const block = main.slice(start);

assert.ok(
  block.includes("const V33_NAV_ITEMS"),
  "必须使用统一的7项导航定义"
);

for (const label of ["城市", "门店", "装修", "菜单", "供应链", "数据", "系统"]) {
  assert.ok(block.includes("label: '" + label + "'"), "缺少导航：" + label);
}

assert.ok(
  block.includes("function v33ActiveNavId()"),
  "必须按当前场景统一决定选中项"
);

assert.ok(
  block.includes("current === 'renovation'"),
  "装修页必须拥有独立选中态"
);

assert.ok(
  block.includes("drawBottomNav = function ()"),
  "V33必须最终接管全局底栏"
);

assert.ok(
  !block.includes("if (current === 'city') {"),
  "全局底栏不能再为城市页使用独立皮肤分支"
);

assert.ok(
  block.includes("addButton(") &&
  block.includes("'nav:' + item.scene"),
  "统一底栏必须保留真实页面导航按钮"
);

assert.ok(
  fs.existsSync(path.join(ROOT, "assets/images/v33_nav/renovation_active.png")),
  "缺少装修选中态图标"
);

assert.ok(
  !main.includes("V27_TARGET_REFERENCE_SKIN"),
  "不能恢复整页截图覆盖"
);

console.log("V33 global navigation regression tests passed");
