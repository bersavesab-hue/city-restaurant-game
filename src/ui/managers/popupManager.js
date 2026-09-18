'use strict';

const animationManager =
  require('./animationManager.js');

/**
 * 通用弹窗管理器
 *
 * 负责：
 * - 底部抽屉
 * - 普通弹窗
 * - 详情卡
 * - 遮罩
 * - 打开 / 关闭动画
 *
 * 不负责具体弹窗长什么样。
 * 具体内容由各页面自己绘制。
 */

class PopupManager {
  constructor() {
    this.active =
      null;

    this.progress =
      0;

    this.state =
      'closed';
  }

  /**
   * 打开弹窗
   *
   * popupManager.open({
   *   id: 'districtDetail',
   *   type: 'bottomSheet',
   *   data: {
   *     districtId: 'university'
   *   }
   * });
   */
  open(options) {
    const config =
      options || {};

    if (!config.id) {
      console.warn(
        'PopupManager：缺少弹窗 id'
      );

      return false;
    }

    /**
     * 已经打开相同弹窗
     * 只更新数据
     */
    if (
      this.active &&
      this.active.id ===
        config.id &&
      this.state !==
        'closing'
    ) {
      this.active.data =
        config.data ||
        this.active.data;

      return true;
    }

    /**
     * 停止旧动画
     */
    animationManager.cancel(
      'popup_transition'
    );

    this.active = {
      id:
        config.id,

      type:
        config.type ||
        'dialog',

      data:
        config.data ||
        {},

      closeOnMask:
        config.closeOnMask !==
        false,

      pauseGame:
        config.pauseGame ===
        true,

      animation:
        config.animation ||
        'slideUp',

      duration:
        Number(
          config.duration
        ) || 260
    };

    this.progress =
      0;

    this.state =
      'opening';

    animationManager.start({
      id:
        'popup_transition',

      group:
        'popup',

      from:
        0,

      to:
        1,

      duration:
        this.active.duration,

      easing:
        'easeOutCubic',

      onUpdate:
        value => {
          this.progress =
            value;
        },

      onComplete:
        () => {
          this.progress =
            1;

          this.state =
            'open';
        }
    });

    return true;
  }

  /**
   * 关闭弹窗
   */
  close() {
    if (
      !this.active ||
      this.state ===
        'closing'
    ) {
      return false;
    }

    const startProgress =
      this.progress;

    this.state =
      'closing';

    animationManager.cancel(
      'popup_transition'
    );

    animationManager.start({
      id:
        'popup_transition',

      group:
        'popup',

      from:
        startProgress,

      to:
        0,

      duration:
        180,

      easing:
        'easeInQuad',

      onUpdate:
        value => {
          this.progress =
            value;
        },

      onComplete:
        () => {
          this.progress =
            0;

          this.state =
            'closed';

          this.active =
            null;
        }
    });

    return true;
  }

  /**
   * 立即关闭
   *
   * 页面切换时可使用。
   */
  closeImmediately() {
    animationManager.cancelGroup(
      'popup'
    );

    this.progress =
      0;

    this.state =
      'closed';

    this.active =
      null;
  }

  /**
   * 是否存在弹窗
   */
  isOpen() {
    return (
      this.active !==
      null
    );
  }

  /**
   * 是否完全展开
   */
  isFullyOpen() {
    return (
      this.state ===
      'open'
    );
  }

  /**
   * 是否正在动画
   */
  isAnimating() {
    return (
      this.state ===
        'opening' ||
      this.state ===
        'closing'
    );
  }

  /**
   * 当前弹窗
   */
  getActive() {
    return this.active;
  }

  /**
   * 当前动画进度
   *
   * 0 = 完全关闭
   * 1 = 完全打开
   */
  getProgress() {
    return this.progress;
  }

  /**
   * 遮罩透明度
   */
  getMaskAlpha(
    maxAlpha
  ) {
    const alpha =
      Number(
        maxAlpha
      );

    const target =
      Number.isFinite(alpha)
        ? alpha
        : 0.38;

    return (
      target *
      this.progress
    );
  }

  /**
   * 底部抽屉Y偏移
   *
   * panelHeight：
   * 弹窗高度
   *
   * 关闭时：
   * 整个弹窗在屏幕下面
   *
   * 打开时：
   * offset = 0
   */
  getSlideOffset(
    panelHeight
  ) {
    const height =
      Math.max(
        0,
        Number(
          panelHeight
        ) || 0
      );

    return (
      height *
      (
        1 -
        this.progress
      )
    );
  }

  /**
   * 缩放动画值
   *
   * 普通居中弹窗可用
   */
  getScale(
    startScale
  ) {
    const start =
      Number.isFinite(
        Number(
          startScale
        )
      )
        ? Number(
            startScale
          )
        : 0.92;

    return (
      start +
      (
        1 -
        start
      ) *
      this.progress
    );
  }

  /**
   * 判断当前弹窗类型
   */
  isType(type) {
    return !!(
      this.active &&
      this.active.type ===
        type
    );
  }

  /**
   * 判断当前弹窗ID
   */
  is(id) {
    return !!(
      this.active &&
      this.active.id ===
        id
    );
  }

  /**
   * 获取弹窗数据
   */
  getData() {
    if (!this.active) {
      return null;
    }

    return (
      this.active.data ||
      null
    );
  }

  /**
   * 修改当前弹窗数据
   */
  setData(data) {
    if (!this.active) {
      return false;
    }

    this.active.data =
      data || {};

    return true;
  }

  /**
   * 更新部分数据
   */
  patchData(data) {
    if (
      !this.active ||
      !data
    ) {
      return false;
    }

    this.active.data =
      Object.assign(
        {},
        this.active.data ||
          {},
        data
      );

    return true;
  }

  /**
   * 点击遮罩区域
   */
  handleMaskTap() {
    if (!this.active) {
      return false;
    }

    if (
      !this.active
        .closeOnMask
    ) {
      return false;
    }

    return this.close();
  }

  /**
   * 游戏是否应因为弹窗暂停
   *
   * 例如：
   * 确认购买
   * 合同签署
   * 重大事件
   *
   * 普通商圈详情卡不一定暂停。
   */
  shouldPauseGame() {
    return !!(
      this.active &&
      this.active.pauseGame
    );
  }

  /**
   * 调试信息
   */
  getDebugState() {
    return {
      state:
        this.state,

      progress:
        this.progress,

      activeId:
        this.active
          ? this.active.id
          : null,

      activeType:
        this.active
          ? this.active.type
          : null
    };
  }
}

const popupManager =
  new PopupManager();

module.exports =
  popupManager;
