'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const saveMigration =
  require('../src/core/saveMigrationV0813.js');

const saveSystemModule =
  require('../src/core/saveSystem.js');

function clone(value) {
  return value === undefined
    ? undefined
    : JSON.parse(
        JSON.stringify(value)
      );
}

const storage = {};

const api = {
  getStorageSync(key) {
    return clone(
      storage[key]
    );
  },
  setStorageSync(key, value) {
    storage[key] =
      clone(value);
  },
  removeStorageSync(key) {
    delete storage[key];
  }
};

const saveSystem =
  saveSystemModule
    .createSaveSystem({
      api,
      gameState
    });

// Legacy V1 envelope must load without losing data.
gameState.reset();
gameState.setCash(76543);
gameState.getSimulation().seed =
  24680;

const legacyGameData =
  gameState.exportSave();

delete legacyGameData.random;

storage[
  saveSystemModule.SAVE_KEY
] = {
  saveVersion:1,
  savedAt:123456789,
  gameData:legacyGameData
};

gameState.reset();

assert.strictEqual(
  saveSystem.load(),
  true,
  'V1旧存档必须自动迁移并成功读取'
);

assert.strictEqual(
  gameState.getPlayer().cash,
  76543,
  '迁移不能丢失玩家资金'
);

assert.strictEqual(
  gameState.getSimulation().seed,
  24680,
  '迁移不能改变旧世界 simulation.seed'
);

assert.ok(
  gameState.getData().random &&
  String(
    gameState.getData()
      .random.masterSeed ||
      ''
  ).startsWith('legacy-'),
  '旧世界种子必须生成稳定的全局主种子'
);

assert.strictEqual(
  storage[
    saveSystemModule.SAVE_KEY
  ].saveVersion,
  2,
  '旧存档读取成功后必须升级到V2外层格式'
);

assert.ok(
  storage[
    saveSystemModule.SAVE_KEY
  ].checksum,
  'V2存档必须带完整性校验'
);

// Raw gameData (very old/manual export) must also be migratable.
const rawResult =
  saveMigration.migrate(
    legacyGameData,
    {
      gameVersion:'0.8.13'
    }
  );

assert.ok(
  rawResult.ok &&
  rawResult.sourceVersion === 0,
  '裸 gameData 也必须有迁移路径'
);

// Make two valid saves so the previous valid primary becomes backup.
gameState.setCash(11111);
assert.ok(saveSystem.save());

gameState.setCash(22222);
assert.ok(saveSystem.save());

assert.ok(
  storage[
    saveSystemModule.BACKUP_KEY
  ],
  '覆盖主存档前必须保留上一份有效备份'
);

// Corrupt current primary without updating checksum.
storage[
  saveSystemModule.SAVE_KEY
].gameData.player.cash =
  99999;

gameState.reset();

assert.strictEqual(
  saveSystem.load(),
  true,
  '主存档校验失败时必须自动回退到备份'
);

assert.strictEqual(
  gameState.getPlayer().cash,
  11111,
  '备份恢复必须恢复上一份有效进度'
);

const loadInfo =
  saveSystem.getLastLoadInfo();

assert.strictEqual(
  loadInfo.source,
  'backup'
);

assert.strictEqual(
  loadInfo.recovered,
  true
);

// A future save version must never be silently downgraded.
const future =
  saveMigration.migrate({
    saveVersion:999,
    gameData:
      gameState.exportSave()
  });

assert.strictEqual(
  future.ok,
  false
);

assert.strictEqual(
  future.code,
  'FUTURE_SAVE_VERSION'
);

assert.ok(
  saveSystem.clear(),
  '清档必须成功'
);

assert.strictEqual(
  storage[
    saveSystemModule.SAVE_KEY
  ],
  undefined
);

assert.strictEqual(
  storage[
    saveSystemModule.BACKUP_KEY
  ],
  undefined
);

console.log(
  'V0.8.13 save migration/recovery tests passed'
);
