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

const source =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/renovationScene.js'
    ),
    'utf8'
  );

assert.ok(
  source.includes(
    'V17_RENOVATION_UI_REWRITE'
  ),
  '装修页必须使用V17全量重写版本'
);

for (
  const token of [
    'premium_reno_header',
    'premium_floor_texture',
    'premium_template_1',
    'visual_stove',
    'visual_fridge'
  ]
) {
  assert.ok(
    source.includes(
      token
    ),
    '装修页缺少资源：' +
      token
  );
}

assert.ok(
  source.includes(
    "'visual_table_'"
  ) &&
  source.includes(
    'visual_table_8'
  ),
  '装修页必须通过动态桌型键绘制2/4/6/8人桌'
);

for (
  const action of [
    "'template:save'",
    "'template:save-as'",
    "'shop:rename'",
    "'room:add'",
    "'room:rename:'",
    "'room:seats:'",
    "'room:style:'",
    "'room:remove:'",
    "'template:apply:'",
    "'template:rename:'",
    "'template:delete:'",
    "'history:undo'",
    "'history:redo'",
    "'construction:start'"
  ]
) {
  assert.ok(
    source.includes(
      action
    ),
    '装修真实交互缺失：' +
      action
  );
}

assert.ok(
  source.includes(
    'getContractorQuotes'
  ) &&
  source.includes(
    'selectContractor'
  ) &&
  source.includes(
    'startConstruction'
  ),
  '施工流程必须是真实系统调用'
);

console.log(
  'V17 renovation rewrite tests passed'
);
