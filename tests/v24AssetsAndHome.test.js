"use strict";
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');

assert.ok(main.includes('V24_FINAL_HOME_PACK'), 'V24补丁必须写入 src/main.js');
assert.ok(main.includes("assets/images/v24/"), 'V24必须加载商圈预览图资源');
assert.ok(main.includes("const V24_DISTRICT_PREVIEW_KEYS = {"), 'V24必须定义商圈预览图映射');
assert.ok(main.includes("resourceManager.getImage(previewKey)"), '详情卡必须优先使用独立商圈预览图');
assert.ok(main.includes("drawImageFocus(\n    ctx,\n    image,\n    MAP_X,"), 'V24必须继续自定义地图底图绘制');

const assets = [
  'assets/images/map/city_base_01.png',
  'assets/images/v24/district_preview_university.png',
  'assets/images/v24/district_preview_hightech.png',
  'assets/images/v24/district_preview_cbd.png',
  'assets/images/v24/district_preview_oldtown.png',
  'assets/images/v24/district_preview_village.png',
  'assets/images/v24/district_preview_market.png',
  'assets/images/v24/district_preview_industry.png'
];
for (const item of assets) {
  assert.ok(fs.existsSync(path.join(ROOT, item)), '缺少资源文件: ' + item);
}

console.log('V24 assets and home regression tests passed');
