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

const gameState =
  require('../src/core/gameState.js');

const dynamicWorld =
  require('../src/world/dynamicWorldSystemV0815.js');

gameState.reset();

const state =
  dynamicWorld.getState();

state.metrics.eventsTriggered =
  4;

state.metrics.policiesProposed =
  2;

state.metrics.dialoguesGenerated =
  3;

state.metrics.barragesGenerated =
  5;

let unread =
  dynamicWorld
    .getUnreadCounts();

assert.deepEqual(
  unread,
  {
    events:4,
    policies:2,
    dialogues:3,
    barrages:5,
    discussion:8,
    total:14
  },
  '必须正确统计动态世界未读'
);

dynamicWorld.markSeen(
  'dynamic'
);

unread =
  dynamicWorld
    .getUnreadCounts();

assert.equal(
  unread.events,
  0,
  '打开动态页后事件必须标记已读'
);

assert.equal(
  unread.total,
  10,
  '其他未读不能被误清空'
);

dynamicWorld.markSeen(
  'discussion'
);

unread =
  dynamicWorld
    .getUnreadCounts();

assert.equal(
  unread.discussion,
  0,
  '讨论页必须同时读取对话和弹幕'
);

const sceneSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/dynamicWorldScene.js'
    ),
    'utf8'
  );

for (
  const word
  of [
    '动态',
    '政策',
    '讨论',
    '人物',
    '当前实际影响',
    '政策时间线',
    '查看人物'
  ]
) {
  assert.ok(
    sceneSource.includes(
      word
    ),
    '动态中心缺少：' +
      word
  );
}

const main =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/main.js'
    ),
    'utf8'
  );

assert.ok(
  main.includes(
    "require('./scenes/dynamicWorldScene.js')"
  ),
  '主程序必须加载动态中心'
);

assert.ok(
  main.includes(
    "sceneManager.register(\n  'dynamicWorld'"
  ),
  '动态中心必须注册为正式场景'
);

assert.ok(
  main.includes(
    ".switchTo(\n          'dynamicWorld'"
  ),
  '首页城市播报必须能进入动态中心'
);

assert.ok(
  main.includes(
    'unreadTotal'
  ),
  '首页播报必须显示动态世界未读'
);

assert.ok(
  sceneSource.includes(
    'adverseHighKeys'
  ),
  '事件详情必须正确区分成本上升与需求上升的正负方向'
);

console.log(
  'V0.8.16 dynamic world UI tests passed'
);
