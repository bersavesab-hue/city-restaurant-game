'use strict';

// V18_CITY_UI_REWRITE

// V14_GOLDEN_UI_MAIN

const runtime = globalThis.GameRuntime;
if (!runtime) {
  throw new Error('GameRuntime 未初始化');
}

const api = runtime.api || {};
const canvas = runtime.canvas;
const ctx = runtime.ctx;

/* =========================
   核心系统
========================= */

const gameState =
  require('./core/gameState.js');

const timeSystem =
  require('./core/timeSystem.js');

const sceneManager =
  require('./core/sceneManager.js');

const animationManager =
  require('./core/animationManager.js');

const resourceManager =
  require('./core/resourceManager.js');

const safeArea =
  require('./ui/safeArea.js');

const citySystem =
  require('./city/citySystem.js');

const demandSystem =
  require('./city/demandSystem.js');

const simulationSystem =
  require('./core/simulationSystem.js');

const simulationConfig =
  require('./core/simulationConfig.js');

/* =========================
   其他页面
========================= */

const propertyMarketScene =
  require('./scenes/shopScene.js');

const storeScene =
  require('./scenes/storeScene.js');

const districtScene =
  require('./scenes/districtScene.js');

const renovationScene =
  require('./scenes/renovationScene.js');

const equipmentScene =
  require('./scenes/equipmentScene.js');

const licenseScene =
  require('./scenes/licenseScene.js');

const staffScene =
  require('./scenes/staffScene.js');

const researchScene =
  require('./scenes/researchScene.js');

const supplyScene =
  require('./scenes/supplyScene.js');

const businessScene =
  require('./scenes/businessScene.js');

/* =========================
   手机自适应基础
========================= */

/*
 * 逻辑宽度固定 390。
 * 逻辑高度跟随手机真实宽高比，
 * 不再使用固定 390×844 居中缩放。
 *
 * 这样不同长宽比手机都会铺满整个游戏区域，
 * 不会再出现左右留白。
 */

const VIEW_W = 390;

let VIEW_H = 780;

let TOP_H = 90;
let NAV_H = 64;

let SAFE_TOP = 0;
let SAFE_BOTTOM = 0;

let MAP_X = 0;
let MAP_Y = 90;
let MAP_W = 390;
let MAP_H = 626;

let CARD_X = 8;
let CARD_Y = 580;
let CARD_W = 374;
let CARD_H = 126;

let NAV_Y = 716;

let scale = 1;
let pixelRatio = 1;
let lastFrameTime = null;

let screenWidth = VIEW_W;
let screenHeight = VIEW_H;

let needsResize = true;
let mapCache = null;
let mapCacheHeight = 0;

const buttons = [];

/* =========================
   颜色
========================= */

const COLORS = {
  navy: '#0F344D',
  navy2: '#092638',
  white: '#FFFDF8',
  cream: '#F7F0E4',
  text: '#1D2B33',
  muted: '#667780',
  gold: '#F2B846',
  orange: '#E99B2F',
  blue: '#439CC9',
  danger: '#DA4C3E',
  green: '#34A66A',
  line: 'rgba(255,255,255,0.20)'
};

/* =========================
   UI 图集
========================= */

const ATLAS = {
  hud: [0, 0, 1024, 220],
  goal: [0, 240, 600, 150],
  side: [620, 240, 160, 150],
  card: [0, 410, 1024, 240],
  nav: [0, 670, 1024, 180],
  navActive: [0, 870, 160, 150]
};

/* =========================
   文本
========================= */

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

/* =========================
   商圈位置
========================= */

/*
 * 不再画任何分区多边形。
 *
 * 地点只使用地图上的轻量锚点。
 * 坐标使用 0~1 的相对位置，
 * 因此手机屏幕高度变化以后，
 * 地点仍能跟随地图自适应。
 *
 * 位置重新按地图视觉逻辑校正：
 * 大学城：左上体育场/校园建筑群
 * 商业中心：中央高楼群
 * 高新区：右上现代新区
 * 老城区：左中旧居民区
 * 城中村：中心外围低层密集住宅区
 * 东门市场：左下生活区/街市附近
 * 工业园：右中厂房、烟囱区域
 */

const DISTRICT_LAYOUT = {
  university: {
    x: 0.23,
    y: 0.30
  },

  hightech: {
    x: 0.82,
    y: 0.32
  },

  cbd: {
    x: 0.52,
    y: 0.43
  },

  oldtown: {
    x: 0.17,
    y: 0.55
  },

  village: {
    x: 0.42,
    y: 0.60
  },

  market: {
    x: 0.25,
    y: 0.70
  },

  industry: {
    x: 0.86,
    y: 0.56
  }
};

/* =========================
   底部导航
========================= */

const NAV_ITEMS = [
  { id: 'city', name: '城市', icon: '城' },
  { id: 'shop', name: '门店', icon: '店' },
  { id: 'renovation', name: '装修', icon: '装' },
  { id: 'research', name: '菜单', icon: '菜' },
  { id: 'supply', name: '供应链', icon: '供' },
  { id: 'business', name: '数据', icon: '数' },
  { id: 'system', name: '系统', icon: '设' }
];

/* =========================
   地图小工具
========================= */

const LEFT_TOOLS = [
  {
    id: 'overview',
    label: '概览',
    icon: '览'
  },

  {
    id: 'dynamic',
    label: '动态',
    icon: '势'
  },

  {
    id: 'event',
    label: '事件',
    icon: '事'
  }
];

