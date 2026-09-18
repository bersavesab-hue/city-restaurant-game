'use strict';

/**
 * 通用动画管理器
 *
 * 用途：
 * - 弹窗滑入 / 滑出
 * - 淡入淡出
 * - 商圈定位点放大
 * - 数字滚动
 * - 按钮按压
 * - 提示条出现
 * - 地图UI过渡
 *
 * 所有动画统一由游戏主循环 update(deltaMs) 驱动。
 */

const EASING = {
  linear(t) {
    return t;
  },

  easeInQuad(t) {
    return t * t;
  },

  easeOutQuad(t) {
    return (
      1 -
      (1 - t) *
      (1 - t)
    );
  },

  easeInOutQuad(t) {
    return (
      t < 0.5
        ? 2 * t * t
        : 1 -
          Math.pow(
            -2 * t + 2,
            2
          ) / 2
    );
  },

  easeOutCubic(t) {
    return (
      1 -
      Math.pow(
        1 - t,
        3
      )
    );
  },

  easeInOutCubic(t) {
    return (
      t < 0.5
        ? 4 * t * t * t
        : 1 -
          Math.pow(
            -2 * t + 2,
            3
          ) / 2
    );
  },

  /**
   * 轻微回弹
   * 很适合弹窗、按钮和定位点
   */
  easeOutBack(t) {
    const c1 =
      1.70158;

    const c3 =
      c1 + 1;

    return (
      1 +
      c3 *
        Math.pow(
          t - 1,
          3
        ) +
      c1 *
        Math.pow(
          t - 1,
          2
        )
    );
  }
};

class AnimationManager {
  constructor() {
    /**
     * id -> animation
     */
    this.animations =
      new Map();

    this.autoId =
      0;
  }

  /**
   * 创建动画
   *
   * animationManager.start({
   *   id: 'districtPopup',
   *   from: 0,
   *   to: 1,
   *   duration: 260,
   *   easing: 'easeOutCubic',
   *
   *   onUpdate(value, progress) {
   *   },
   *
   *   onComplete() {
   *   }
   * });
   */
  start(options) {
    const config =
      options || {};

    const id =
      config.id ||
      (
        'animation_' +
        (++this.autoId)
      );

    const from =
      Number(
        config.from
      );

    const to =
      Number(
        config.to
      );

    const duration =
      Math.max(
        1,
        Number(
          config.duration
        ) || 250
      );

    const easingName =
      config.easing ||
      'easeOutCubic';

    const easing =
      typeof config.easing ===
      'function'
        ? config.easing
        : (
            EASING[
              easingName
            ] ||
            EASING.linear
          );

    const animation = {
      id,

      group:
        config.group ||
        null,

      from:
        Number.isFinite(from)
          ? from
          : 0,

      to:
        Number.isFinite(to)
          ? to
          : 1,

      duration,

      elapsed:
        0,

      easing,

      onUpdate:
        typeof
          config.onUpdate ===
        'function'
          ? config.onUpdate
          : null,

      onComplete:
        typeof
          config.onComplete ===
        'function'
          ? config.onComplete
          : null,

      onCancel:
        typeof
          config.onCancel ===
        'function'
          ? config.onCancel
          : null
    };

    /**
     * 同ID动画自动覆盖。
     * 例如用户连续快速点击弹窗，
     * 不会同时跑两个相同动画。
     */
    if (
      this.animations.has(
        id
      )
    ) {
      this.cancel(id);
    }

    this.animations.set(
      id,
      animation
    );

    if (
      animation.onUpdate
    ) {
      animation.onUpdate(
        animation.from,
        0
      );
    }

    return id;
  }

  /**
   * 每帧更新
   */
  update(deltaMs) {
    if (
      this.animations.size ===
      0
    ) {
      return false;
    }

    let delta =
      Number(deltaMs);

    if (
      !Number.isFinite(delta) ||
      delta <= 0
    ) {
      return false;
    }

    /**
     * 防止APP切后台后，
     * 回来动画瞬间跳飞。
     */
    delta =
      Math.min(
        delta,
        100
      );

    const finished =
      [];

    this.animations.forEach(
      function (
        animation,
        id
      ) {
        animation.elapsed +=
          delta;

        const rawProgress =
          Math.min(
            1,
            animation.elapsed /
              animation.duration
          );

        const easedProgress =
          animation.easing(
            rawProgress
          );

        const value =
          animation.from +
          (
            animation.to -
            animation.from
          ) *
          easedProgress;

        if (
          animation.onUpdate
        ) {
          animation.onUpdate(
            value,
            rawProgress
          );
        }

        if (
          rawProgress >= 1
        ) {
          finished.push(
            id
          );
        }
      }
    );

    for (
      let i = 0;
      i < finished.length;
      i++
    ) {
      const id =
        finished[i];

      const animation =
        this.animations.get(
          id
        );

      if (!animation) {
        continue;
      }

      this.animations.delete(
        id
      );

      if (
        animation.onComplete
      ) {
        animation.onComplete();
      }
    }

    return true;
  }

  /**
   * 取消单个动画
   */
  cancel(id) {
    const animation =
      this.animations.get(
        id
      );

    if (!animation) {
      return false;
    }

    this.animations.delete(
      id
    );

    if (
      animation.onCancel
    ) {
      animation.onCancel();
    }

    return true;
  }

  /**
   * 取消同组动画
   *
   * 比如：
   * popup
   * map
   * button
   */
  cancelGroup(group) {
    const ids =
      [];

    this.animations.forEach(
      function (
        animation,
        id
      ) {
        if (
          animation.group ===
          group
        ) {
          ids.push(id);
        }
      }
    );

    for (
      let i = 0;
      i < ids.length;
      i++
    ) {
      this.cancel(
        ids[i]
      );
    }

    return ids.length;
  }

  /**
   * 是否正在播放
   */
  isRunning(id) {
    return (
      this.animations.has(
        id
      )
    );
  }

  /**
   * 当前动画数量
   */
  getCount() {
    return (
      this.animations.size
    );
  }

  /**
   * 清空全部动画
   */
  clear() {
    const ids =
      Array.from(
        this.animations.keys()
      );

    for (
      let i = 0;
      i < ids.length;
      i++
    ) {
      this.cancel(
        ids[i]
      );
    }
  }

  /**
   * 常用：淡入
   */
  fadeIn(
    id,
    duration,
    onUpdate,
    onComplete
  ) {
    return this.start({
      id,

      group:
        'fade',

      from:
        0,

      to:
        1,

      duration:
        duration || 220,

      easing:
        'easeOutCubic',

      onUpdate,

      onComplete
    });
  }

  /**
   * 常用：淡出
   */
  fadeOut(
    id,
    duration,
    onUpdate,
    onComplete
  ) {
    return this.start({
      id,

      group:
        'fade',

      from:
        1,

      to:
        0,

      duration:
        duration || 180,

      easing:
        'easeInQuad',

      onUpdate,

      onComplete
    });
  }
}

const animationManager =
  new AnimationManager();

module.exports =
  animationManager;
