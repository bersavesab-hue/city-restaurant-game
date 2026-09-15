'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const androidSource = fs.readFileSync(
  path.join(ROOT, 'android/entry.js'),
  'utf8'
);

const sceneSource = fs.readFileSync(
  path.join(ROOT, 'src/scenes/renovationScene.js'),
  'utf8'
);

for (const token of [
  'V0849_HOTFIX_TOUCH_BRIDGE',
  'onTouchStart(callback)',
  "'touchstart'",
  'onTouchMove(callback)',
  "'touchmove'",
  "canvas.style.touchAction = 'none'"
]) {
  assert.ok(androidSource.includes(token), 'Android拖动桥缺失：' + token);
}

for (const token of [
  'V0849_HOTFIX_RENOVATION_INTERACTION_LAYOUT',
  'areaVisualScale',
  '拖动黄点/虚线调面积',
  "const cols =\n      2",
  '餐桌落位点已满，请拖动分区扩大堂食区'
]) {
  assert.ok(sceneSource.includes(token), '装修热修复缺失：' + token);
}

let height = 780;

globalThis.GameRuntime = {
  api: {
    getSystemInfoSync() {
      return {
        windowWidth: 390,
        windowHeight: height
      };
    },
    showToast() {},
    setStorageSync() {},
    getStorageSync() {
      return null;
    }
  },
  requestRender() {}
};

const scene = require('../src/scenes/renovationScene.js');

const small = scene.getGeometryFrame(
  {
    widthM: 8,
    depthM: 8,
    areaM2: 64
  },
  0,
  0,
  300,
  220
);

const large = scene.getGeometryFrame(
  {
    widthM: 16,
    depthM: 16,
    areaM2: 256
  },
  0,
  0,
  300,
  220
);

assert.ok(
  small.w * small.h < large.w * large.h,
  '64㎡门店不能再被放大成和256㎡门店一样大的装修区域'
);

height = 600;
scene.getLayout();
const shortLayout = scene.getMainGeometry();

assert.ok(
  shortLayout.y >= 92,
  '矮屏装修主体不能压进顶部88px门店头图'
);

console.log('V0.8.49 renovation interaction/layout hotfix tests passed');
