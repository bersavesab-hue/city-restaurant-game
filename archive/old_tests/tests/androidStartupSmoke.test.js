'use strict';

const assert =
  require('assert');

function noop() {}

function makeGradient() {
  return {
    addColorStop:noop
  };
}

const ctxTarget = {
  canvas:null,
  setTransform:noop,
  clearRect:noop,
  fillRect:noop,
  strokeRect:noop,
  beginPath:noop,
  closePath:noop,
  moveTo:noop,
  lineTo:noop,
  arcTo:noop,
  arc:noop,
  fill:noop,
  stroke:noop,
  save:noop,
  restore:noop,
  clip:noop,
  translate:noop,
  rotate:noop,
  scale:noop,
  drawImage:noop,
  fillText:noop,
  strokeText:noop,
  measureText:value => ({
    width:String(
      value == null
        ? ''
        : value
    ).length * 6
  }),
  createLinearGradient:
    makeGradient,
  createRadialGradient:
    makeGradient,
  roundRect:noop,
  globalAlpha:1
};

const ctx =
  new Proxy(
    ctxTarget,
    {
      get(target,key) {
        if (key in target) {
          return target[key];
        }

        return noop;
      },

      set(target,key,value) {
        target[key] =
          value;

        return true;
      }
    }
  );

function makeElement(tag) {
  return {
    tagName:
      String(
        tag ||
        'div'
      ).toUpperCase(),
    style:{},
    children:[],
    parentNode:null,
    width:390,
    height:844,
    value:'',
    textContent:'',
    id:'',
    type:'',

    appendChild(child) {
      this.children.push(
        child
      );

      child.parentNode =
        this;

      return child;
    },

    removeChild(child) {
      this.children =
        this.children.filter(
          item =>
            item !== child
        );

      child.parentNode =
        null;
    },

    addEventListener:noop,
    removeEventListener:noop,
    setAttribute:noop,
    focus:noop,
    setSelectionRange:noop,
    click:noop,

    getContext() {
      return ctx;
    },

    getBoundingClientRect() {
      return {
        left:0,
        top:0,
        width:390,
        height:844
      };
    }
  };
}

const canvas =
  makeElement(
    'canvas'
  );

canvas.id =
  'gameCanvas';

ctx.canvas =
  canvas;

const errorBox =
  makeElement(
    'div'
  );

errorBox.id =
  'errorBox';

const body =
  makeElement(
    'body'
  );

const elementMap =
  new Map([
    [
      'gameCanvas',
      canvas
    ],
    [
      'errorBox',
      errorBox
    ]
  ]);

globalThis.document = {
  hidden:false,
  body,

  getElementById(id) {
    return (
      elementMap.get(id) ||
      null
    );
  },

  createElement(tag) {
    return makeElement(
      tag
    );
  },

  addEventListener:noop
};

globalThis.window = {
  innerWidth:390,
  innerHeight:844,
  devicePixelRatio:2,
  screen:{
    width:390,
    height:844
  },
  document:
    globalThis.document,
  addEventListener:noop,
  removeEventListener:noop,
  setTimeout:() => 0,
  clearTimeout:noop,
  setInterval:() => 0,
  clearInterval:noop,
  requestAnimationFrame:() => 0,
  cancelAnimationFrame:noop
};

globalThis.screen =
  globalThis.window.screen;

globalThis.requestAnimationFrame =
  globalThis.window
    .requestAnimationFrame;

globalThis.cancelAnimationFrame =
  globalThis.window
    .cancelAnimationFrame;

const storage =
  new Map();

globalThis.localStorage = {
  getItem:key =>
    storage.has(key)
      ? storage.get(key)
      : null,

  setItem(key,value) {
    storage.set(
      key,
      String(value)
    );
  },

  removeItem:key =>
    storage.delete(key),

  clear:() =>
    storage.clear(),

  key:index =>
    Array.from(
      storage.keys()
    )[index] ||
    null,

  get length() {
    return storage.size;
  }
};

class MockImage {
  constructor() {
    this.width =
      100;

    this.height =
      100;

    this.onload =
      null;

    this.onerror =
      null;

    this.complete =
      true;
  }

  set src(value) {
    this._src =
      value;

    if (
      typeof this.onload ===
        'function'
    ) {
      this.onload();
    }
  }

  get src() {
    return this._src;
  }
}

globalThis.Image =
  MockImage;

const originalSetTimeout =
  globalThis.setTimeout;

const originalClearTimeout =
  globalThis.clearTimeout;

globalThis.setTimeout =
  () => 0;

globalThis.clearTimeout =
  noop;

try {
  require(
    '../android/entry.js'
  );

  assert.ok(
    globalThis.GameRuntime,
    'Android 入口必须创建 GameRuntime'
  );

  assert.equal(
    typeof globalThis
      .GameRuntime
      .requestRender,
    'function',
    '完整 main.js 启动后必须注册 requestRender'
  );

  console.log(
    'ANDROID STARTUP SMOKE PASS'
  );
} finally {
  globalThis.setTimeout =
    originalSetTimeout;

  globalThis.clearTimeout =
    originalClearTimeout;
}
