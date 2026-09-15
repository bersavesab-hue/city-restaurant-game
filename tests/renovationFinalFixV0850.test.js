'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const androidSource = fs.readFileSync(path.join(ROOT, 'android/entry.js'), 'utf8');
const sceneSource = fs.readFileSync(path.join(ROOT, 'src/scenes/renovationScene.js'), 'utf8');

for (const token of [
  'V0850_FINAL_RENOVATION_MOBILE_FIX',
  'V0850_DRAG_LIVE_FEEDBACK',
  'requestRenderNow()',
  "['page:templates', 'reno_room_medium', '模板']",
  '本层餐桌',
  '空间状态'
]) {
  assert.ok(sceneSource.includes(token), '最终装修修复缺失：' + token);
}

for (const token of [
  'V0850_FINAL_RENOVATION_TOUCH_GUARD',
  "'touchcancel'",
  'cancelled:'
]) {
  assert.ok(androidSource.includes(token), 'Android触控收尾缺失：' + token);
}

let height = 780;
let renderRequests = 0;

globalThis.GameRuntime = {
  api: {
    getSystemInfoSync() {
      return { windowWidth: 390, windowHeight: height };
    },
    showToast() {},
    setStorageSync() {},
    getStorageSync() { return null; }
  },
  requestRender() {
    renderRequests += 1;
  }
};

const gameState = require('../src/core/gameState.js');
const scene = require('../src/scenes/renovationScene.js');
const renovationSystem = require('../src/renovation/renovationSystem.js');

gameState.reset();
gameState.setCash(1000000);
gameState.addShop({
  id: 'v0850_final_shop',
  name: '最终装修测试店',
  status: 'leased_pending_renovation',
  grossArea: 128,
  usableArea: 108,
  floor: '1层',
  frontage: 8
});

scene.shopId = 'v0850_final_shop';
scene.page = 'layout';
scene.previewMode = false;

const gradient = { addColorStop() {} };
const ctx = new Proxy({}, {
  get(target, key) {
    if (key === 'createLinearGradient' || key === 'createRadialGradient') {
      return () => gradient;
    }
    if (key === 'measureText') {
      return value => ({ width: String(value).length * 5 });
    }
    if (!target[key]) target[key] = () => {};
    return target[key];
  },
  set(target, key, value) {
    target[key] = value;
    return true;
  }
});

function overlaps(buttons) {
  const found = [];
  for (let i = 0; i < buttons.length; i++) {
    for (let j = i + 1; j < buttons.length; j++) {
      const a = buttons[i];
      const b = buttons[j];
      const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (w > 2 && h > 2) found.push([a.id, b.id]);
    }
  }
  return found;
}

for (const viewportHeight of [780, 667, 600]) {
  height = viewportHeight;
  scene.page = 'layout';
  scene.render(ctx);
  assert.deepStrictEqual(overlaps(scene.buttons), [], viewportHeight + 'px 主装修页点击区不能重叠');
  const geometry = scene.getMainGeometry();
  assert.ok(geometry.y >= 94, '装修主体不得侵入顶部');
  assert.ok(geometry.planH >= 250, '主平面图必须获得足够编辑高度');
}

height = 780;
scene.page = 'layout';
scene.render(ctx);

assert.ok(scene.buttons.some(item => item.id === 'page:furniture'), '主页面必须有家具入口');
assert.ok(scene.buttons.some(item => item.id === 'page:templates'), '主页面必须有模板入口');
assert.ok(scene.buttons.some(item => item.id === 'floor:next'), '主页面必须有楼层入口');
assert.ok(!scene.buttons.some(item => item.id.indexOf('table:') === 0), '主页面不再使用误触式点图加桌');

const interaction = scene.floorCanvasInteraction;
const dividerY = interaction.frame.y + interaction.frame.h * interaction.backRatio;
const beforeRender = renderRequests;
const beforeMetrics = renovationSystem.getMetrics('v0850_final_shop').floors[0];

assert.ok(scene.handleTouchStart(interaction.frame.x + 90, dividerY), '大触控区必须能抓住分区线');
assert.ok(scene.handleTouchMove(interaction.frame.x + 90, dividerY + 18), '拖动必须实时更新');
assert.ok(renderRequests > beforeRender, '拖动时必须立即请求重绘');
assert.ok(scene.handleTouchEnd(), '拖动结束必须正常提交');

const afterMetrics = renovationSystem.getMetrics('v0850_final_shop').floors[0];
assert.notStrictEqual(afterMetrics.kitchenRatio, beforeMetrics.kitchenRatio, '拖动后面积比例必须变化');
assert.ok(afterMetrics.valid, '拖动后方案仍需满足面积规则');

scene.page = 'furniture';
scene.render(ctx);
assert.deepStrictEqual(overlaps(scene.buttons), [], '家具页面点击区不能重叠');
for (const key of ['2', '4', '6', '8']) {
  assert.ok(scene.buttons.some(item => item.id === 'table:' + key + ':plus'), key + '人桌必须有加号');
  assert.ok(scene.buttons.some(item => item.id === 'table:' + key + ':minus'), key + '人桌必须有减号');
}

console.log('V0.8.50 final renovation mobile interaction tests passed');
