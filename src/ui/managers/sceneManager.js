'use strict';

/**
 * 页面 / 场景管理器
 *
 * 以后游戏中的：
 * 城市
 * 门店
 * 研发
 * 供应链
 * 经营
 * 商圈
 * 中介
 * 房源
 * 装修
 * 等页面都通过这里切换。
 */

class SceneManager {
  constructor() {
    this.scenes = {};

    this.currentSceneId = null;

    this.currentScene = null;

    this.previousSceneId = null;
  }

  /**
   * 注册页面
   */
  register(id, scene) {
    if (!id || !scene) {
      return false;
    }

    this.scenes[id] = scene;

    return true;
  }

  /**
   * 判断页面是否存在
   */
  has(id) {
    return !!this.scenes[id];
  }

  /**
   * 切换页面
   */
  switchTo(id, payload) {
    const nextScene =
      this.scenes[id];

    if (!nextScene) {
      console.warn(
        '页面不存在：' + id
      );

      return false;
    }

    if (
      this.currentScene &&
      typeof this.currentScene.exit ===
        'function'
    ) {
      this.currentScene.exit();
    }

    this.previousSceneId =
      this.currentSceneId;

    this.currentSceneId =
      id;

    this.currentScene =
      nextScene;

    if (
      typeof nextScene.enter ===
      'function'
    ) {
      nextScene.enter(
        payload || {}
      );
    }

    return true;
  }

  /**
   * 返回上一个页面
   */
  back() {
    if (!this.previousSceneId) {
      return false;
    }

    const target =
      this.previousSceneId;

    return this.switchTo(target);
  }

  /**
   * 当前页面 ID
   */
  getCurrentId() {
    return this.currentSceneId;
  }

  /**
   * 当前页面
   */
  getCurrentScene() {
    return this.currentScene;
  }

  /**
   * 页面绘制
   */
  render(ctx) {
    if (
      !this.currentScene ||
      typeof this.currentScene.render !==
        'function'
    ) {
      return;
    }

    this.currentScene.render(ctx);
  }

  /**
   * 页面更新
   *
   * 后面NPC移动、
   * 动画、
   * 时间流逝、
   * 顾客等都会用。
   */
  update(deltaTime) {
    if (
      !this.currentScene ||
      typeof this.currentScene.update !==
        'function'
    ) {
      return;
    }

    this.currentScene.update(
      deltaTime
    );
  }

  /**
   * 点击事件交给当前页面
   */
  handleTap(x, y) {
    if (
      !this.currentScene ||
      typeof this.currentScene.handleTap !==
        'function'
    ) {
      return false;
    }

    return this.currentScene.handleTap(
      x,
      y
    );
  }

  /**
   * 清空所有页面
   * 主要用于开发测试
   */
  reset() {
    this.scenes = {};

    this.currentSceneId = null;

    this.currentScene = null;

    this.previousSceneId = null;
  }
}

const sceneManager =
  new SceneManager();

module.exports =
  sceneManager;
