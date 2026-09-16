'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const scene =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/renovationScene.js'
    ),
    'utf8'
  );

const system =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/renovation/renovationSystem.js'
    ),
    'utf8'
  );

const config =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/renovation/renovationConfig.js'
    ),
    'utf8'
  );

assert.ok(
  scene.includes(
    'V45_LIBRARY_RENOVATION_PHASE1'
  ),
  'V46必须包含V45资料库接入'
);

assert.ok(
  scene.includes(
    'V46_RENOVATION_PLAYABILITY_UI'
  ),
  'V46装修UI标记缺失'
);

assert.ok(
  system.includes(
    'V46_RENOVATION_PLAYABILITY_SYSTEM'
  ),
  'V46装修系统标记缺失'
);

assert.ok(
  config.includes(
    'V46_RENOVATION_DECOR_CONFIG'
  ),
  'V46软装配置标记缺失'
);

for (
  const token
  of [
    "'zones'",
    "'furniture'",
    "'contractors'",
    'renderZones(',
    'renderFurniture(',
    'renderContractors(',
    "'zone:'",
    "'decor:'",
    "'contractor:select:'",
    "'construction:confirm'",
    "'aisle:cycle'"
  ]
) {
  assert.ok(
    scene.includes(
      token
    ),
    '装修可玩性入口缺失：' +
      token
  );
}

for (
  const token
  of [
    'adjustDecor(',
    'decorComfortBonus',
    'decorAppealBonus',
    'renovationScore',
    'operatingImpact',
    'trafficFactor',
    'spendFactor',
    'serviceFactor'
  ]
) {
  assert.ok(
    system.includes(
      token
    ),
    '装修系统能力缺失：' +
      token
  );
}

for (
  const token
  of [
    "id: 'plant'",
    "id: 'pendant'",
    "id: 'screen'",
    "id: 'sofa'"
  ]
) {
  assert.ok(
    config.includes(
      token
    ),
    '软装配置缺失：' +
      token
  );
}

assert.ok(
  scene.includes(
    '选择施工队并开始施工'
  ),
  '施工前必须进入施工队选择'
);

assert.ok(
  scene.includes(
    '报价、工期、可靠度和质量'
  ),
  '施工队页面必须展示核心比较维度'
);

assert.ok(
  scene.includes(
    '客流 ×'
  ) &&
  scene.includes(
    '客单 ×'
  ) &&
  scene.includes(
    '服务 ×'
  ),
  '装修经营影响必须直接可见'
);

console.log(
  'V46 renovation playability tests passed'
);
