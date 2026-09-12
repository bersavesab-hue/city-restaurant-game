'use strict';

const runtime = globalThis.GameRuntime;

if (!runtime) {
  throw new Error('GameRuntime 未初始化，请先从 game.js 启动');
}

const api = runtime.api;
const canvas = runtime.canvas;
const ctx = runtime.ctx;

const DESIGN_W = 390;
const DESIGN_H = 844;

const COLORS = {
  bg: '#F3EBDD',
  top: '#4B2D24',
  nav: '#5A372A',
  panel: '#FFF8EE',
  map: '#E7D4B7',
  road: '#C7AC88',
  river: '#8EBBC8',
  riverLight: '#CDE3E8',
  block: '#D8C19F',
  text: '#2F211C',
  muted: '#846E63',
  accent: '#D18342',
  accentDark: '#A45F2F',
  danger: '#B75B50',
  gold: '#C89B54',
  white: '#FFFDF9'
};

const state = {
  selectedDistrict: 'university'
};

const city = {
  name: '云州市',
  date: '第1年 4月12日',
  time: '10:20',
  weather: '晴 23℃',
  cash: 50000
};

const districts = [
  {
    id: 'oldtown',
    name: '老城区',
    x: 85,
    y: 205,
    heat: 68,
    population: 30240,
    demand: 7200,
    avgSpend: 22.4,
    restaurants: 89,
    saturation: 67
  },
  {
    id: 'cbd',
    name: '商业中心',
    x: 205,
    y: 165,
    heat: 91,
    population: 48700,
    demand: 13800,
    avgSpend: 48.6,
    restaurants: 152,
    saturation: 91
  },
  {
    id: 'university',
    name: '大学城',
    x: 280,
    y: 305,
    heat: 95,
    population: 36300,
    demand: 14820,
    avgSpend: 21.6,
    restaurants: 126,
    saturation: 84
  },
  {
    id: 'market',
    name: '东门市场',
    x: 130,
    y: 340,
    heat: 76,
    population: 27400,
    demand: 8600,
    avgSpend: 18.3,
    restaurants: 74,
    saturation: 64
  },
  {
    id: 'village',
    name: '城中村',
    x: 65,
    y: 430,
    heat: 83,
    population: 41800,
    demand: 10200,
    avgSpend: 16.8,
    restaurants: 103,
    saturation: 72
  },
  {
    id: 'industry',
    name: '工业园',
    x: 225,
    y: 455,
    heat: 73,
    population: 32900,
    demand: 9200,
    avgSpend: 19.5,
    restaurants: 81,
    saturation: 61
  },
  {
    id: 'hightech',
    name: '高新区',
    x: 325,
    y: 205,
    heat: 79,
    population: 38100,
    demand: 9800,
    avgSpend: 36.2,
    restaurants: 97,
    saturation: 75
  }
];

let scale = 1;
let offsetX = 0;
let offsetY = 0;
let pixelRatio = 1;
let screenW = DESIGN_W;
let screenH = DESIGN_H;

const buttons = [];

function getSystemInfo() {
  if (api.getSystemInfoSync) {
    return api.getSystemInfoSync();
  }

  return {
    windowWidth: 390,
    windowHeight: 844,
    pixelRatio: 1
  };
}

function resizeCanvas() {
  const info = getSystemInfo();

  screenW = info.windowWidth || DESIGN_W;
  screenH = info.windowHeight || DESIGN_H;
  pixelRatio = info.pixelRatio || 1;

  canvas.width = Math.floor(screenW * pixelRatio);
  canvas.height = Math.floor(screenH * pixelRatio);

  scale = Math.min(
    screenW / DESIGN_W,
    screenH / DESIGN_H
  );

  offsetX = (screenW - DESIGN_W * scale) / 2;
  offsetY = (screenH - DESIGN_H * scale) / 2;

  ctx.setTransform(
    pixelRatio * scale,
    0,
    0,
    pixelRatio * scale,
    offsetX * pixelRatio,
    offsetY * pixelRatio
  );
}

