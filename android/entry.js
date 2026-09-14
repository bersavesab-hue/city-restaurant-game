'use strict';

/**
 * 安卓试玩版运行环境适配层
 * V3：保留 touchend 防双击，同时加入真正可编辑的 DOM Modal。
 * 这样“改名 / 包厢改名 / 保存装修模板 / 另存模板 / 确认弹窗”不再是假按钮。
 */

const canvas = document.getElementById('gameCanvas');
if (!canvas) throw new Error('找不到 gameCanvas');

const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('无法创建 Canvas 2D 环境');

let lastTouchAt = 0;
let activeModal = null;

function removeActiveModal() {
  if (activeModal && activeModal.parentNode) {
    activeModal.parentNode.removeChild(activeModal);
  }

  activeModal = null;
}

function createModal(options) {
  const opts = options || {};

  removeActiveModal();

  const overlay = document.createElement('div');
  activeModal = overlay;

  overlay.style.position = 'fixed';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.zIndex = '10000';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.padding = '18px';
  overlay.style.background = 'rgba(4, 24, 36, 0.55)';
  overlay.style.backdropFilter = 'blur(2px)';

  const panel = document.createElement('div');
  panel.style.width = 'min(92vw, 420px)';
  panel.style.borderRadius = '18px';
  panel.style.padding = '18px';
  panel.style.background = '#FFFDF8';
  panel.style.boxShadow = '0 14px 45px rgba(0,0,0,0.30)';
  panel.style.border = '1px solid rgba(14,52,72,0.16)';
  panel.style.fontFamily = 'sans-serif';
  panel.style.color = '#16364B';

  const title = document.createElement('div');
  title.textContent = opts.title || '提示';
  title.style.fontSize = '18px';
  title.style.fontWeight = '800';
  title.style.marginBottom = '10px';
  panel.appendChild(title);

  if (opts.content && !opts.editable) {
    const content = document.createElement('div');
    content.textContent = String(opts.content);
    content.style.fontSize = '14px';
    content.style.lineHeight = '1.55';
    content.style.color = '#61747D';
    content.style.whiteSpace = 'pre-wrap';
    content.style.marginBottom = '16px';
    panel.appendChild(content);
  }

  let input = null;

  if (opts.editable) {
    input = document.createElement('input');
    input.type = 'text';
    input.value = opts.content || opts.value || '';
    input.placeholder = opts.placeholderText || '请输入内容';
    input.maxLength = Number(opts.maxLength) || 24;
    input.autocomplete = 'off';
    input.style.display = 'block';
    input.style.width = '100%';
    input.style.height = '46px';
    input.style.padding = '0 12px';
    input.style.borderRadius = '12px';
    input.style.border = '1px solid #CFC5B7';
    input.style.background = '#FFF9EF';
    input.style.color = '#17374C';
    input.style.fontSize = '16px';
    input.style.outline = 'none';
    input.style.boxSizing = 'border-box';
    input.style.marginBottom = '16px';
    panel.appendChild(input);
  }

  const buttons = document.createElement('div');
  buttons.style.display = 'flex';
  buttons.style.gap = '10px';
  buttons.style.justifyContent = 'flex-end';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = opts.cancelText || '取消';
  cancel.style.flex = '1';
  cancel.style.height = '42px';
  cancel.style.border = '1px solid #D3C9BB';
  cancel.style.borderRadius = '12px';
  cancel.style.background = '#F3EEE5';
  cancel.style.color = '#3B5361';
  cancel.style.fontSize = '15px';
  cancel.style.fontWeight = '700';

  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.textContent = opts.confirmText || '确定';
  confirm.style.flex = '1';
  confirm.style.height = '42px';
  confirm.style.border = '1px solid #D9A12C';
  confirm.style.borderRadius = '12px';
  confirm.style.background = '#F5B72F';
  confirm.style.color = '#1C3442';
  confirm.style.fontSize = '15px';
  confirm.style.fontWeight = '800';

  function finish(result) {
    removeActiveModal();

    if (typeof opts.success === 'function') {
      opts.success(result);
    }
  }

  cancel.addEventListener('click', function () {
    finish({
      confirm: false,
      cancel: true
    });
  });

  confirm.addEventListener('click', function () {
    const value = input ? input.value : '';

    finish({
      confirm: true,
      cancel: false,
      content: value,
      inputValue: value,
      value
    });
  });

  buttons.appendChild(cancel);
  buttons.appendChild(confirm);
  panel.appendChild(buttons);
  overlay.appendChild(panel);

  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) {
      finish({
        confirm: false,
        cancel: true
      });
    }
  });

  document.body.appendChild(overlay);

  if (input) {
    window.setTimeout(function () {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }, 60);

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        confirm.click();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancel.click();
      }
    });
  }
}

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

  onHide(callback) {
    if (
      typeof callback !==
      'function'
    ) {
      return;
    }

    window.addEventListener(
      'pagehide',
      callback
    );

    document.addEventListener(
      'visibilitychange',
      function () {
        if (
          document.hidden
        ) {
          callback();
        }
      }
    );
  },

  onTouchEnd(callback) {
    canvas.addEventListener(
      'touchend',
      function (event) {
        lastTouchAt = Date.now();

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

  showModal(options) {
    try {
      createModal(options || {});
    } catch (error) {
      if (options && typeof options.fail === 'function') {
        options.fail(error);
      }
    }
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
