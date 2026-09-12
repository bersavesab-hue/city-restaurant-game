'use strict';

const runtime = globalThis.GameRuntime;
if (!runtime) throw new Error('GameRuntime 未初始化');

const api = runtime.api || {};
const canvas = runtime.canvas;
const ctx = runtime.ctx;

const gameState = require('./core/gameState.js');
const timeSystem = require('./core/timeSystem.js');
const sceneManager = require('./core/sceneManager.js');
const animationManager = require('./core/animationManager.js');
const resourceManager = require('./core/resourceManager.js');
const citySystem = require('./city/citySystem.js');
const demandSystem = require('./city/demandSystem.js');

const shopScene = require('./scenes/shopScene.js');
const researchScene = require('./scenes/researchScene.js');
const supplyScene = require('./scenes/supplyScene.js');
const businessScene = require('./scenes/businessScene.js');

const DESIGN_W = 390;
const DESIGN_H = 844;
const TOP_H = 100;
const MAP_X = 0;
const MAP_Y = 100;
const MAP_W = 390;
const MAP_H = 674;
const NAV_Y = 774;
const NAV_H = 70;

const COLORS = {
  navy: '#0F344D',
  navy2: '#0A2638',
  white: '#FFFDF8',
  cream: '#F7F0E4',
  text: '#1D2B33',
  muted: '#667780',
  gold: '#F2B846',
  orange: '#E99B2F',
  blue: '#439CC9',
  danger: '#DA4C3E',
  green: '#34A66A',
  line: 'rgba(255,255,255,0.26)'
};

const ATLAS = {
  hud: [0, 0, 1024, 220],
  goal: [0, 240, 600, 150],
  side: [620, 240, 160, 150],
  card: [0, 410, 1024, 240],
  nav: [0, 670, 1024, 180],
  navActive: [0, 870, 160, 150],
  pinBlue: [660, 240, 80, 130],
  pinGold: [750, 240, 80, 130],
  pinRed: [840, 240, 80, 130]
};

const WEATHER_NAMES = {
  sunny: '晴',
  cloudy: '多云',
  rain: '小雨',
  heavyRain: '暴雨',
  hot: '炎热',
  cold: '寒冷'
};

const MEAL_NAMES = {
  breakfast: '早餐',
  lunch: '午餐',
  afternoon: '下午',
  dinner: '晚餐',
  night: '夜宵'
};

/*
 * 地图上的功能分区重新按实际地形摆放：
 * - 大学城：体育场 / 校园建筑群
 * - 商业中心：中央高楼群
 * - 高新区：右上现代办公 / 居住新区
 * - 老城区：左中低层密集街区
 * - 城中村：老城区与中心区之间的低层密集区
 * - 东门市场：左下城区道路与居民区交界
 * - 工业园：右中下烟囱、厂房区
 */
const DISTRICT_LAYOUT = {
  university: {
    x: 90, y: 260,
    poly: [[28,205],[146,190],[174,302],[68,334]]
  },
  cbd: {
    x: 198, y: 348,
    poly: [[142,288],[258,286],[270,410],[150,424]]
  },
  hightech: {
    x: 318, y: 264,
    poly: [[276,200],[388,196],[388,338],[286,348]]
  },
  oldtown: {
    x: 67, y: 442,
    poly: [[4,355],[128,350],[143,486],[18,510]]
  },
  village: {
    x: 164, y: 470,
    poly: [[122,410],[220,406],[232,516],[135,532]]
  },
  market: {
    x: 112, y: 548,
    poly: [[46,500],[165,506],[170,605],[58,614]]
  },
  industry: {
    x: 337, y: 452,
    poly: [[286,370],[390,360],[390,525],[307,535]]
  }
};

const NAV_ITEMS = [
  { id: 'city', name: '城市', icon: '城' },
  { id: 'shop', name: '门店', icon: '店' },
  { id: 'research', name: '菜品', icon: '研' },
  { id: 'supply', name: '供应链', icon: '供' },
  { id: 'business', name: '数据', icon: '数' },
  { id: 'system', name: '系统', icon: '设' }
];

