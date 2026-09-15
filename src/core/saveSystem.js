'use strict';

const gameState =
  require('./gameState.js');

const saveMigration =
  require('./saveMigrationV0813.js');

const seedManager =
  require('./seedManagerV0813.js');

// Keep the original storage key so existing players never lose their save.
const SAVE_KEY = 'city_restaurant_save_v1';
const BACKUP_KEY = 'city_restaurant_save_v1_backup';
const GAME_VERSION = '0.8.13';

class SaveSystem {
  constructor(options) {
    const opts = options || {};

    this.gameState =
      opts.gameState ||
      gameState;

    this.seedManager =
      opts.seedManager ||
      (
        this.gameState === gameState
          ? seedManager
          : seedManager.createSeedManager({
              gameState:
                this.gameState
            })
      );

    this.migration =
      opts.migration ||
      saveMigration;

    this.api =
      opts.api !== undefined
        ? opts.api
        : globalThis.GameRuntime &&
          globalThis.GameRuntime.api;

    // V083_SAVE_THROTTLE
    this.lastAutoSaveAt = 0;
    this.autoSaveIntervalMs = 20000;
    this.dirty = false;
    this.lastLoadInfo = null;
  }

  getApi() {
    if (!this.api) {
      this.api =
        globalThis.GameRuntime &&
        globalThis.GameRuntime.api;
    }

    return this.api;
  }

  setApi(api) {
    this.api = api || null;
    return !!this.api;
  }

  readRaw(key) {
    const api = this.getApi();

    if (
      !api ||
      typeof api.getStorageSync !==
        'function'
    ) {
      return null;
    }

    try {
      return api.getStorageSync(key);
    } catch (error) {
      return null;
    }
  }

  migrateRaw(raw) {
    return this.migration.migrate(
      raw,
      {
        gameVersion:
          GAME_VERSION
      }
    );
  }

  buildEnvelope() {
    this.seedManager
      .ensureMasterSeed();

    return this.migration
      .createEnvelope(
        this.gameState
          .exportSave(),
        {
          gameVersion:
            GAME_VERSION,
          savedAt:
            Date.now()
        }
      );
  }

  writePrimary(
    envelope,
    rotateBackup
  ) {
    const api = this.getApi();

    if (
      !api ||
      typeof api.setStorageSync !==
        'function' ||
      !envelope
    ) {
      return false;
    }

    if (
      rotateBackup !== false &&
      typeof api.getStorageSync ===
        'function'
    ) {
      const current =
        this.readRaw(
          SAVE_KEY
        );

      const validCurrent =
        this.migrateRaw(
          current
        );

      if (validCurrent.ok) {
        api.setStorageSync(
          BACKUP_KEY,
          validCurrent.envelope
        );
      }
    }

    api.setStorageSync(
      SAVE_KEY,
      envelope
    );

    return true;
  }

  /**
   * 保存游戏。
   * V0.8.13: 写主存档前自动保留上一份有效存档，避免一次异常写入毁掉全部进度。
   */
  save() {
    const api = this.getApi();

    if (!api) {
      console.warn(
        'SaveSystem: 平台 API 不存在'
      );

      return false;
    }

    try {
      const envelope =
        this.buildEnvelope();

      if (!envelope) {
        return false;
      }

      if (
        !this.writePrimary(
          envelope,
          true
        )
      ) {
        return false;
      }

      this.lastAutoSaveAt =
        Date.now();
      this.dirty = false;

      console.log(
        '游戏保存成功'
      );

      return true;
    } catch (error) {
      console.error(
        '保存失败：',
        error
      );

      return false;
    }
  }

  tryLoadKey(key) {
    const raw =
      this.readRaw(key);

    const result =
      this.migrateRaw(raw);

    if (!result.ok) {
      return {
        ok:false,
        key,
        result
      };
    }

    const success =
      this.gameState
        .importSave(
          result.envelope
            .gameData
        );

    if (!success) {
      return {
        ok:false,
        key,
        result:{
          ok:false,
          code:'GAME_STATE_IMPORT_FAILED'
        }
      };
    }

    this.seedManager
      .ensureMasterSeed();

    return {
      ok:true,
      key,
      result
    };
  }