const RIGHT_TOOLS = [
  {
    id: 'land',
    label: '地块',
    icon: '地'
  },

  {
    id: 'population',
    label: '人口',
    icon: '人'
  },

  {
    id: 'rank',
    label: '排行',
    icon: '榜'
  }
];

/* =========================
   商圈选中状态
========================= */

let selectedDistrictId =
  null;

const districtFx = {
  id: null,
  scale: 1,
  flash: 0
};

/* =========================
   系统信息 / 自适应布局
========================= */

function getSystemInfo() {
  if (
    api &&
    typeof api.getSystemInfoSync ===
      'function'
  ) {
    return api.getSystemInfoSync();
  }

  return {
    windowWidth: VIEW_W,
    windowHeight: VIEW_H,
    pixelRatio: 1
  };
}

function updateLayout() {
  TOP_H =
    (
      VIEW_H < 740
        ? 91
        : 97
    ) +
    SAFE_TOP;

  NAV_H =
    (
      VIEW_H < 740
        ? 61
        : 66
    ) +
    SAFE_BOTTOM;

  MAP_X = 0;
  MAP_Y = TOP_H;
  MAP_W = VIEW_W;

  NAV_Y =
    VIEW_H -
    NAV_H;

  MAP_H =
    NAV_Y -
    MAP_Y;

  CARD_H =
    VIEW_H < 740
      ? 126
      : 144;

  CARD_X = 7;
  CARD_W =
    VIEW_W -
    14;

  CARD_Y =
    NAV_Y -
    CARD_H -
    7;
}

function resizeCanvas() {
  const info =
    getSystemInfo();

  screenWidth =
    Math.max(
      1,
      Number(
        info.windowWidth
      ) ||
      VIEW_W
    );

  screenHeight =
    Math.max(
      1,
      Number(
        info.windowHeight
      ) ||
      780
    );

  /*
   * 高分辨率安卓机如果直接使用 3× / 4× DPR，
   * Canvas 面积会非常大。
   *
   * 这里限制到 2×，
   * 对小游戏已经足够清晰，
   * 同时明显减轻动画重绘压力。
   */
  pixelRatio =
    Math.min(
      3,
      Math.max(
        1,
        Number(
          info.pixelRatio
        ) ||
        1
      )
    );

  /*
   * 逻辑宽度固定，
   * 高度按照手机真实宽高比计算。
   */
  scale =
    screenWidth /
    VIEW_W;

  const safeInsets =
    safeArea
      .getLogicalInsets(
        info,
        scale
      );

  SAFE_TOP =
    safeInsets.top;

  SAFE_BOTTOM =
    safeInsets.bottom;

  VIEW_H =
    screenHeight /
    scale;

  updateLayout();

  const targetW =
    Math.max(
      1,
      Math.floor(
        screenWidth *
        pixelRatio
      )
    );

  const targetH =
    Math.max(
      1,
      Math.floor(
        screenHeight *
        pixelRatio
      )
    );

  if (
    canvas.width !==
      targetW ||
    canvas.height !==
      targetH
  ) {
    canvas.width =
      targetW;

    canvas.height =
      targetH;
  }

  ctx.setTransform(
    pixelRatio * scale,
    0,
    0,
    pixelRatio * scale,
    0,
    0
  );

  needsResize =
    false;

  /*
   * 地图高度变化以后，
   * 旧缓存失效。
   */
  if (
    Math.abs(
      mapCacheHeight -
      MAP_H
    ) >
    1
  ) {
    mapCache =
      null;

    mapCacheHeight =
      MAP_H;

    buildMapCache();
  }
}

if (
  typeof window !==
    'undefined' &&
  window.addEventListener
) {
  window.addEventListener(
    'resize',
    function () {
      needsResize =
        true;
    }
  );

  window.addEventListener(
    'orientationchange',
    function () {
      needsResize =
        true;
    }
  );
}

/* =========================
   基础绘图
========================= */

function roundedPath(
  target,
  x,
  y,
  w,
  h,
  r
) {
  const radius =
    Math.min(
      r,
      w / 2,
      h / 2
    );

  target.beginPath();

  target.moveTo(
    x + radius,
    y
  );

  target.arcTo(
    x + w,
    y,
    x + w,
    y + h,
    radius
  );

  target.arcTo(
    x + w,
    y + h,
    x,
    y + h,
    radius
  );

  target.arcTo(
    x,
    y + h,
    x,
    y,
    radius
  );

  target.arcTo(
    x,
    y,
    x + w,
    y,
    radius
  );

  target.closePath();
}

function roundedRect(
  x,
  y,
  w,
  h,
  r,
  fill,
  stroke,
  lineWidth
) {
  roundedPath(
    ctx,
    x,
    y,
    w,
    h,
    r
  );

  if (fill) {
    ctx.fillStyle =
      fill;

    ctx.fill();
  }

  if (stroke) {
    ctx.lineWidth =
      lineWidth ||
      1;

    ctx.strokeStyle =
      stroke;

    ctx.stroke();
  }
}

function drawText(
  text,
  x,
  y,
  size,
  color,
  weight,
  align
) {
  ctx.fillStyle =
    color ||
    COLORS.text;

  const readableSize =
    Math.max(
      7.3,
      Number(
        size
      ) ||
      7.3
    );

  ctx.font =
    (
      weight ||
      '500'
    ) +
    ' ' +
    readableSize +
    'px sans-serif';

  ctx.textAlign =
    align ||
    'left';

  ctx.textBaseline =
    'middle';

  ctx.fillText(
    String(text),
    x,
    y
  );
}

