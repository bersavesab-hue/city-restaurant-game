'use strict';

/**
 * 城市餐饮经营小游戏
 * 正式小游戏启动入口
 * 不使用 HTML，不依赖 Cocos
 */

const api =
  typeof tt !== 'undefined'
    ? tt
    : typeof wx !== 'undefined'
      ? wx
      : null;

const platform =
  typeof tt !== 'undefined'
    ? 'douyin'
    : typeof wx !== 'undefined'
      ? 'wechat'
      : 'unknown';

if (!api) {
  throw new Error('当前环境不是微信小游戏或抖音小游戏运行环境');
}

const canvas = api.createCanvas();
const ctx = canvas.getContext('2d');

globalThis.GameRuntime = {
  platform,
  api,
  canvas,
  ctx
};

// 正式进入游戏主程序
require('./src/main.js');