  /**
   * 读取存档。
   * 主存档损坏时自动尝试上一份有效备份；旧V1存档会无损迁移到V2外层格式。
   */
  load() {
    const api = this.getApi();

    if (!api) {
      return false;
    }

    try {
      let loaded =
        this.tryLoadKey(
          SAVE_KEY
        );

      let recovered = false;

      if (!loaded.ok) {
        loaded =
          this.tryLoadKey(
            BACKUP_KEY
          );

        recovered =
          loaded.ok;
      }

      if (!loaded.ok) {
        console.log(
          '暂无可用存档'
        );

        this.lastLoadInfo = {
          ok:false,
          source:null,
          recovered:false,
          code:
            loaded.result &&
            loaded.result.code ||
            'SAVE_MISSING'
        };

        return false;
      }

      const migration =
        loaded.result;

      this.lastLoadInfo = {
        ok:true,
        source:
          loaded.key ===
            BACKUP_KEY
            ? 'backup'
            : 'primary',
        recovered,
        migrated:
          !!migration.migrated,
        sourceVersion:
          migration.sourceVersion
      };

      if (
        migration.migrated ||
        recovered
      ) {
        const upgraded =
          this.buildEnvelope();

        this.writePrimary(
          upgraded,
          false
        );
      }

      console.log(
        recovered
          ? '存档读取成功（已从备份恢复）'
          : '存档读取成功'
      );

      return true;
    } catch (error) {
      console.error(
        '读取存档失败：',
        error
      );

      return false;
    }
  }

  /**
   * 判断是否存在至少一份可迁移、可校验的存档。
   */
  hasSave() {
    const primary =
      this.migrateRaw(
        this.readRaw(
          SAVE_KEY
        )
      );

    if (primary.ok) {
      return true;
    }

    const backup =
      this.migrateRaw(
        this.readRaw(
          BACKUP_KEY
        )
      );

    return !!backup.ok;
  }

  /**
   * 删除主存档和自动备份。
   */
  clear() {
    const api = this.getApi();

    if (!api) {
      return false;
    }

    try {
      if (
        typeof api.removeStorageSync ===
        'function'
      ) {
        api.removeStorageSync(
          SAVE_KEY
        );

        api.removeStorageSync(
          BACKUP_KEY
        );

        this.lastLoadInfo = null;

        console.log(
          '存档已删除'
        );

        return true;
      }

      return false;
    } catch (error) {
      console.error(
        '删除存档失败：',
        error
      );

      return false;
    }
  }

  /**
   * 新开游戏：清空旧存档、重置状态，并生成新的全局主种子。
   */
  newGame() {
    this.clear();

    this.gameState.reset();

    this.seedManager
      .reseed(
        'new-game:' +
        Date.now()
      );

    const saved =
      this.save();

    console.log(
      '新游戏创建成功'
    );

    return saved;
  }

  getLastLoadInfo() {
    return this.lastLoadInfo
      ? {
          ...this.lastLoadInfo
        }
      : null;
  }

  /**
   * 自动保存。高频模拟只标记脏状态，默认每20秒最多同步写一次。
   * 切后台、重大交易仍可直接调用 save() 强制落盘。
   */
  autoSave(force) {
    // V083_SAVE_THROTTLE_AUTO
    this.dirty = true;

    const now = Date.now();
    const elapsed =
      now -
      Number(
        this.lastAutoSaveAt ||
        0
      );

    if (
      force !== true &&
      this.lastAutoSaveAt > 0 &&
      elapsed <
        this.autoSaveIntervalMs
    ) {
      return true;
    }

    return this.save();
  }

  flush() {
    if (!this.dirty) {
      return true;
    }

    return this.save();
  }
}

const saveSystem =
  new SaveSystem();

saveSystem.createSaveSystem =
  function createSaveSystem(options) {
    return new SaveSystem(options);
  };

saveSystem.SAVE_KEY =
  SAVE_KEY;
saveSystem.BACKUP_KEY =
  BACKUP_KEY;
saveSystem.SAVE_VERSION =
  saveMigration.CURRENT_SAVE_VERSION;
saveSystem.GAME_VERSION =
  GAME_VERSION;

module.exports =
  saveSystem;