const LEFT_TOOLS = [
  { id: 'overview', label: '概览', icon: '览' },
  { id: 'dynamic', label: '动态', icon: '势' },
  { id: 'event', label: '事件', icon: '事' }
];

const RIGHT_TOOLS = [
  { id: 'land', label: '地块', icon: '地' },
  { id: 'population', label: '人口', icon: '人' },
  { id: 'rank', label: '排行', icon: '榜' }
];

let scale = 1;
let offsetX = 0;
let offsetY = 0;
let pixelRatio = 1;
let lastFrameTime = null;
let needsResize = true;
let mapCache = null;
let selectedDistrictId = null;

const buttons = [];
const districtFx = {
  id: null,
  scale: 1,
  flash: 0
};

function getSystemInfo() {
  if (api && typeof api.getSystemInfoSync === 'function') {
    return api.getSystemInfoSync();
  }
  return {
    windowWidth: DESIGN_W,
    windowHeight: DESIGN_H,
    pixelRatio: 1
  };
}

function resizeCanvas() {
  const info = getSystemInfo();
  const screenW = info.windowWidth || DESIGN_W;
  const screenH = info.windowHeight || DESIGN_H;
  pixelRatio = info.pixelRatio || 1;

  const targetW = Math.floor(screenW * pixelRatio);
  const targetH = Math.floor(screenH * pixelRatio);

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  scale = Math.min(screenW / DESIGN_W, screenH / DESIGN_H);
  offsetX = (screenW - DESIGN_W * scale) / 2;
  offsetY = (screenH - DESIGN_H * scale) / 2;

  ctx.setTransform(
    pixelRatio * scale, 0, 0, pixelRatio * scale,
    offsetX * pixelRatio, offsetY * pixelRatio
  );

  needsResize = false;
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('resize', function () {
    needsResize = true;
  });
}

function roundedPath(target, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  target.beginPath();
  target.moveTo(x + radius, y);
  target.arcTo(x + w, y, x + w, y + h, radius);
  target.arcTo(x + w, y + h, x, y + h, radius);
  target.arcTo(x, y + h, x, y, radius);
  target.arcTo(x, y, x + w, y, radius);
  target.closePath();
}

function roundedRect(x, y, w, h, r, fill, stroke, lineWidth) {
  roundedPath(ctx, x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lineWidth || 1;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawText(text, x, y, size, color, weight, align) {
  ctx.fillStyle = color || COLORS.text;
  ctx.font = (weight || '500') + ' ' + size + 'px sans-serif';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text), x, y);
}

function addButton(id, x, y, w, h) {
  buttons.push({ id, x, y, w, h });
}

function showToast(text) {
  if (api && typeof api.showToast === 'function') {
    api.showToast({ title: text, icon: 'none' });
  }
}

function getAtlas() {
  return resourceManager.getImage('ui_atlas_01');
}

function drawAtlas(name, dx, dy, dw, dh) {
  const atlas = getAtlas();
  const r = ATLAS[name];
  if (!atlas || !r) return false;
  ctx.drawImage(atlas, r[0], r[1], r[2], r[3], dx, dy, dw, dh);
  return true;
}

function drawImageFocus(target, image, dx, dy, dw, dh, zoom, focusX, focusY) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  if (!iw || !ih) return;

  const boxRatio = dw / dh;
  const imageRatio = iw / ih;
  let sw, sh;

  if (imageRatio > boxRatio) {
    sh = ih;
    sw = sh * boxRatio;
  } else {
    sw = iw;
    sh = sw / boxRatio;
  }

  const z = Math.max(1, zoom || 1);
  sw /= z;
  sh /= z;

  const maxX = Math.max(0, iw - sw);
  const maxY = Math.max(0, ih - sh);
  const sx = maxX * Math.max(0, Math.min(1, focusX == null ? 0.5 : focusX));
  const sy = maxY * Math.max(0, Math.min(1, focusY == null ? 0.5 : focusY));

  target.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
}

