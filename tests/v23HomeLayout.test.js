"use strict";
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const mainPath = path.resolve(__dirname, '../src/main.js');
const source = fs.readFileSync(mainPath, 'utf8');

assert.ok(source.includes('V23_HOME_REMAP'), 'V23补丁必须写入 src/main.js');
assert.ok(source.includes('const V23_DISTRICT_LAYOUT = {'), 'V23必须定义新的商圈锚点布局');
assert.ok(source.includes("market: {\n    px: 0.16,\n    py: 0.85"), '东门市场应移动到左下区域');
assert.ok(source.includes("industry: {\n    px: 0.80,\n    py: 0.61"), '工业园应移动到右中区域');
assert.ok(source.includes("v21DrawImage(key, 0, -3, 40, 50)"), '商圈针标必须整体放大');
assert.ok(source.includes("drawText('品牌：' + ((gameState.getPlayer() && gameState.getPlayer().brandName) || '未命名品牌')"), '顶部应显示品牌名称');
assert.ok(source.includes("demandSystem.getTotalDemand(district.id).toLocaleString()"), '详情卡需求必须保持实时数据');
console.log('V23 home layout regression tests passed');