function fitText(
  text,
  maxWidth,
  size,
  weight
) {
  const value =
    String(
      text == null
        ? ''
        : text
    );

  if (
    !ctx.measureText ||
    !maxWidth
  ) {
    return value;
  }

  const readableSize =
    Math.max(
      7.3,
      Number(
        size
      ) ||
      7.3
    );

  ctx.font =
    (
      weight ||
      '500'
    ) +
    ' ' +
    readableSize +
    'px sans-serif';

  if (
    ctx.measureText(
      value
    ).width <=
    maxWidth
  ) {
    return value;
  }

  let result =
    value;

  while (
    result.length >
      1 &&
    ctx.measureText(
      result +
      '…'
    ).width >
      maxWidth
  ) {
    result =
      result.slice(
        0,
        -1
      );
  }

  return (
    result +
    '…'
  );
}

function addButton(
  id,
  x,
  y,
  w,
  h
) {
  const hitW =
    Math.max(
      40,
      w
    );

  const hitH =
    Math.max(
      36,
      h
    );

  buttons.push({
    id,
    x:
      x -
      (
        hitW -
        w
      ) /
      2,
    y:
      y -
      (
        hitH -
        h
      ) /
      2,
    w:
      hitW,
    h:
      hitH
  });
}

function showToast(
  text
) {
  if (
    api &&
    typeof api.showToast ===
      'function'
  ) {
    api.showToast({
      title:
        text,

      icon:
        'none'
    });
  }
}

/* =========================
   UI 图集
========================= */

function getAtlas() {
  return resourceManager
    .getImage(
      'ui_atlas_01'
    );
}

function drawAtlas(
  name,
  dx,
  dy,
  dw,
  dh
) {
  const atlas =
    getAtlas();

  const region =
    ATLAS[name];

  if (
    !atlas ||
    !region
  ) {
    return false;
  }

  ctx.drawImage(
    atlas,

    region[0],
    region[1],
    region[2],
    region[3],

    dx,
    dy,
    dw,
    dh
  );

  return true;
}

/* =========================
   地图裁切
========================= */

function drawImageFocus(
  target,
  image,
  dx,
  dy,
  dw,
  dh,
  zoom,
  focusX,
  focusY
) {
  const iw =
    image.naturalWidth ||
    image.width;

  const ih =
    image.naturalHeight ||
    image.height;

  if (
    !iw ||
    !ih
  ) {
    return;
  }

  const boxRatio =
    dw /
    dh;

  const imageRatio =
    iw /
    ih;

  let sw;
  let sh;

  if (
    imageRatio >
    boxRatio
  ) {
    sh =
      ih;

    sw =
      sh *
      boxRatio;
  } else {
    sw =
      iw;

    sh =
      sw /
      boxRatio;
  }

  const z =
    Math.max(
      1,
      zoom ||
      1
    );

  sw /=
    z;

  sh /=
    z;

  const maxX =
    Math.max(
      0,
      iw -
      sw
    );

  const maxY =
    Math.max(
      0,
      ih -
      sh
    );

  const fx =
    Math.max(
      0,
      Math.min(
        1,
        focusX == null
          ? 0.5
          : focusX
      )
    );

  const fy =
    Math.max(
      0,
      Math.min(
        1,
        focusY == null
          ? 0.5
          : focusY
      )
    );

  const sx =
    maxX *
    fx;

  const sy =
    maxY *
    fy;

  target.drawImage(
    image,

    sx,
    sy,
    sw,
    sh,

    dx,
    dy,
    dw,
    dh
  );
}

/* =========================
   地图缓存
========================= */

function createOffscreenCanvas(
  width,
  height
) {
  if (
    typeof document !==
      'undefined' &&
    document.createElement
  ) {
    const c =
      document.createElement(
        'canvas'
      );

    c.width =
      width;

    c.height =
      height;

    return c;
  }

  if (
    runtime.platform !==
      'android' &&
    api &&
    typeof api.createCanvas ===
      'function'
  ) {
    try {
      const c =
        api.createCanvas();

      if (
        c &&
        c !== canvas
      ) {
        c.width =
          width;

        c.height =
          height;

        return c;
      }
    } catch (error) {
      return null;
    }
  }

  return null;
}

function buildMapCache() {
  const image =
    resourceManager
      .getImage(
        'city_base_01'
      );

  if (!image) {
    return false;
  }

  const cacheScale =
    2;

  const c =
    createOffscreenCanvas(
      Math.max(
        1,
        Math.floor(
          MAP_W *
          cacheScale
        )
      ),

      Math.max(
        1,
        Math.floor(
          MAP_H *
          cacheScale
        )
      )
    );

  if (
    !c ||
    typeof c.getContext !==
      'function'
  ) {
    mapCache =
      null;

    return false;
  }

  const cctx =
    c.getContext(
      '2d'
    );

  if (!cctx) {
    return false;
  }

  cctx.setTransform(
    cacheScale,
    0,
    0,
    cacheScale,
    0,
    0
  );

  /*
   * V3 地图稍微减少放大，
   * 让城市道路关系更自然。
   */
  drawImageFocus(
    cctx,
    image,
    0,
    0,
    MAP_W,
    MAP_H,
    1.06,
    0.52,
    0.13
  );

  const gradient =
    cctx.createLinearGradient(
      0,
      0,
      0,
      MAP_H
    );

  gradient.addColorStop(
    0,
    'rgba(5,25,38,0.025)'
  );

  gradient.addColorStop(
    0.68,
    'rgba(5,25,38,0.01)'
  );

  gradient.addColorStop(
    1,
    'rgba(5,25,38,0.10)'
  );

  cctx.fillStyle =
    gradient;

  cctx.fillRect(
    0,
    0,
    MAP_W,
    MAP_H
  );

  mapCache =
    c;

  mapCacheHeight =
    MAP_H;

  return true;
}

