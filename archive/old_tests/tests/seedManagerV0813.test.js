'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const seedManager =
  require('../src/core/seedManagerV0813.js');

const simulationSystem =
  require('../src/core/simulationSystem.js');

gameState.reset();

seedManager.setMasterSeed(
  'fixed-master-seed'
);

const seedA1 =
  seedManager.deriveSeed(
    'customers',
    'shop-1'
  );

const seedA2 =
  seedManager.deriveSeed(
    'customers',
    'shop-1'
  );

const seedB =
  seedManager.deriveSeed(
    'suppliers',
    'shop-1'
  );

assert.strictEqual(
  seedA1,
  seedA2,
  '同一主种子/命名空间/作用域必须得到同一派生种子'
);

assert.notStrictEqual(
  seedA1,
  seedB,
  '不同命名空间必须隔离随机流'
);

const rng1 =
  seedManager.createRng(
    'events',
    'day-10'
  );

const rng2 =
  seedManager.createRng(
    'events',
    'day-10'
  );

const seq1 = [
  rng1.next(),
  rng1.next(),
  rng1.next()
];

const seq2 = [
  rng2.next(),
  rng2.next(),
  rng2.next()
];

assert.deepStrictEqual(
  seq1,
  seq2,
  '同一派生种子必须可重放同一随机序列'
);

const masterBefore =
  seedManager.ensureMasterSeed();

const saved =
  gameState.exportSave();

assert.ok(
  saved.random &&
  saved.random.masterSeed,
  '全局主种子必须进入游戏状态树'
);

gameState.reset();

assert.ok(
  gameState.importSave(saved),
  '带主种子的游戏状态必须可正常导入'
);

assert.strictEqual(
  seedManager.ensureMasterSeed(),
  masterBefore,
  '导入存档后主种子必须保持不变'
);

// Legacy compatibility: old tests and old systems may explicitly set simulation.seed.
gameState.reset();
gameState.getSimulation().seed =
  20260914;

assert.strictEqual(
  simulationSystem.getSeed(),
  20260914,
  '旧系统显式设置的 simulation.seed 必须继续具有最高兼容优先级'
);

console.log(
  'V0.8.13 seed manager tests passed'
);
