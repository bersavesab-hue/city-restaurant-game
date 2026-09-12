'use strict';

/**
 * 安卓试玩版运行环境适配层
 *
 * 作用：
 * 把浏览器 / WebView 能力模拟成
 * 微信、抖音小游戏所使用的 api。
 *
 * 正式小游戏代码仍然使用原来的 src/*
 */

const canvas =
  document.getElementById('gameCanvas');

if (!canvas) {
  throw new Error('找不到 gameCanvas');
}

const ctx =
  canvas.getContext('2d');

if (!ctx) {
  throw new Error('无法创建 Canvas 2D 环境');
}

/**
 * 安卓试玩 API
 */
const androidApi = {
  /**
   * 与小游戏 createCanvas 对齐
   */
  createCanvas() {
    return canvas;
  },

  /**
   * 获取屏幕信息
   */
  getSystemInfoSync() {
    const ratio =
      window.devicePixelRatio || 1;

    return {
      windowWidth:
        window.innerWidth,

      windowHeight:
        window.innerHeight,

      screenWidth:
        window.screen.width,

      screenHeight:
        window.screen.height,

      pixelRatio:
        ratio,

      platform:
        'android'
    };
  },

  /**
   * 监听点击 / 触摸结束
   */
  onTouchEnd(callback) {
    canvas.addEventListener(
      'touchend',
      function (event) {
        if (!event.changedTouches) {
          return;
        }

        callback({
          changedTouches:
            event.changedTouches
        });
      },
      {
        passive: false
      }
    );

    /**
     * 同时支持鼠标，
     * 以后电脑调试也能直接点。
     */
    canvas.addEventListener(
      'click',
      function (event) {
        callback({
          changedTouches: [
            {
              clientX:
                event.clientX,

              clientY:
                event.clientY
            }
          ]
        });
      }
    );
  },

  /**
   * 简单提示
   */
  showToast(options) {
    const title =
      options &&
      options.title
        ? options.title
        : '';

    showAndroidToast(title);
  },

  /**
   * 本地存档
   */
  setStorageSync(
    key,
    value
  ) {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  },

  getStorageSync(key) {
    const value =
      localStorage.getItem(key);

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  },

  removeStorageSync(key) {
    localStorage.removeItem(key);
  },

  clearStorageSync() {
    localStorage.clear();
  }
};

/**
 * 安卓版轻提示
 */
function showAndroidToast(
  text
) {
  let toast =
    document.getElementById(
      'androidToast'
    );

  if (!toast) {
    toast =
      document.createElement(
        'div'
      );

    toast.id =
      'androidToast';

    toast.style.position =
      'fixed';

    toast.style.left =
      '50%';

    toast.style.bottom =
      '110px';

    toast.style.transform =
      'translateX(-50%)';

    toast.style.padding =
      '10px 16px';

    toast.style.borderRadius =
      '10px';

    toast.style.background =
      'rgba(50, 35, 28, 0.90)';

    toast.style.color =
      '#FFFFFF';

    toast.style.fontSize =
      '14px';

    toast.style.fontFamily =
      'sans-serif';

    toast.style.zIndex =
      '9998';

    toast.style.pointerEvents =
      'none';

    toast.style.opacity =
      '0';

    toast.style.transition =
      'opacity 0.15s';

    document.body.appendChild(
      toast
    );
  }

  toast.textContent =
    text;

  toast.style.opacity =
    '1';

  clearTimeout(
    toast._hideTimer
  );

  toast._hideTimer =
    setTimeout(
      function () {
        toast.style.opacity =
          '0';
      },
      1800
    );
}

/**
 * 建立统一运行环境
 */
globalThis.GameRuntime = {
  platform:
    'android',

  api:
    androidApi,

  canvas:
    canvas,

  ctx:
    ctx
};

/**
 * 启动正式游戏主程序
 *
 * 注意：
 * 不经过 game.js，
 * 因为 game.js 专门负责微信/抖音入口。
 */
require('../src/main.js');