function roundedRect(x, y, w, h, r, fill, stroke) {
  const radius = Math.min(r, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawText(text, x, y, size, color, weight, align) {
  ctx.fillStyle = color || COLORS.text;
  ctx.font =
    (weight || '500') +
    ' ' +
    size +
    'px sans-serif';

  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function addButton(id, x, y, w, h) {
  buttons.push({
    id,
    x,
    y,
    w,
    h
  });
}

function drawTopBar() {
  ctx.fillStyle = COLORS.top;
  ctx.fillRect(0, 0, DESIGN_W, 72);

  drawText(
    city.name,
    16,
    20,
    19,
    COLORS.white,
    '700'
  );

  drawText(
    city.date + '  ' + city.time,
    16,
    48,
    12,
    '#EBD8CD',
    '500'
  );

  drawText(
    city.weather,
    374,
    20,
    12,
    '#F4E2D8',
    '600',
    'right'
  );

  drawText(
    '¥' + city.cash.toLocaleString(),
    374,
    49,
    17,
    '#FFD692',
    '700',
    'right'
  );
}

function drawRoad(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);

  ctx.strokeStyle = COLORS.road;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawMap() {
  const x = 10;
  const y = 82;
  const w = 370;
  const h = 435;

  roundedRect(
    x,
    y,
    w,
    h,
    22,
    COLORS.map
  );

  drawRoad(45, 190, 348, 220);
  drawRoad(90, 120, 118, 475);
  drawRoad(182, 110, 230, 485);
  drawRoad(310, 120, 285, 470);
  drawRoad(40, 390, 342, 420);

  const blocks = [
    [35, 115, 60, 40],
    [120, 125, 50, 48],
    [205, 110, 60, 42],
    [285, 130, 50, 38],

    [40, 250, 55, 42],
    [125, 235, 65, 50],
    [210, 245, 50, 42],
    [295, 260, 48, 42],

    [30, 410, 62, 36],
    [120, 400, 55, 45],
    [235, 420, 58, 40],
    [305, 395, 42, 38]
  ];

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];

    roundedRect(
      b[0],
      b[1],
      b[2],
      b[3],
      7,
      COLORS.block
    );
  }

  ctx.beginPath();
  ctx.moveTo(30, 430);

  ctx.bezierCurveTo(
    100,
    350,
    155,
    485,
    220,
    380
  );

  ctx.bezierCurveTo(
    275,
    305,
    310,
    350,
    365,
    235
  );

  ctx.strokeStyle = COLORS.river;
  ctx.lineWidth = 22;
  ctx.stroke();

  ctx.strokeStyle = COLORS.riverLight;
  ctx.lineWidth = 5;
  ctx.stroke();
}

function drawDistrict(d) {
  const selected =
    d.id === state.selectedDistrict;

  const cardW = 88;
  const cardH = 50;

  const x = d.x - cardW / 2;
  const y = d.y - cardH / 2;

  roundedRect(
    x,
    y,
    cardW,
    cardH,
    14,
    selected
      ? COLORS.panel
      : '#FFFDF8',
    selected
      ? COLORS.accent
      : null
  );

  drawText(
    d.name,
    d.x,
    y + 17,
    12,
    COLORS.text,
    '700',
    'center'
  );

  drawText(
    '热度 ' + d.heat,
    d.x,
    y + 35,
    10,
    COLORS.muted,
    '500',
    'center'
  );

  addButton(
    'district:' + d.id,
    x,
    y,
    cardW,
    cardH
  );
}

function getSelectedDistrict() {
  for (let i = 0; i < districts.length; i++) {
    if (
      districts[i].id ===
      state.selectedDistrict
    ) {
      return districts[i];
    }
  }

  return districts[0];
}

function drawDistrictPanel() {
  const d = getSelectedDistrict();

  const x = 10;
  const y = 530;
  const w = 370;
  const h = 225;

  roundedRect(
    x,
    y,
    w,
    h,
    20,
    COLORS.panel
  );

  drawText(
    d.name + '商圈',
    25,
    556,
    18,
    COLORS.text,
    '700'
  );

  drawText(
    d.heat >= 90
      ? '🔥 当前热门商圈'
      : '餐饮需求稳定',
    365,
    556,
    11,
    COLORS.accentDark,
    '600',
    'right'
  );

  const cols = [
    ['人口', d.population.toLocaleString()],
    ['日需求', d.demand.toLocaleString()],
    ['客单', '¥' + d.avgSpend],
    ['餐饮店', d.restaurants + '家']
  ];

  const startX = 25;
  const colW = 85;

  for (let i = 0; i < cols.length; i++) {
    const cx =
      startX + i * colW;

    drawText(
      cols[i][0],
      cx,
      594,
      10,
      COLORS.muted,
      '500'
    );

    drawText(
      cols[i][1],
      cx,
      615,
      13,
      COLORS.text,
      '700'
    );
  }

  drawText(
    '市场饱和度 ' +
      d.saturation +
      '%',
    25,
    650,
    11,
    COLORS.muted,
    '500'
  );

  roundedRect(
    25,
    665,
    340,
    8,
    4,
    '#E6D6C3'
  );

  roundedRect(
    25,
    665,
    340 * (d.saturation / 100),
    8,
    4,
    d.saturation >= 85
      ? COLORS.danger
      : COLORS.gold
  );

  drawText(
    '同一商圈顾客有限，所有餐厅争抢同一批真实需求。',
    25,
    693,
    11,
    COLORS.muted,
    '500'
  );

  roundedRect(
    25,
    711,
    340,
    36,
    12,
    COLORS.accent
  );

  drawText(
    '进入商圈',
    195,
    729,
    14,
    COLORS.white,
    '700',
    'center'
  );

  addButton(
    'enterDistrict',
    25,
    711,
    340,
    36
  );
}

function drawBottomNav() {
  const y = 766;
  const h = 78;

  ctx.fillStyle = COLORS.nav;
  ctx.fillRect(
    0,
    y,
    DESIGN_W,
    h
  );

  const navs = [
    ['城市', '城'],
    ['门店', '店'],
    ['研发', '研'],
    ['供应链', '供'],
    ['经营', '营']
  ];

  const cellW = DESIGN_W / navs.length;

  for (
    let i = 0;
    i < navs.length;
    i++
  ) {
    const cx =
      cellW * i +
      cellW / 2;

    if (i === 0) {
      roundedRect(
        cx - 29,
        y + 8,
        58,
        52,
        16,
        '#7A4A36'
      );
    }

    drawText(
      navs[i][1],
      cx,
      y + 25,
      18,
      COLORS.white,
      '700',
      'center'
    );

    drawText(
      navs[i][0],
      cx,
      y + 51,
      10,
      i === 0
        ? '#FFD692'
        : '#E7D6CA',
      i === 0
        ? '700'
        : '500',
      'center'
    );

    addButton(
      'nav:' + navs[i][0],
      cellW * i,
      y,
      cellW,
      h
    );
  }
}

function render() {
  resizeCanvas();

  buttons.length = 0;

  ctx.clearRect(
    0,
    0,
    DESIGN_W,
    DESIGN_H
  );

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(
    0,
    0,
    DESIGN_W,
    DESIGN_H
  );

  drawTopBar();
  drawMap();

  for (
    let i = 0;
    i < districts.length;
    i++
  ) {
    drawDistrict(districts[i]);
  }

  drawDistrictPanel();
  drawBottomNav();
}

function screenToDesign(x, y) {
  return {
    x: (x - offsetX) / scale,
    y: (y - offsetY) / scale
  };
}

function hitTest(x, y) {
  for (
    let i = buttons.length - 1;
    i >= 0;
    i--
  ) {
    const b = buttons[i];

    if (
      x >= b.x &&
      x <= b.x + b.w &&
      y >= b.y &&
      y <= b.y + b.h
    ) {
      return b;
    }
  }

  return null;
}

function handleTap(x, y) {
  const p =
    screenToDesign(x, y);

  const target =
    hitTest(p.x, p.y);

  if (!target) {
    return;
  }

  if (
    target.id.indexOf(
      'district:'
    ) === 0
  ) {
    state.selectedDistrict =
      target.id.split(':')[1];

    render();
    return;
  }

  if (
    target.id ===
    'enterDistrict'
  ) {
    if (api.showToast) {
      api.showToast({
        title: '下一步制作商圈地图',
        icon: 'none'
      });
    }
  }
}

if (api.onTouchEnd) {
  api.onTouchEnd(function (event) {
    const touch =
      event.changedTouches &&
      event.changedTouches[0];

    if (!touch) {
      return;
    }

    handleTap(
      touch.clientX,
      touch.clientY
    );
  });
}

render();

console.log(
  '城市餐饮经营小游戏启动成功'
);