function createOffscreenCanvas(width, height) {
  if (typeof document !== 'undefined' && document.createElement) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  }

  if (runtime.platform !== 'android' && api && typeof api.createCanvas === 'function') {
    try {
      const c = api.createCanvas();
      if (c && c !== canvas) {
        c.width = width;
        c.height = height;
        return c;
      }
    } catch (error) {
      return null;
    }
  }

  return null;
}

function buildMapCache() {
  const image = resourceManager.getImage('city_base_01');
  if (!image) return false;

  const cacheScale = 2;
  const c = createOffscreenCanvas(MAP_W * cacheScale, MAP_H * cacheScale);
  if (!c || typeof c.getContext !== 'function') {
    mapCache = null;
    return false;
  }

  const cctx = c.getContext('2d');
  if (!cctx) return false;

  cctx.setTransform(cacheScale, 0, 0, cacheScale, 0, 0);
  drawImageFocus(cctx, image, 0, 0, MAP_W, MAP_H, 1.12, 0.54, 0.15);

  const grad = cctx.createLinearGradient(0, 0, 0, MAP_H);
  grad.addColorStop(0, 'rgba(7,25,37,0.03)');
  grad.addColorStop(0.65, 'rgba(7,25,37,0.02)');
  grad.addColorStop(1, 'rgba(7,25,37,0.12)');
  cctx.fillStyle = grad;
  cctx.fillRect(0, 0, MAP_W, MAP_H);

  mapCache = c;
  return true;
}

function drawTopHud() {
  if (!drawAtlas('hud', 0, 0, DESIGN_W, TOP_H)) {
    const g = ctx.createLinearGradient(0,0,0,TOP_H);
    g.addColorStop(0, '#163F59');
    g.addColorStop(1, '#0A293D');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,DESIGN_W,TOP_H);
  }

  const player = gameState.getPlayer();
  const world = gameState.getWorld();
  const display = timeSystem.getDisplayState();

  let cityName = gameState.getCityName();
  if (cityName === '未命名城市') cityName = '城市名称';

  drawText(cityName, 14, 20, 17, COLORS.white, '700');
  drawText('一座有味道的城市', 14, 43, 9, 'rgba(255,255,255,0.72)', '500');

  drawText(display.date, 162, 14, 9, '#E9F0F4', '600');
  drawText(display.time, 162, 37, 19, COLORS.white, '700');

  const weather = WEATHER_NAMES[world.weather] || world.weather;
  drawText(weather + ' ' + world.temperature + '℃', 162, 60, 10, '#E9F0F4', '600');

  drawText('¥ ' + player.cash.toLocaleString(), 374, 21, 18, '#FFF1C2', '700', 'right');
  drawText('品牌等级  Lv.1', 374, 47, 10, '#F4F1E8', '600', 'right');

  roundedRect(293, 60, 78, 8, 4, 'rgba(255,255,255,0.16)');
  roundedRect(293, 60, Math.max(8, Math.min(78, player.reputation / 100 * 78)), 8, 4, COLORS.gold);

  const paused = timeSystem.isPaused();
  const speed = timeSystem.getSpeed();
  const items = [
    ['time:pause', paused ? '▶' : 'Ⅱ', 203],
    ['time:speed:1', '1×', 237],
    ['time:speed:2', '2×', 271],
    ['time:speed:5', '5×', 305],
    ['time:speed:10', '10×', 339]
  ];

  for (let i = 0; i < items.length; i++) {
    const id = items[i][0];
    const label = items[i][1];
    const x = items[i][2];
    const active = id === 'time:pause'
      ? paused
      : (!paused && Number(id.split(':')[2]) === speed);

    roundedRect(
      x, 74, 31, 20, 6,
      active ? 'rgba(240,173,52,0.95)' : 'rgba(255,255,255,0.10)',
      active ? '#FFD886' : 'rgba(255,255,255,0.18)'
    );
    drawText(label, x + 15.5, 84, 8, COLORS.white, '700', 'center');
    addButton(id, x, 72, 31, 24);
  }

  drawText(MEAL_NAMES[display.mealPeriod] || '', 193, 84, 8, '#DCEAF1', '600', 'right');
}

