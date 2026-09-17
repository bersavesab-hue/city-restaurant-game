'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const required = [
  'src/foundation/createFoundation.js',
  'src/entities/entityFactory.js',
  'src/systems/personEngine.js',
  'src/property/propertyPackV02.js',
  'src/property/propertyAdapterV02.js',
  'src/person/personPackV10.js',
  'src/competitor/index.js',
  'src/customer/index.js',
  'src/easteregg/index.js'
];
for (const rel of required) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), `缺失正确运行路径: ${rel}`);
}

const forbidden = [
  'foundation/createFoundation.js',
  'property/propertyPackV02.js',
  'person/personPackV10.js',
  'easteregg/index.js',
  'scenes/shopScene.js'
];
for (const rel of forbidden) {
  assert.ok(!fs.existsSync(path.join(ROOT, rel)), `仍存在旧错误路径: ${rel}`);
}

const foundation = require('../src/foundation');
const f = foundation.createFoundation('layout-v050');
assert.ok(f && f.entities && f.registry, 'src/foundation 无法建立运行底座');
assert.ok(require('../src/competitor').pack, '竞对包无法从 src 加载');
assert.ok(require('../src/customer').pack, '顾客包无法从 src 加载');
assert.ok(require('../src/easteregg').pack, '彩蛋包无法从 src 加载');
console.log('layoutRepairV050.test.js PASS');
