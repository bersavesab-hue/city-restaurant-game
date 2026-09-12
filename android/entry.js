'use strict';

/**
 * 安卓试玩版运行环境适配层
 * V2：修复手机一次点击被 touchend + click 连续触发两次的问题。
 */

const canvas = document.getElementById('gameCanvas');
if (!canvas) throw new Error('找不到 gameCanvas');

const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('无法创建 Canvas 2D 环境');

let lastTouchAt = 0;

const androidApi = {
  createCanvas() {
    return canvas;
  },

  getSystemInfoSync() {
    const ratio = window.devicePixelRatio || 1;
    return {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: ratio,
      platform: 'android'
    };
  },

  onTouchEnd(callback) {
    canvas.addEventListener(
      'touchend',
      function (event) {
        lastTouchAt = Date.now();

        // 阻止 WebView 在 touchend 后继续合成一次 click。
        if (event.cancelable) {
          event.preventDefault();
        }

        if (!event.changedTouches) return;

        callback({
          changedTouches: event.changedTouches
        });
      },
      { passive: false }
    );

    // 只保留给电脑鼠标调试；手机刚发生触摸时忽略合成 click。
    canvas.addEventListener(
      'click',
      function (event) {
        if (Date.now() - lastTouchAt < 700) {
          return;
        }

        callback({
          changedTouches: [
            {
              clientX: event.clientX,
              clientY: event.clientY
            }
          ]
        });
      }
    );
  },

  showToast(options) {
    const title = options && options.title ? options.title : '';
    showAndroidToast(title);
  },

  setStorageSync(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  getStorageSync(key) {
    const value = localStorage.getItem(key);
    if (value === null) return null;

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

function showAndroidToast(text) {
  let toast = document.getElementById('androidToast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'androidToast';

    toast.style.position = 'fixed';
    toast.style.left = '50%';
    toast.style.bottom = '110px';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '10px 16px';
    toast.style.borderRadius = '10px';
    toast.style.background = 'rgba(20, 39, 52, 0.92)';
    toast.style.color = '#FFFFFF';
    toast.style.fontSize = '14px';
    toast.style.fontFamily = 'sans-serif';
    toast.style.zIndex = '9998';
    toast.style.pointerEvents = 'none';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.12s';

    document.body.appendChild(toast);
  }

  toast.textContent = text;
  toast.style.opacity = '1';

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(function () {
    toast.style.opacity = '0';
  }, 1400);
}

globalThis.GameRuntime = {
  platform: 'android',
  api: androidApi,
  canvas,
  ctx
};

require('../src/main.js');