function drawMapBase() {
  ctx.save();
  roundedPath(ctx, MAP_X, MAP_Y, MAP_W, MAP_H, 0);
  ctx.clip();

  if (mapCache) {
    ctx.drawImage(mapCache, MAP_X, MAP_Y, MAP_W, MAP_H);
  } else {
    const image = resourceManager.getImage('city_base_01');
    if (image) {
      drawImageFocus(ctx, image, MAP_X, MAP_Y, MAP_W, MAP_H, 1.12, 0.54, 0.15);
    } else {
      ctx.fillStyle = '#B9C8C0';
      ctx.fillRect(MAP_X, MAP_Y, MAP_W, MAP_H);
      drawText('城市地图加载中…', DESIGN_W/2, MAP_Y + MAP_H/2, 12, COLORS.white, '700', 'center');
    }
  }

  ctx.restore();
}

function getDistricts() {
  const world = gameState.getWorld();
  return citySystem.getDistrictsByCity(world.currentCityId);
}

function districtColor(district) {
  if (district.saturation >= 90) return COLORS.danger;
  if (district.saturation >= 80) return COLORS.orange;
  if (district.saturation >= 65) return COLORS.gold;
  return COLORS.blue;
}

function hexToRgba(hex, alpha) {
  const value = hex.replace('#','');
  const r = parseInt(value.slice(0,2),16);
  const g = parseInt(value.slice(2,4),16);
  const b = parseInt(value.slice(4,6),16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function drawRegion(district) {
  const layout = DISTRICT_LAYOUT[district.id];
  if (!layout) return;

  const selected = selectedDistrictId === district.id;
  const color = districtColor(district);
  const poly = layout.poly;

  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) {
    ctx.lineTo(poly[i][0], poly[i][1]);
  }
  ctx.closePath();

  ctx.fillStyle = selected
    ? hexToRgba(color, 0.18 + districtFx.flash * 0.06)
    : 'rgba(255,255,255,0.025)';
  ctx.fill();

  ctx.strokeStyle = selected
    ? hexToRgba(color, 0.92)
    : 'rgba(255,255,255,0.22)';
  ctx.lineWidth = selected ? 2 : 0.8;
  ctx.stroke();
}

function pinSpriteFor(district) {
  if (district.saturation >= 90) return 'pinRed';
  if (district.saturation >= 75) return 'pinGold';
  return 'pinBlue';
}

function drawDistrictPin(district) {
  const layout = DISTRICT_LAYOUT[district.id];
  if (!layout) return;

  const selected = selectedDistrictId === district.id;
  const animated = districtFx.id === district.id;
  const s = animated ? districtFx.scale : 1;
  const x = layout.x;
  const y = layout.y;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  if (selected) {
    ctx.beginPath();
    ctx.arc(0, 1, 17 + districtFx.flash * 5, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(districtColor(district), 0.18 + districtFx.flash * 0.10);
    ctx.fill();
  }

  const sprite = pinSpriteFor(district);
  if (getAtlas()) {
    const r = ATLAS[sprite];
    ctx.drawImage(getAtlas(), r[0], r[1], r[2], r[3], -11, -25, 22, 36);
  } else {
    ctx.beginPath();
    ctx.arc(0, -8, 8, 0, Math.PI * 2);
    ctx.fillStyle = districtColor(district);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5,-2); ctx.lineTo(5,-2); ctx.lineTo(0,10); ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const labelW = Math.max(42, district.name.length * 11 + 12);
  roundedRect(
    x - labelW/2, y + 11, labelW, 19, 7,
    selected ? 'rgba(12,39,57,0.92)' : 'rgba(12,39,57,0.76)',
    selected ? 'rgba(255,215,128,0.70)' : 'rgba(255,255,255,0.18)'
  );
  drawText(district.name, x, y + 20.5, 9, COLORS.white, '700', 'center');

  addButton('district:' + district.id, x - 25, y - 28, 50, 61);
}

function startDistrictFx(id) {
  animationManager.cancelGroup('districtTap');
  districtFx.id = id;
  districtFx.scale = 0.86;
  districtFx.flash = 1;

  animationManager.start({
    id: 'district_tap_scale',
    group: 'districtTap',
    from: 0.86,
    to: 1,
    duration: 170,
    easing: 'easeOutBack',
    onUpdate(value) {
      districtFx.scale = value;
    }
  });

  animationManager.start({
    id: 'district_tap_flash',
    group: 'districtTap',
    from: 1,
    to: 0,
    duration: 360,
    easing: 'easeOutCubic',
    onUpdate(value) {
      districtFx.flash = value;
    },
    onComplete() {
      districtFx.scale = 1;
      districtFx.flash = 0;
    }
  });
}

function drawGoalCard() {
  if (!drawAtlas('goal', 10, 110, 188, 54)) {
    roundedRect(10,110,188,54,13,'rgba(12,40,58,0.93)','rgba(255,255,255,0.20)');
  }
  drawText('经营目标', 52, 128, 12, '#FFE3A3', '700');
  drawText('在本市开设第一家餐厅', 52, 147, 9, COLORS.white, '500');
  drawText('›', 184, 137, 24, '#FFE3A3', '700', 'center');
  roundedRect(20,120,24,34,7,'rgba(247,238,216,0.94)');
  drawText('✓', 32, 137, 16, '#D67E2B', '700', 'center');
  addButton('tool:goal', 10, 110, 188, 54);
}

function drawSideTools() {
  for (let i = 0; i < LEFT_TOOLS.length; i++) {
    const item = LEFT_TOOLS[i];
    const y = 178 + i * 60;
    if (!drawAtlas('side', 8, y, 50, 52)) {
      roundedRect(8,y,50,52,12,'rgba(10,34,50,0.91)','rgba(255,255,255,0.20)');
    }
    drawText(item.icon, 33, y + 17, 15, '#F7EACD', '700', 'center');
    drawText(item.label, 33, y + 38, 8, COLORS.white, '600', 'center');
    addButton('tool:' + item.id, 8, y, 50, 52);
  }

  for (let i = 0; i < RIGHT_TOOLS.length; i++) {
    const item = RIGHT_TOOLS[i];
    const y = 178 + i * 60;
    if (!drawAtlas('side', 332, y, 50, 52)) {
      roundedRect(332,y,50,52,12,'rgba(10,34,50,0.91)','rgba(255,255,255,0.20)');
    }
    drawText(item.icon, 357, y + 17, 15, '#F7EACD', '700', 'center');
    drawText(item.label, 357, y + 38, 8, COLORS.white, '600', 'center');
    addButton('tool:' + item.id, 332, y, 50, 52);
  }
}

function drawMetricChip(x, y, w, icon, label, value, color) {
  roundedRect(x, y, w, 42, 9, 'rgba(255,255,255,0.48)');
  drawText(icon, x + 16, y + 15, 14, color, '700', 'center');
  drawText(label, x + 31, y + 11, 7, COLORS.muted, '600');
  drawText(value, x + 31, y + 27, 10, COLORS.text, '700');
}

function drawDistrictCard() {
  const x = 9, y = 624, w = 372, h = 140;

  if (!drawAtlas('card', x, y, w, h)) {
    roundedRect(x,y,w,h,16,'rgba(248,244,235,0.97)','rgba(22,51,67,0.45)',1.2);
  }

  if (!selectedDistrictId) {
    drawText('●', 31, y + 29, 18, COLORS.navy, '700', 'center');
    drawText('请选择一个区域', 52, y + 26, 15, COLORS.text, '700');
    drawText('点地图上的商圈，查看真实经营数据', 52, y + 47, 9, COLORS.muted, '500');

    drawMetricChip(18, y+69, 108, '人', '人口', '--', COLORS.blue);
    drawMetricChip(132, y+69, 108, '餐', '需求', '--', COLORS.danger);
    drawMetricChip(246, y+69, 108, '¥', '客单', '--', COLORS.green);
    return;
  }

  const district = citySystem.getDistrict(selectedDistrictId);
  if (!district) return;

  const currentDemand = demandSystem.getTotalDemand(district.id);

  drawText(district.name, 20, y + 23, 16, COLORS.text, '700');
  drawText('市场饱和 ' + district.saturation + '%', 20, y + 45, 9,
    district.saturation >= 85 ? COLORS.danger : COLORS.muted, '600');

  roundedRect(292, y+12, 70, 31, 10, COLORS.gold);
  drawText('进入商圈 ›', 327, y+27.5, 9, '#26343B', '700', 'center');
  addButton('district:enter', 288, y+8, 80, 39);

  drawMetricChip(18, y+61, 108, '人', '人口', district.population.toLocaleString(), COLORS.blue);
  drawMetricChip(132, y+61, 108, '餐', MEAL_NAMES[timeSystem.getMealPeriod()] + '需求', currentDemand.toLocaleString(), COLORS.danger);
  drawMetricChip(246, y+61, 108, '¥', '客单', '¥' + district.avgSpend, COLORS.green);

  drawText('餐饮店 ' + district.restaurantCount + '家', 20, y+121, 8, COLORS.muted, '600');
  drawText('租金指数 ' + district.rentIndex.toFixed(2), 133, y+121, 8, COLORS.muted, '600');
  drawText(
    district.saturation >= 90 ? '高度饱和' : district.saturation >= 80 ? '竞争激烈' : '仍有空间',
    356, y+121, 8,
    district.saturation >= 85 ? COLORS.danger : COLORS.green,
    '700', 'right'
  );
}

function drawBottomNav() {
  if (!drawAtlas('nav', 0, NAV_Y, DESIGN_W, NAV_H)) {
    ctx.fillStyle = COLORS.navy2;
    ctx.fillRect(0,NAV_Y,DESIGN_W,NAV_H);
  }

  const current = sceneManager.getCurrentId();
  const cellW = DESIGN_W / NAV_ITEMS.length;

  for (let i = 0; i < NAV_ITEMS.length; i++) {
    const item = NAV_ITEMS[i];
    const cx = i * cellW + cellW / 2;
    const active = item.id === current || (item.id === 'business' && current === 'business');

    if (active) {
      if (!drawAtlas('navActive', i*cellW+4, NAV_Y+5, cellW-8, NAV_H-10)) {
        roundedRect(i*cellW+4,NAV_Y+5,cellW-8,NAV_H-10,12,COLORS.gold);
      }
    }

    drawText(item.icon, cx, NAV_Y+24, 15, active ? '#23323A' : COLORS.white, '700', 'center');
    drawText(item.name, cx, NAV_Y+49, 8, active ? '#23323A' : '#E3E9EC', active ? '700' : '500', 'center');
    addButton('nav:' + item.id, i*cellW, NAV_Y, cellW, NAV_H);
  }
}

const cityScene = {
  id: 'city',

  enter() {},

  exit() {
    animationManager.cancelGroup('districtTap');
  },

  update() {},

  render() {
    ctx.fillStyle = '#DDE5E1';
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);

    drawTopHud();
    drawMapBase();

    const districts = getDistricts();
    for (let i=0;i<districts.length;i++) drawRegion(districts[i]);
    for (let i=0;i<districts.length;i++) drawDistrictPin(districts[i]);

    drawGoalCard();
    drawSideTools();
    drawDistrictCard();
  },

  handleTap(x, y, target) {
    if (!target) return false;

    if (target.id.indexOf('district:') === 0 && target.id !== 'district:enter') {
      const id = target.id.split(':')[1];
      selectedDistrictId = id;
      citySystem.setCurrentDistrict(id);
      startDistrictFx(id);
      return true;
    }

    return false;
  }
};

sceneManager.register('city', cityScene);
sceneManager.register('shop', shopScene);
sceneManager.register('research', researchScene);
sceneManager.register('supply', supplyScene);
sceneManager.register('business', businessScene);

function render() {
  if (needsResize) resizeCanvas();

  buttons.length = 0;
  ctx.clearRect(0,0,DESIGN_W,DESIGN_H);
  sceneManager.render(ctx);
  drawBottomNav();
}

function screenToDesign(x, y) {
  return {
    x: (x - offsetX) / scale,
    y: (y - offsetY) / scale
  };
}

function hitTest(x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (x >= b.x && x <= b.x+b.w && y >= b.y && y <= b.y+b.h) return b;
  }
  return null;
}

