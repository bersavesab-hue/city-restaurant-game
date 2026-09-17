'use strict';

const assert = require('assert');

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

const gameState = require('../src/core/gameState.js');
const scene = require('../src/scenes/renovationScene.js');
const renovationSystem = require('../src/renovation/renovationSystem.js');

gameState.reset();
gameState.setCash(1000000);
gameState.addShop({
  id: 'v0849_ui_shop',
  name: '装修界面测试店',
  status: 'leased_pending_renovation',
  grossArea: 110,
  usableArea: 96,
  floor: '1层',
  frontage: 8
});

scene.shopId = 'v0849_ui_shop';

const gradient = {
  addColorStop() {}
};

const ctx = new Proxy({}, {
  get(target, key) {
    if (key === 'createLinearGradient' || key === 'createRadialGradient') {
      return () => gradient;
    }
    if (key === 'measureText') {
      return value => ({ width: String(value).length * 5 });
    }
    if (!target[key]) {
      target[key] = () => {};
    }
    return target[key];
  },
  set(target, key, value) {
    target[key] = value;
    return true;
  }
});

function findOverlaps(buttons) {
  const overlaps = [];

  for (let i = 0; i < buttons.length; i++) {
    for (let j = i + 1; j < buttons.length; j++) {
      const a = buttons[i];
      const b = buttons[j];
      const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);

      if (w > 2 && h > 2) {
        overlaps.push([a.id, b.id]);
      }
    }
  }

  return overlaps;
}

for (const viewportHeight of [780, 667, 600]) {
  height = viewportHeight;
  scene.render(ctx);
  assert.deepStrictEqual(
    findOverlaps(scene.buttons),
    [],
    viewportHeight + 'px 高度下不能存在重叠点击区'
  );
}

height = 780;
scene.render(ctx);

const interaction = scene.floorCanvasInteraction;
const before = renovationSystem.getMetrics('v0849_ui_shop').floors[0];
const dividerY =
  interaction.frame.y +
  interaction.frame.h *
  interaction.backRatio;

assert.ok(
  scene.handleTouchStart(interaction.frame.x + 80, dividerY),
  '分区虚线必须可以开始拖动'
);

assert.ok(
  scene.handleTouchMove(interaction.frame.x + 80, dividerY + 12),
  '拖动分区线必须实时更新面积'
);

assert.ok(scene.handleTouchEnd(), '结束拖动必须提交面积调整');

const after = renovationSystem.getMetrics('v0849_ui_shop').floors[0];

assert.notStrictEqual(
  after.kitchenRatio,
  before.kitchenRatio,
  '拖动后后厨面积比例必须变化'
);

assert.ok(after.valid, '拖动不得破坏家具容量和最小堂食面积');

console.log('V0.8.49 renovation UI interaction tests passed');