/* =========================
   顶部 HUD
========================= */

function drawTopHud() {
  const player =
    gameState
      .getPlayer();

  const world =
    gameState
      .getWorld();

  const display =
    timeSystem
      .getDisplayState();

  let cityName =
    gameState
      .getCityName();

  if (
    !cityName ||
    cityName ===
      '未命名城市'
  ) {
    cityName =
      '云州市';
  }

  const headerImage =
    resourceManager
      .getImage(
        'city_header_thumb'
      );

  if (headerImage) {
    drawImageFocus(
      ctx,
      headerImage,
      0,
      0,
      VIEW_W,
      TOP_H,
      1.30,
      0.5,
      0.52
    );

    ctx.fillStyle =
      'rgba(4,35,58,0.61)';

    ctx.fillRect(
      0,
      0,
      VIEW_W,
      TOP_H
    );
  } else {
    ctx.fillStyle =
      COLORS.navy;

    ctx.fillRect(
      0,
      0,
      VIEW_W,
      TOP_H
    );
  }

  roundedRect(
    10,
    8 + SAFE_TOP,
    45,
    45,
    10,
    'rgba(255,255,255,0.92)',
    '#F4C349'
  );

  if (headerImage) {
    drawImageFocus(
      ctx,
      headerImage,
      13,
      11 + SAFE_TOP,
      39,
      39,
      1.75,
      0.18,
      0.54
    );
  } else {
    drawText(
      '城',
      32.5,
      30 + SAFE_TOP,
      15,
      COLORS.navy,
      '800',
      'center'
    );
  }

  drawText(
    cityName,
    66,
    20 + SAFE_TOP,
    15.5,
    COLORS.white,
    '800'
  );

  drawText(
    '打造属于你的美食帝国',
    66,
    42 + SAFE_TOP,
    7.2,
    '#DFEEF4',
    '600'
  );

  drawText(
    WEATHER_NAMES[
      world.weather
    ] ||
    '晴',
    184,
    21 + SAFE_TOP,
    7.7,
    '#FFF1B2',
    '700',
    'center'
  );

  drawText(
    (
      Number.isFinite(
        Number(
          world.temperature
        )
      )
        ? world.temperature +
          '℃'
        : ''
    ),
    184,
    42 + SAFE_TOP,
    6.8,
    '#D7E8EE',
    '600',
    'center'
  );

  roundedRect(
    217,
    9 + SAFE_TOP,
    101,
    45,
    12,
    'rgba(5,39,60,0.86)',
    'rgba(255,255,255,0.30)'
  );

  drawText(
    '¥' +
      player.cash
        .toLocaleString(),
    267.5,
    24 + SAFE_TOP,
    11,
    '#FFF0A8',
    '800',
    'center'
  );

  drawText(
    '可用资金',
    267.5,
    42 + SAFE_TOP,
    6.3,
    '#D6E7ED',
    '600',
    'center'
  );

  roundedRect(
    325,
    9 + SAFE_TOP,
    55,
    45,
    12,
    'rgba(5,39,60,0.86)',
    'rgba(255,255,255,0.30)'
  );

  drawText(
    '♛ Lv.1',
    352.5,
    23 + SAFE_TOP,
    8.2,
    '#FFE081',
    '800',
    'center'
  );

  roundedRect(
    334,
    42 + SAFE_TOP,
    37,
    3,
    1.5,
    'rgba(255,255,255,0.24)'
  );

  roundedRect(
    334,
    42 + SAFE_TOP,
    9,
    3,
    1.5,
    COLORS.gold
  );

  const speedItems = [
    [
      'time:pause',
      timeSystem
        .isPaused()
        ? '▶'
        : 'Ⅱ'
    ],
    [
      'time:speed:1',
      '1×'
    ],
    [
      'time:speed:2',
      '2×'
    ],
    [
      'time:speed:5',
      '5×'
    ],
    [
      'time:speed:10',
      '10×'
    ]
  ];

  const y =
    TOP_H -
    27;

  for (
    let i = 0;
    i <
    speedItems.length;
    i++
  ) {
    const id =
      speedItems[i][0];

    const speed =
      timeSystem
        .getSpeed();

    const paused =
      timeSystem
        .isPaused();

    const active =
      id ===
        'time:pause'
        ? paused
        : (
            !paused &&
            Number(
              id.split(':')[2]
            ) === speed
          );

    const x =
      12 +
      i * 45;

    roundedRect(
      x,
      y,
      39,
      21,
      8,
      active
        ? COLORS.gold
        : 'rgba(4,40,60,0.82)',
      active
        ? '#FFE38D'
        : 'rgba(255,255,255,0.20)'
    );

    drawText(
      speedItems[i][1],
      x + 19.5,
      y + 10.5,
      8,
      active
        ? '#173444'
        : COLORS.white,
      '800',
      'center'
    );

    addButton(
      id,
      x - 3,
      y - 5,
      45,
      31
    );
  }

  drawText(
    display.date +
      ' · ' +
      display.time +
      ' · ' +
      (
        MEAL_NAMES[
          display.mealPeriod
        ] ||
        ''
      ),
    375,
    y + 10.5,
    6.5,
    '#DCEBF0',
    '600',
    'right'
  );
}

/* =========================
   城市地图
========================= */

