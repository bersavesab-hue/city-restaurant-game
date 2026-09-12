'use strict';

const gameState = require('./gameState.js');

const SAVE_KEY = 'city_restaurant_save_v1';

class SaveSystem {
  constructor() {
    this.api =
      globalThis.GameRuntime &&
      globalThis.GameRuntime.api;
  }

  /**
   * 保存游戏
   */
  save() {
    if (!this.api) {
      console.warn(
        'SaveSystem: 平台 API 不存在'
      );

      return false;
    }

    try {
      const saveData = {
        saveVersion: 1,

        savedAt: Date.now(),

        gameData:
          gameState.exportSave()
      };

      if (
        this.api.setStorageSync
      ) {
        this.api.setStorageSync(
          SAVE_KEY,
          saveData
        );

        console.log(
          '游戏保存成功'
        );

        return true;
      }

      return false;
    } catch (error) {
      console.error(
        '保存失败：',
        error
      );

      return false;
    }
  }

  /**
   * 读取存档
   */
  load() {
    if (!this.api) {
      return false;
    }

    try {
      if (
        !this.api.getStorageSync
      ) {
        return false;
      }

      const saveData =
        this.api.getStorageSync(
          SAVE_KEY
        );

      if (
        !saveData ||
        !saveData.gameData
      ) {
        console.log(
          '暂无存档'
        );

        return false;
      }

      const success =
        gameState.importSave(
          saveData.gameData
        );

      if (success) {
        console.log(
          '存档读取成功'
        );
      }

      return success;
    } catch (error) {
      console.error(
        '读取存档失败：',
        error
      );

      return false;
    }
  }

  /**
   * 判断是否存在存档
   */
  hasSave() {
    if (
      !this.api ||
      !this.api.getStorageSync
    ) {
      return false;
    }

    try {
      const data =
        this.api.getStorageSync(
          SAVE_KEY
        );

      return !!(
        data &&
        data.gameData
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * 删除存档
   */
  clear() {
    if (!this.api) {
      return false;
    }

    try {
      if (
        this.api.removeStorageSync
      ) {
        this.api.removeStorageSync(
          SAVE_KEY
        );

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
   * 新开游戏
   */
  newGame() {
    this.clear();

    gameState.reset();

    this.save();

    console.log(
      '新游戏创建成功'
    );
  }

  /**
   * 自动保存
   */
  autoSave() {
    return this.save();
  }
}

const saveSystem =
  new SaveSystem();

module.exports =
  saveSystem;
