'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const sceneSource = fs.readFileSync(
  path.join(ROOT, 'src/scenes/renovationScene.js'),
  'utf8'
);

const editorSource = fs.readFileSync(
  path.join(ROOT, 'src/renovation/renovationEditorV0862.js'),
  'utf8'
);

assert.ok(
  sceneSource.includes('V0862_PRO_RENOVATION_EDITOR_INSTALL'),
  '装修专业编辑器没有接入主场景'
);

for (const token of [
  'V0862_PRO_RENOVATION_EDITOR',
  'editorPlacements',
  "'editor:add:'",
  "'editor:rotate'",
  "'editor:duplicate'",
  "'editor:delete'",
  'nearestFreeSlot',
  'safeDecorPoint',
  '拖动',
  '空心黄点 = 可放餐桌位置'
]) {
  assert.ok(
    editorSource.includes(token),
    '装修专业编辑器能力缺失：' + token
  );
}

const editor = require('../src/renovation/renovationEditorV0862.js');

const slots = [
  { x: 1, y: 1 },
  { x: 3, y: 1 },
  { x: 5, y: 1 }
];

const chosen = editor.nearestFreeSlot(
  slots,
  [
    {
      id: 'a',
      kind: 'table4',
      mx: 1,
      my: 1
    }
  ],
  { mx: 3.2, my: 1 },
  null
);

assert.deepStrictEqual(
  chosen,
  { x: 3, y: 1 },
  '餐桌拖动必须吸附到最近的空闲合法落位点'
);

assert.ok(
  editor.visualSize('table8', 12).w >
  editor.visualSize('table2', 12).w,
  '不同桌型必须有真实视觉尺寸差异'
);

let height = 780;
let renderRequests = 0;

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
  requestRender() {
    renderRequests += 1;
  }
};

const gameState = require('../src/core/gameState.js');
const renovationSystem = require('../src/renovation/renovationSystem.js');
const scene = require('../src/scenes/renovationScene.js');

gameState.reset();
gameState.setCash(1500000);
gameState.addShop({
  id: 'v0862_editor_shop',
  name: '专业装修测试店',
  status: 'leased_pending_renovation',
  grossArea: 210,
  usableArea: 180,
  floor: '1层',
  frontage: 10,
  depth: 18,
  layoutTypeId: 'single_bay'
});

scene.shopId = 'v0862_editor_shop';
scene.page = 'layout';
scene.previewMode = false;
scene._editorMode = 'zones';
renovationSystem.ensurePlan(scene.shopId);

const gradient = {
  addColorStop() {}
};

const ctx = new Proxy({}, {
  get(target, key) {
    if (
      key === 'createLinearGradient' ||
      key === 'createRadialGradient'
    ) {
      return () => gradient;
    }

    if (key === 'measureText') {
      return value => ({
        width: String(value).length * 5
      });
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

function overlaps(buttons) {
  const found = [];

  for (let i = 0; i < buttons.length; i++) {
    for (let j = i + 1; j < buttons.length; j++) {
      const a = buttons[i];
      const b = buttons[j];
      const w =
        Math.min(a.x + a.w, b.x + b.w) -
        Math.max(a.x, b.x);
      const h =
        Math.min(a.y + a.h, b.y + b.h) -
        Math.max(a.y, b.y);

      if (w > 2 && h > 2) {
        found.push([a.id, b.id]);
      }
    }
  }

  return found;
}

for (const viewportHeight of [780, 667, 600]) {
  height = viewportHeight;
  scene.page = 'layout';
  scene._editorMode = 'zones';
  scene.render(ctx);

  assert.deepStrictEqual(
    overlaps(scene.buttons),
    [],
    viewportHeight + 'px 专业装修页点击区不能重叠'
  );

  assert.ok(
    scene.buttons.some(item => item.id === 'page:furniture'),
    '主编辑器必须直接提供家具模式'
  );

  assert.ok(
    scene.buttons.some(item => item.id === 'page:templates'),
    '主编辑器必须保留模板入口'
  );

  assert.ok(
    scene.floorCanvasInteraction &&
    scene.floorCanvasInteraction.frame,
    '主编辑器必须保持真实平面图触控区域'
  );
}

height = 780;
scene.page = 'layout';
scene._editorMode = 'furniture';
scene._editorSelectedId = null;
scene.render(ctx);

const addButton = scene.buttons.find(
  item => item.id === 'editor:add:table4'
);

assert.ok(
  addButton,
  '家具模式必须能直接添加4人桌'
);

const beforePlan = scene.getPlan();
const beforeCount = Number(beforePlan.floors[0].tables['4']) || 0;

assert.ok(
  scene.handleTap(
    addButton.x + addButton.w / 2,
    addButton.y + addButton.h / 2
  ),
  '点击家具库必须能真实添加家具'
);

const afterAdd = scene.getPlan();

assert.strictEqual(
  Number(afterAdd.floors[0].tables['4']),
  beforeCount + 1,
  '添加真实餐桌必须同步旧容量模型'
);

assert.ok(
  Array.isArray(afterAdd.floors[0].editorPlacements) &&
  afterAdd.floors[0].editorPlacements.some(
    item => item.id === scene._editorSelectedId
  ),
  '新增餐桌必须形成可拖动的持久化对象'
);

scene.render(ctx);

const rotateButton = scene.buttons.find(
  item => item.id === 'editor:rotate'
);

const deleteButton = scene.buttons.find(
  item => item.id === 'editor:delete'
);

assert.ok(rotateButton, '选中家具后必须可以旋转');
assert.ok(deleteButton, '选中家具后必须可以删除');

const selectedBefore =
  scene.getPlan().floors[0].editorPlacements.find(
    item => item.id === scene._editorSelectedId
  );

scene.handleTap(
  rotateButton.x + rotateButton.w / 2,
  rotateButton.y + rotateButton.h / 2
);

const selectedAfter =
  scene.getPlan().floors[0].editorPlacements.find(
    item => item.id === scene._editorSelectedId
  );

assert.notStrictEqual(
  selectedAfter.rotation,
  selectedBefore.rotation,
  '旋转操作必须写入真实装修对象'
);

scene.render(ctx);

const selectedRect =
  (scene._editorPlacementRects || []).find(
    item => item.id === scene._editorSelectedId
  );

assert.ok(selectedRect, '选中家具必须在平面图中有真实触控框');

const beforeRenderRequests = renderRequests;

assert.ok(
  scene.handleTouchStart(
    selectedRect.x + selectedRect.w / 2,
    selectedRect.y + selectedRect.h / 2
  ),
  '家具必须能被手指抓住'
);

assert.ok(
  scene.handleTouchMove(
    selectedRect.x + selectedRect.w / 2 + 26,
    selectedRect.y + selectedRect.h / 2 + 18
  ),
  '家具拖动必须实时响应'
);

assert.ok(
  renderRequests > beforeRenderRequests,
  '家具拖动过程中必须实时重绘'
);

assert.ok(
  scene.handleTouchEnd(),
  '家具拖动结束必须正常提交'
);

scene.render(ctx);

const deleteNow = scene.buttons.find(
  item => item.id === 'editor:delete'
);

assert.ok(deleteNow, '拖动后家具仍应保持选中');

scene.handleTap(
  deleteNow.x + deleteNow.w / 2,
  deleteNow.y + deleteNow.h / 2
);

const afterDelete = scene.getPlan();

assert.strictEqual(
  Number(afterDelete.floors[0].tables['4']),
  beforeCount,
  '删除真实餐桌必须同步旧容量模型'
);

console.log('V0.8.62 professional renovation editor tests passed');