function drawMapBase() {
  if (mapCache) {
    ctx.drawImage(
      mapCache,
      MAP_X,
      MAP_Y,
      MAP_W,
      MAP_H
    );

    return;
  }

  const image =
    resourceManager
      .getImage(
        'city_base_01'
      );

  if (image) {
    drawImageFocus(
      ctx,
      image,
      MAP_X,
      MAP_Y,
      MAP_W,
      MAP_H,
      1.06,
      0.52,
      0.13
    );

    return;
  }

  ctx.fillStyle =
    '#B9C8C0';

  ctx.fillRect(
    MAP_X,
    MAP_Y,
    MAP_W,
    MAP_H
  );

  drawText(
    '城市地图加载中…',
    VIEW_W / 2,
    MAP_Y +
      MAP_H / 2,
    12,
    COLORS.white,
    '700',
    'center'
  );
}

/* =========================
   商圈
========================= */

function getDistricts() {
  const world =
    gameState
      .getWorld();

  return citySystem
    .getDistrictsByCity(
      world.currentCityId
    );
}

function getDistrictColor(
  district
) {
  const bands =
    simulationConfig
      .city
      .competitionBands;

  if (
    district.saturation >=
    bands.extreme
  ) {
    return COLORS.danger;
  }

  if (
    district.saturation >=
    bands.high
  ) {
    return COLORS.orange;
  }

  if (
    district.saturation >=
    bands.medium
  ) {
    return COLORS.gold;
  }

  return COLORS.blue;
}

function hexToRgba(
  hex,
  alpha
) {
  const value =
    hex.replace(
      '#',
      ''
    );

  const r =
    parseInt(
      value.slice(
        0,
        2
      ),
      16
    );

  const g =
    parseInt(
      value.slice(
        2,
        4
      ),
      16
    );

  const b =
    parseInt(
      value.slice(
        4,
        6
      ),
      16
    );

  return (
    'rgba(' +
    r +
    ',' +
    g +
    ',' +
    b +
    ',' +
    alpha +
    ')'
  );
}

function getDistrictPoint(
  districtId
) {
  const layout =
    DISTRICT_LAYOUT[
      districtId
    ];

  if (!layout) {
    return null;
  }

  return {
    x:
      MAP_X +
      MAP_W *
      layout.x,

    y:
      MAP_Y +
      MAP_H *
      layout.y
  };
}

/*
 * V3 地点标识：
 *
 * 不再使用地图定位针。
 * 改成小圆形锚点，
 * 更像经营游戏中的可点击 POI。
 */
function drawDistrictMarker(
  district
) {
  const point =
    getDistrictPoint(
      district.id
    );

  if (!point) {
    return;
  }

  const x =
    point.x;

  const y =
    point.y;

  const selected =
    selectedDistrictId ===
      district.id;

  const markerKeys = {
    university:
      'district_marker_gold',
    hightech:
      'district_marker_blue',
    cbd:
      'district_marker_orange',
    oldtown:
      'district_marker_purple',
    village:
      'district_marker_green',
    market:
      'district_marker_red',
    industry:
      'district_marker_blue'
  };

  const image =
    resourceManager
      .getImage(
        markerKeys[
          district.id
        ]
      );

  if (selected) {
    ctx.beginPath();

    ctx.arc(
      x,
      y,
      20 +
        districtFx.flash *
          4,
      0,
      Math.PI *
        2
    );

    ctx.fillStyle =
      'rgba(255,191,45,0.22)';

    ctx.fill();
  }

  if (image) {
    ctx.drawImage(
      image,
      x - 16,
      y - 23,
      32,
      44
    );
  } else {
    ctx.beginPath();

    ctx.arc(
      x,
      y,
      8,
      0,
      Math.PI *
        2
    );

    ctx.fillStyle =
      COLORS.gold;

    ctx.fill();
  }

  const labelW =
    Math.max(
      63,
      31 +
        district.name.length *
          10
    );

  roundedRect(
    x + 8,
    y - 11,
    labelW,
    23,
    11,
    '#063C5B',
    '#F0BA37'
  );

  drawText(
    district.name +
      '  ›',
    x + 8 +
      labelW / 2,
    y + 0.5,
    7.6,
    '#F8FBFC',
    '800',
    'center'
  );

  addButton(
    'district:' +
      district.id,
    x - 20,
    y - 28,
    labelW + 42,
    56
  );
}

function startDistrictFx(
  districtId
) {
  animationManager
    .cancelGroup(
      'districtTap'
    );

  districtFx.id =
    districtId;

  districtFx.scale =
    0.86;

  districtFx.flash =
    1;

  animationManager.start({
    id:
      'district_tap_scale',

    group:
      'districtTap',

    from:
      0.86,

    to:
      1,

    duration:
      150,

    easing:
      'easeOutBack',

    onUpdate(value) {
      districtFx.scale =
        value;
    }
  });

  /*
   * 只闪一次。
   * 不再无限呼吸，
   * 避免持续整屏重绘。
   */
  animationManager.start({
    id:
      'district_tap_flash',

    group:
      'districtTap',

    from:
      1,

    to:
      0,

    duration:
      300,

    easing:
      'easeOutCubic',

    onUpdate(value) {
      districtFx.flash =
        value;
    },

    onComplete() {
      districtFx.scale =
        1;

      districtFx.flash =
        0;
    }
  });
}

/* =========================
   经营目标
========================= */