function handleTimeButton(id) {
  if (id === 'time:pause') {
    timeSystem.togglePause();
    timeSystem.resetAccumulator();
    return true;
  }

  if (id.indexOf('time:speed:') === 0) {
    const value = Number(id.split(':')[2]);
    if (timeSystem.setSpeed(value)) {
      if (timeSystem.isPaused()) timeSystem.resume();
      timeSystem.resetAccumulator();
      return true;
    }
  }

  return false;
}

function handleTap(screenX, screenY) {
  const p = screenToDesign(screenX, screenY);
  const target = hitTest(p.x, p.y);
  if (!target) return;

  if (target.id.indexOf('time:') === 0) {
    if (handleTimeButton(target.id)) render();
    return;
  }

  if (target.id === 'district:enter') {
    const district = selectedDistrictId ? citySystem.getDistrict(selectedDistrictId) : null;
    if (district) showToast('进入' + district.name + '商圈');
    return;
  }

  if (target.id.indexOf('tool:') === 0) {
    const name = target.id.split(':')[1];
    if (name === 'goal') showToast('目标：开设第一家餐厅');
    else showToast('该城市功能已预留');
    return;
  }

  if (target.id.indexOf('nav:') === 0) {
    const id = target.id.split(':')[1];

    if (id === 'system') {
      showToast('系统设置将在下一阶段接入');
      return;
    }

    selectedDistrictId = null;
    animationManager.cancelGroup('districtTap');

    if (sceneManager.switchTo(id)) render();
    return;
  }

  const scene = sceneManager.getCurrentScene();
  if (scene && typeof scene.handleTap === 'function') {
    if (scene.handleTap(p.x, p.y, target)) render();
  }
}

