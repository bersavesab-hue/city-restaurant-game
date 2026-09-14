'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const reconcile = fs.readFileSync(
  path.join(ROOT, 'scripts/ci-reconcile-update-race-v052.js'),
  'utf8'
);

const manifest = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, 'PATCH_MANIFEST.json'),
    'utf8'
  )
);

const scene = fs.readFileSync(
  path.join(ROOT, 'src/scenes/renovationScene.js'),
  'utf8'
);

assert.ok(
  reconcile.includes('V48.3_PRESERVE_VALIDATED_UPDATE'),
  '缺少V48.3工作区保留标记'
);

assert.ok(
  reconcile.includes('hasDirectValidatedPatch'),
  '恢复脚本必须识别直接验证补丁'
);

assert.ok(
  reconcile.includes('不执行 git reset --hard') ||
  reconcile.includes('preserve'),
  '直接补丁必须跳过硬重置'
);

assert.equal(
  manifest.preserve_workspace,
  true,
  'PATCH_MANIFEST必须要求保留当前工作区'
);

assert.ok(
  Array.isArray(manifest.notes) &&
  manifest.notes.some(
    x => /does not modify \.github\/workflows/.test(x)
  ),
  '必须兼容V0.5.2 recovery contract'
);

assert.ok(
  scene.includes('V47_RENOVATION_REFERENCE_REBUILD') &&
  scene.includes('V48_DYNAMIC_FLOOR_GEOMETRY_UI'),
  '最终装修页必须是V47+V48'
);

assert.ok(
  !scene.includes("'v45_layout_dining'") &&
  !scene.includes("'v45_layout_kitchen'"),
  '最终主平面图不得退回旧缩略图拼贴模式'
);

console.log('V48.3 workspace persistence tests passed');