function drawNewsTicker() {
  const bulletin =
    simulationSystem
      .getBulletin();

  const x =
    8;

  const y =
    MAP_Y +
    7;

  const w =
    VIEW_W -
    16;

  const h =
    31;

  roundedRect(
    x,
    y,
    w,
    h,
    15,
    'rgba(3,40,62,0.92)',
    'rgba(73,192,239,0.52)'
  );

  drawText(
    '📣 城市通报',
    x + 13,
    y + 15.5,
    7,
    '#FFD66B',
    '800'
  );

  drawText(
    fitText(
      bulletin.title +
        '  ·  ' +
        bulletin.detail,
      w - 116,
      6.5,
      '600'
    ),
    x + 87,
    y + 15.5,
    6.5,
    '#F3FAFC',
    '600'
  );

  drawText(
    '›',
    x + w - 14,
    y + 15.5,
    14,
    '#FFE49C',
    '800',
    'center'
  );

  addButton(
    'tool:news',
    x,
    y,
    w,
    h
  );
}

/* =========================
   地图侧边按钮
========================= */

function drawToolButton() {
  return 0;
}

function drawSideTools() {
  // V18首页不再使用左右两排页游式大按钮。
}

/* =========================
   商圈信息卡
========================= */

function drawMetricChip(
  x,
  y,
  w,
  label,
  value,
  color
) {
  roundedRect(
    x,
    y,
    w,
    38,
    9,
    '#F7F4EE',
    'rgba(15,53,73,0.08)'
  );

  drawText(
    label,
    x + 8,
    y + 10,
    5.8,
    COLORS.muted,
    '700'
  );

  drawText(
    value,
    x + 8,
    y + 27,
    8.1,
    color,
    '800'
  );
}

function drawDistrictCard() {
  const x =
    CARD_X;

  const y =
    CARD_Y;

  const w =
    CARD_W;

  const h =
    CARD_H;

  roundedRect(
    x,
    y,
    w,
    h,
    16,
    'rgba(255,253,247,0.985)',
    'rgba(17,53,72,0.25)',
    1
  );

  if (
    !selectedDistrictId
  ) {
    drawText(
      '请选择一个商圈',
      18,
      y + 22,
      12.3,
      COLORS.text,
      '800'
    );

    drawText(
      '点击地图地点，查看经营数据与开店机会',
      18,
      y + 43,
      6.8,
      COLORS.muted,
      '600'
    );

    drawMetricChip(
      18,
      y + 58,
      108,
      '人口',
      '--',
      COLORS.blue
    );

    drawMetricChip(
      141,
      y + 58,
      108,
      '日需求',
      '--',
      COLORS.danger
    );

    drawMetricChip(
      264,
      y + 58,
      108,
      '客单价',
      '--',
      COLORS.green
    );

    return;
  }

  const district =
    citySystem
      .getDistrict(
        selectedDistrictId
      );

  if (!district) {
    return;
  }

  const currentDemand =
    demandSystem
      .getTotalDemand(
        district.id
      );

  const thumb =
    resourceManager
      .getImage(
        'city_header_thumb'
      );

  if (thumb) {
    drawImageFocus(
      ctx,
      thumb,
      x + 9,
      y + 9,
      91,
      h - 18,
      1.45,
      0.5,
      0.55
    );

    roundedRect(
      x + 9,
      y + 9,
      91,
      h - 18,
      11,
      null,
      'rgba(9,45,63,0.16)'
    );
  }

  drawText(
    district.name,
    x + 112,
    y + 22,
    13.4,
    COLORS.text,
    '800'
  );

  drawText(
    district.saturation >= 95
      ? '竞争激烈 · 仍需谨慎选址'
      : '客群活跃 · 仍有经营机会',
    x + 112,
    y + 42,
    6.3,
    district.saturation >= 95
      ? COLORS.danger
      : COLORS.blue,
    '600'
  );

  const metrics = [
    [
      '人口',
      district.population
        .toLocaleString(),
      COLORS.blue
    ],
    [
      '需求',
      currentDemand
        .toLocaleString(),
      COLORS.green
    ],
    [
      '客单',
      '¥' +
        district.avgSpend,
      COLORS.navy
    ],
    [
      '餐饮店',
      district.restaurantCount +
        '家',
      COLORS.navy
    ],
    [
      '饱和度',
      district.saturation +
        '%',
      district.saturation >= 95
        ? COLORS.danger
        : COLORS.blue
    ],
    [
      '租金',
      district.rentIndex
        .toFixed(
          2
        ),
      COLORS.navy
    ]
  ];

  for (
    let i = 0;
    i <
    metrics.length;
    i++
  ) {
    drawMetricChip(
      x + 111 +
        i * 43,
      y + 53,
      40,
      metrics[i][0],
      metrics[i][1],
      metrics[i][2]
    );
  }

  drawText(
    '实时数据会随人口、城市事件、竞争和租金变化',
    x + 112,
    y + 107,
    5.8,
    COLORS.muted,
    '600'
  );

  roundedRect(
    x + 263,
    y + h - 39,
    101,
    31,
    15,
    COLORS.gold,
    '#D99E22'
  );

  drawText(
    '进入商圈  ›',
    x + 313.5,
    y + h - 23.5,
    8,
    '#213541',
    '800',
    'center'
  );

  addButton(
    'district:details',
    x + 255,
    y + h - 45,
    117,
    44
  );
}

/* =========================
   底部导航
========================= */