if (api && typeof api.onTouchEnd === 'function') {
  api.onTouchEnd(function (event) {
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;
    handleTap(touch.clientX, touch.clientY);
  });
}

function scheduleNextFrame(callback) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback);
  } else {
    setTimeout(function () { callback(Date.now()); }, 33);
  }
}

function gameLoop(timestamp) {
  const now = typeof timestamp === 'number' ? timestamp : Date.now();
  if (lastFrameTime === null) lastFrameTime = now;

  const deltaMs = Math.max(0, now - lastFrameTime);
  lastFrameTime = now;

  sceneManager.update(deltaMs);
  const animationChanged = animationManager.update(deltaMs);
  const advancedMinutes = timeSystem.update(deltaMs);

  if (advancedMinutes > 0 || animationChanged || needsResize) render();
  scheduleNextFrame(gameLoop);
}

function loadResources() {
  return Promise.all([
    resourceManager.loadImage(
      'city_base_01',
      'assets/images/map/city_base_01.png',
      'city'
    ),
    resourceManager.loadImage(
      'ui_atlas_01',
      'assets/images/ui/ui_atlas_01.png',
      'ui'
    )
  ]).then(function () {
    buildMapCache();
    render();
  }).catch(function (error) {
    console.error('资源加载失败', error);
    render();
  });
}

sceneManager.switchTo('city');
render();
loadResources();
scheduleNextFrame(gameLoop);

console.log('城市餐饮经营小游戏 UI V2 启动成功');