function drawBottomNav() {
  const gradient =
    ctx.createLinearGradient(
      0,
      NAV_Y,
      0,
      VIEW_H
    );

  gradient.addColorStop(
    0,
    '#0A405E'
  );

  gradient.addColorStop(
    1,
    '#05263A'
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    NAV_Y,
    VIEW_W,
    NAV_H
  );

  ctx.fillStyle =
    'rgba(84,194,237,0.28)';

  ctx.fillRect(
    0,
    NAV_Y,
    VIEW_W,
    1
  );

  const current =
    sceneManager
      .getCurrentId();

  const cellW =
    VIEW_W /
    NAV_ITEMS.length;

  for (
    let i = 0;
    i <
    NAV_ITEMS.length;
    i++
  ) {
    const item =
      NAV_ITEMS[i];

    const cx =
      i * cellW +
      cellW / 2;

    const active =
      item.id ===
        current ||
      (
        item.id ===
          'city' &&
        current ===
          'district'
      ) ||
      (
        item.id ===
          'shop' &&
        (
          current ===
            'propertyMarket' ||
          current ===
            'equipment' ||
          current ===
            'license' ||
          current ===
            'staff'
        )
      ) ||
      (
        item.id ===
          'renovation' &&
        current ===
          'renovation'
      );

    if (
      active
    ) {
      roundedRect(
        i * cellW + 4,
        NAV_Y + 6,
        cellW - 8,
        NAV_H - 12,
        11,
        COLORS.gold,
        '#FFE09A'
      );
    }

    drawText(
      item.icon,
      cx,
      NAV_Y +
        NAV_H *
        0.34,
      10.2,
      active
        ? '#163445'
        : '#E7F1F4',
      '800',
      'center'
    );

    drawText(
      item.name,
      cx,
      NAV_Y +
        NAV_H *
        0.72,
      6.4,
      active
        ? '#153342'
        : '#E0EBEF',
      active
        ? '800'
        : '600',
      'center'
    );

    addButton(
      'nav:' +
        item.id,
      i * cellW,
      NAV_Y,
      cellW,
      NAV_H
    );
  }
}

/* =========================
   城市场景
========================= */

const cityScene = {
  id:
    'city',

  enter() {
  },

  exit() {
    animationManager
      .cancelGroup(
        'districtTap'
      );
  },

  update() {
  },

  render() {
    ctx.fillStyle =
      '#DDE5E1';

    ctx.fillRect(
      0,
      0,
      VIEW_W,
      VIEW_H
    );

    drawTopHud();

    drawMapBase();

    const districts =
      getDistricts();

    /*
     * V3：只画地点，
     * 不画任何区域多边形。
     */
    for (
      let i = 0;
      i <
      districts.length;
      i++
    ) {
      drawDistrictMarker(
        districts[i]
      );
    }

    drawNewsTicker();

    drawSideTools();

    drawDistrictCard();
  },

  handleTap(
    x,
    y,
    target
  ) {
    if (!target) {
      return false;
    }

    if (
      target.id.indexOf(
        'district:'
      ) ===
        0 &&
      target.id !==
        'district:details'
    ) {
      const districtId =
        target.id
          .split(':')[1];

      selectedDistrictId =
        districtId;

      citySystem
        .setCurrentDistrict(
          districtId
        );

      startDistrictFx(
        districtId
      );

      return true;
    }

    return false;
  }
};

/* =========================
   页面注册
========================= */

sceneManager.register(
  'city',
  cityScene
);

sceneManager.register(
  'shop',
  storeScene
);

sceneManager.register(
  'district',
  districtScene
);

sceneManager.register(
  'propertyMarket',
  propertyMarketScene
);

sceneManager.register(
  'renovation',
  renovationScene
);

sceneManager.register(
  'equipment',
  equipmentScene
);

sceneManager.register(
  'license',
  licenseScene
);

sceneManager.register(
  'staff',
  staffScene
);

sceneManager.register(
  'research',
  researchScene
);

sceneManager.register(
  'supply',
  supplyScene
);

sceneManager.register(
  'business',
  businessScene
);

/* =========================
   总渲染
========================= */

function render() {
  if (needsResize) {
    resizeCanvas();
  }

  buttons.length =
    0;

  ctx.clearRect(
    0,
    0,
    VIEW_W,
    VIEW_H
  );

  sceneManager
    .render(
      ctx
    );

  drawBottomNav();
}

runtime.requestRender =
  render;

/* =========================
   屏幕坐标转逻辑坐标
========================= */

function screenToDesign(
  x,
  y
) {
  return {
    x:
      x /
      scale,

    y:
      y /
      scale
  };
}

/* =========================
   点击检测
========================= */

function hitTest(
  x,
  y
) {
  for (
    let i =
      buttons.length -
      1;

    i >= 0;

    i--
  ) {
    const button =
      buttons[i];

    if (
      x >=
        button.x &&
      x <=
        button.x +
          button.w &&
      y >=
        button.y &&
      y <=
        button.y +
          button.h
    ) {
      return button;
    }
  }

  return null;
}

/* =========================
   时间按钮
========================= */

function handleTimeButton(
  id
) {
  if (
    id ===
    'time:pause'
  ) {
    timeSystem
      .togglePause();

    timeSystem
      .resetAccumulator();

    return true;
  }

  if (
    id.indexOf(
      'time:speed:'
    ) ===
    0
  ) {
    const value =
      Number(
        id
          .split(':')[2]
      );

    if (
      timeSystem
        .setSpeed(
          value
        )
    ) {
      if (
        timeSystem
          .isPaused()
      ) {
        timeSystem
          .resume();
      }

      timeSystem
        .resetAccumulator();

      return true;
    }
  }

  return false;
}

/* =========================
   总点击
========================= */

function handleTap(
  screenX,
  screenY
) {
  const point =
    screenToDesign(
      screenX,
      screenY
    );

  const target =
    hitTest(
      point.x,
      point.y
    );

  if (!target) {
    const scene =
      sceneManager
        .getCurrentScene();

    if (
      scene &&
      typeof scene.handleTap ===
        'function'
    ) {
      if (
        scene.handleTap(
          point.x,
          point.y,
          null
        )
      ) {
        render();
      }
    }

    return;
  }

  if (
    target.id.indexOf(
      'time:'
    ) ===
    0
  ) {
    if (
      handleTimeButton(
        target.id
      )
    ) {
      render();
    }

    return;
  }

  if (
    target.id ===
    'district:details'
  ) {
    const district =
      selectedDistrictId
        ? citySystem
            .getDistrict(
              selectedDistrictId
            )
        : null;

    if (district) {
      citySystem
        .setCurrentDistrict(
          district.id
        );

      if (
        sceneManager
          .switchTo(
            'district',
            {
              districtId:
                district.id
            }
          )
      ) {
        render();
      }
    }

    return;
  }

  if (
    target.id.indexOf(
      'tool:'
    ) ===
    0
  ) {
    const toolId =
      target.id
        .split(':')[1];

    if (
      toolId ===
      'news'
    ) {
      const bulletin =
        simulationSystem
          .getBulletin();

      showToast(
        bulletin.title +
        '：' +
        bulletin.detail
      );
    } else {
      showToast(
        '该城市功能已预留'
      );
    }

    return;
  }

  if (
    target.id.indexOf(
      'nav:'
    ) ===
    0
  ) {
    const sceneId =
      target.id
        .split(':')[1];

    if (
      sceneId ===
      'system'
    ) {
      showToast(
        '系统设置将在下一阶段接入'
      );

      return;
    }

    selectedDistrictId =
      null;

    animationManager
      .cancelGroup(
        'districtTap'
      );

    if (
      sceneManager
        .switchTo(
          sceneId
        )
    ) {
      render();
    }

    return;
  }

  const scene =
    sceneManager
      .getCurrentScene();

  if (
    scene &&
    typeof scene.handleTap ===
      'function'
  ) {
    if (
      scene.handleTap(
        point.x,
        point.y,
        target
      )
    ) {
      render();
    }
  }
}

/* =========================
   触摸监听
========================= */

if (
  api &&
  typeof api.onTouchEnd ===
    'function'
) {
  api.onTouchEnd(
    function (event) {
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
    }
  );
}

/* =========================
   游戏循环
========================= */

function scheduleNextFrame(
  callback
) {
  if (
    typeof requestAnimationFrame ===
    'function'
  ) {
    requestAnimationFrame(
      callback
    );

    return;
  }

  setTimeout(
    function () {
      callback(
        Date.now()
      );
    },
    33
  );
}

function gameLoop(
  timestamp
) {
  const now =
    typeof timestamp ===
      'number'
      ? timestamp
      : Date.now();

  if (
    lastFrameTime ===
    null
  ) {
    lastFrameTime =
      now;
  }

  const deltaMs =
    Math.max(
      0,
      now -
      lastFrameTime
    );

  lastFrameTime =
    now;

  sceneManager
    .update(
      deltaMs
    );

  const animationChanged =
    animationManager
      .update(
        deltaMs
      );

  const advancedMinutes =
    timeSystem
      .update(
        deltaMs
      );

  const simulationChanged =
    advancedMinutes >
      0
      ? simulationSystem
          .update(
            advancedMinutes
          )
      : false;

  if (
    advancedMinutes >
      0 ||
    simulationChanged ||
    animationChanged ||
    needsResize
  ) {
    render();
  }

  scheduleNextFrame(
    gameLoop
  );
}

/* =========================
   资源加载
========================= */

function loadResources() {
  return Promise.all([
    resourceManager
      .loadImage(
        'city_base_01',
        'assets/images/map/city_base_01.png',
        'city'
      ),

    resourceManager
      .loadImage(
        'ui_atlas_01',
        'assets/images/ui/ui_atlas_01_fixed.png',
        'ui'
      ),

    resourceManager
      .loadImage(
        'property_icons_01',
        'assets/images/ui/property_icons_01.png',
        'property'
      ),

    resourceManager
      .loadImage(
        'city_header_thumb',
        'assets/images/premium/district/header_city.jpg',
        'city'
      ),

    resourceManager
      .loadImage(
        'district_marker_gold',
        'assets/images/split/ui/marker_gold.png',
        'city'
      ),

    resourceManager
      .loadImage(
        'district_marker_blue',
        'assets/images/split/ui/marker_blue.png',
        'city'
      ),

    resourceManager
      .loadImage(
        'district_marker_orange',
        'assets/images/split/ui/marker_orange.png',
        'city'
      ),

    resourceManager
      .loadImage(
        'district_marker_purple',
        'assets/images/split/ui/marker_purple.png',
        'city'
      ),

    resourceManager
      .loadImage(
        'district_marker_green',
        'assets/images/split/ui/marker_green.png',
        'city'
      ),

    resourceManager
      .loadImage(
        'district_marker_red',
        'assets/images/split/ui/marker_red.png',
        'city'
      )
  ])
    .then(
      function () {
        buildMapCache();

        render();
      }
    )
    .catch(
      function (
        error
      ) {
        console.error(
          '资源加载失败',
          error
        );

        render();
      }
    );
}

/* =========================
   启动
========================= */

simulationSystem
  .initialize();

sceneManager
  .switchTo(
    'city'
  );

render();

loadResources();

scheduleNextFrame(
  gameLoop
);

console.log(
  '城市餐饮经营小游戏 V18 核心四页全量重构版启动成功'
);
