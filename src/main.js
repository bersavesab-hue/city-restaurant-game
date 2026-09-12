'use strict';

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
  {
    id: 'city',
    name: '城市',
    icon: '城'
  },

  {
    id: 'shop',
    name: '门店',
    icon: '店'
  },

  {
    id: 'research',
    name: '菜品',
    icon: '研'
  },

  {
    id: 'supply',
    name: '供应链',
    icon: '供'
  },

  {
    id: 'business',
    name: '数据',
    icon: '数'
  },

  {
    id: 'system',
    name: '系统',
    icon: '设'
  }
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
    VIEW_H < 740
      ? 84
      : 90;

  NAV_H =
    VIEW_H < 740
      ? 60
      : 64;

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
      ? 116
      : 126;

  CARD_X = 8;
  CARD_W = VIEW_W - 16;

  CARD_Y =
    NAV_Y -
    CARD_H -
    8;
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
      2,
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

  ctx.font =
    (
      weight ||
      '500'
    ) +
    ' ' +
    size +
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

  ctx.font =
    (
      weight ||
      '500'
    ) +
    ' ' +
    size +
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
  buttons.push({
    id,
    x,
    y,
    w,
    h
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
  if (
    !drawAtlas(
      'hud',
      0,
      0,
      VIEW_W,
      TOP_H
    )
  ) {
    const gradient =
      ctx.createLinearGradient(
        0,
        0,
        0,
        TOP_H
      );

    gradient.addColorStop(
      0,
      '#163F59'
    );

    gradient.addColorStop(
      1,
      '#09293D'
    );

    ctx.fillStyle =
      gradient;

    ctx.fillRect(
      0,
      0,
      VIEW_W,
      TOP_H
    );
  }

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
    cityName ===
    '未命名城市'
  ) {
    cityName =
      '城市名称';
  }

  drawText(
    cityName,
    14,
    18,
    17,
    COLORS.white,
    '700'
  );

  drawText(
    '一座有味道的城市',
    14,
    39,
    9,
    'rgba(255,255,255,0.70)',
    '500'
  );

  drawText(
    display.date,
    164,
    13,
    9,
    '#E9F0F4',
    '600'
  );

  drawText(
    display.time,
    164,
    33,
    20,
    COLORS.white,
    '700'
  );

  const weather =
    WEATHER_NAMES[
      world.weather
    ] ||
    '更新中';

  const temperatureText =
    Number.isFinite(
      Number(
        world.temperature
      )
    )
      ? ' ' +
        world.temperature +
        '℃'
      : '';

  drawText(
    weather +
      temperatureText,
    164,
    53,
    10,
    '#E9F0F4',
    '600'
  );

  drawText(
    '¥ ' +
      player.cash
        .toLocaleString(),
    376,
    19,
    18,
    '#FFF1C2',
    '700',
    'right'
  );

  drawText(
    '品牌 Lv.1',
    376,
    43,
    10,
    '#F4F1E8',
    '600',
    'right'
  );

  roundedRect(
    306,
    55,
    68,
    7,
    4,
    'rgba(255,255,255,0.16)'
  );

  roundedRect(
    306,
    55,
    Math.max(
      7,
      Math.min(
        68,
        (
          player.reputation /
          100
        ) *
        68
      )
    ),
    7,
    4,
    COLORS.gold
  );

  const paused =
    timeSystem
      .isPaused();

  const speed =
    timeSystem
      .getSpeed();

  const speedItems = [
    [
      'time:pause',
      paused
        ? '▶'
        : 'Ⅱ',
      202
    ],

    [
      'time:speed:1',
      '1×',
      235
    ],

    [
      'time:speed:2',
      '2×',
      268
    ],

    [
      'time:speed:5',
      '5×',
      301
    ],

    [
      'time:speed:10',
      '10×',
      334
    ]
  ];

  const buttonY =
    TOP_H -
    23;

  for (
    let i = 0;
    i <
    speedItems.length;
    i++
  ) {
    const item =
      speedItems[i];

    const id =
      item[0];

    const label =
      item[1];

    const x =
      item[2];

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

    roundedRect(
      x,
      buttonY,
      29,
      19,
      6,

      active
        ? 'rgba(240,173,52,0.97)'
        : 'rgba(255,255,255,0.10)',

      active
        ? '#FFD886'
        : 'rgba(255,255,255,0.16)'
    );

    drawText(
      label,
      x + 14.5,
      buttonY + 9.5,
      9,
      COLORS.white,
      '700',
      'center'
    );

    addButton(
      id,
      x - 1,
      buttonY - 2,
      31,
      23
    );
  }

  drawText(
    MEAL_NAMES[
      display.mealPeriod
    ] ||
    '',
    193,
    buttonY + 9.5,
    9,
    '#DCEAF1',
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

  const animated =
    districtFx.id ===
    district.id;

  const markerScale =
    animated
      ? districtFx.scale
      : 1;

  const color =
    getDistrictColor(
      district
    );

  ctx.save();

  ctx.translate(
    x,
    y
  );

  ctx.scale(
    markerScale,
    markerScale
  );

  if (selected) {
    ctx.beginPath();

    ctx.arc(
      0,
      0,
      14 +
        districtFx.flash *
        4,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      hexToRgba(
        color,
        0.16 +
          districtFx.flash *
          0.12
      );

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      12,
      0,
      Math.PI * 2
    );

    ctx.strokeStyle =
      'rgba(255,255,255,0.92)';

    ctx.lineWidth =
      1.2;

    ctx.stroke();
  }

  /*
   * 外圈
   */
  ctx.beginPath();

  ctx.arc(
    0,
    0,
    selected
      ? 8
      : 7,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    'rgba(10,38,55,0.90)';

  ctx.fill();

  ctx.strokeStyle =
    'rgba(255,255,255,0.92)';

  ctx.lineWidth =
    1.5;

  ctx.stroke();

  /*
   * 内点
   */
  ctx.beginPath();

  ctx.arc(
    0,
    0,
    selected
      ? 3.8
      : 3.2,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    color;

  ctx.fill();

  ctx.restore();

  /*
   * 标签也缩小，
   * 不再使用大白色胶囊。
   */
  const labelW =
    Math.max(
      38,
      district.name.length *
        10 +
        10
    );

  const labelY =
    y +
    11;

  roundedRect(
    x -
      labelW / 2,
    labelY,
    labelW,
    18,
    6,

    selected
      ? 'rgba(9,37,54,0.94)'
      : 'rgba(9,37,54,0.72)',

    selected
      ? 'rgba(255,220,140,0.60)'
      : null
  );

  drawText(
    district.name,
    x,
    labelY + 9,
    8,
    COLORS.white,
    '700',
    'center'
  );

  /*
   * 视觉很小，
   * 点击区域仍然保持足够大，
   * 手机操作不会难点。
   */
  addButton(
    'district:' +
      district.id,

    x - 24,
    y - 22,
    48,
    54
  );
}

/* =========================
   点击反馈
========================= */

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
    10;

  const y =
    MAP_Y +
    9;

  const w =
    VIEW_W -
    20;

  const h =
    VIEW_H <
    740
      ? 42
      : 46;

  const severityColor =
    bulletin.severity ===
      'warning'
      ? COLORS.danger
      : bulletin.severity ===
          'good'
        ? COLORS.green
        : COLORS.gold;

  roundedRect(
    x,
    y,
    w,
    h,
    12,
    'rgba(8,35,50,0.93)',
    'rgba(255,255,255,0.18)'
  );

  roundedRect(
    x + 7,
    y + 7,
    4,
    h - 14,
    2,
    severityColor
  );

  drawText(
    '城市通报',
    x + 20,
    y + 14,
    8.5,
    severityColor,
    '700'
  );

  drawText(
    fitText(
      bulletin.title,
      w - 112,
      9.5,
      '700'
    ),
    x + 76,
    y + 14,
    9.5,
    COLORS.white,
    '700'
  );

  drawText(
    fitText(
      bulletin.detail,
      w - 45,
      8,
      '500'
    ),
    x + 20,
    y + 31,
    8,
    'rgba(255,255,255,0.78)',
    '500'
  );

  drawText(
    '›',
    x + w - 14,
    y + h / 2,
    18,
    '#FFE3A3',
    '700',
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

function drawToolButton(
  x,
  y,
  item
) {
  const size =
    VIEW_H <
    740
      ? 39
      : 42;

  if (
    !drawAtlas(
      'side',
      x,
      y,
      size,
      size
    )
  ) {
    roundedRect(
      x,
      y,
      size,
      size,
      10,
      'rgba(8,33,49,0.88)',
      'rgba(255,255,255,0.18)'
    );
  }

  drawText(
    item.icon,
    x + size / 2,
    y + 13,
    12,
    '#F7EACD',
    '700',
    'center'
  );

  drawText(
    item.label,
    x + size / 2,
    y + 29,
    8.2,
    COLORS.white,
    '600',
    'center'
  );

  addButton(
    'tool:' +
      item.id,
    x,
    y,
    size,
    size
  );

  return size;
}

function drawSideTools() {
  const top =
    MAP_Y +
    78;

  const gap =
    VIEW_H <
    740
      ? 45
      : 48;

  for (
    let i = 0;
    i <
    LEFT_TOOLS.length;
    i++
  ) {
    drawToolButton(
      7,
      top +
        i * gap,
      LEFT_TOOLS[i]
    );
  }

  for (
    let i = 0;
    i <
    RIGHT_TOOLS.length;
    i++
  ) {
    const size =
      VIEW_H <
      740
        ? 39
        : 42;

    drawToolButton(
      VIEW_W -
        size -
        7,
      top +
        i * gap,
      RIGHT_TOOLS[i]
    );
  }
}

/* =========================
   商圈信息卡
========================= */

function drawMetricChip(
  x,
  y,
  w,
  icon,
  label,
  value,
  color
) {
  const h =
    38;

  roundedRect(
    x,
    y,
    w,
    h,
    9,
    'rgba(255,255,255,0.48)'
  );

  drawText(
    icon,
    x + 14,
    y + 14,
    12,
    color,
    '700',
    'center'
  );

  drawText(
    label,
    x + 27,
    y + 10,
    8,
    COLORS.muted,
    '600'
  );

  drawText(
    value,
    x + 27,
    y + 25,
    10,
    COLORS.text,
    '700'
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

  if (
    !drawAtlas(
      'card',
      x,
      y,
      w,
      h
    )
  ) {
    roundedRect(
      x,
      y,
      w,
      h,
      15,
      'rgba(248,244,235,0.97)',
      'rgba(22,51,67,0.42)',
      1.2
    );
  }

  if (
    !selectedDistrictId
  ) {
    drawText(
      '●',
      29,
      y + 24,
      15,
      COLORS.navy,
      '700',
      'center'
    );

    drawText(
      '请选择一个区域',
      47,
      y + 22,
      15,
      COLORS.text,
      '700'
    );

    drawText(
      '点击地图地点查看经营数据',
      47,
      y + 41,
      9,
      COLORS.muted,
      '500'
    );

    const chipY =
      y +
      58;

    drawMetricChip(
      16,
      chipY,
      110,
      '人',
      '人口',
      '--',
      COLORS.blue
    );

    drawMetricChip(
      140,
      chipY,
      110,
      '餐',
      '需求',
      '--',
      COLORS.danger
    );

    drawMetricChip(
      264,
      chipY,
      110,
      '¥',
      '客单',
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

  drawText(
    district.name,
    17,
    y + 21,
    16,
    COLORS.text,
    '700'
  );

  drawText(
    '市场饱和 ' +
      district.saturation +
      '%',
    17,
    y + 41,
    9,

    district.saturation >=
      simulationConfig
        .city
        .saturatedThreshold
      ? COLORS.danger
      : COLORS.muted,

    '600'
  );

  roundedRect(
    295,
    y + 10,
    74,
    29,
    9,
    COLORS.gold
  );

  drawText(
    '查看详情 ›',
    332,
    y + 24.5,
    8.5,
    '#26343B',
    '700',
    'center'
  );

  addButton(
    'district:details',
    290,
    y + 6,
    84,
    36
  );

  const chipY =
    y +
    53;

  const populationTrend =
    district.populationDelta >
      0
      ? ' ↑'
      : district.populationDelta <
          0
        ? ' ↓'
        : '';

  const demandTrend =
    district.demandDeltaRatio >
      0.005
      ? ' ↑'
      : district.demandDeltaRatio <
          -0.005
        ? ' ↓'
        : '';

  drawMetricChip(
    16,
    chipY,
    110,
    '人',
    '活跃人口',
    district.population
      .toLocaleString() +
      populationTrend,
    COLORS.blue
  );

  drawMetricChip(
    140,
    chipY,
    110,
    '餐',
    MEAL_NAMES[
      timeSystem
        .getMealPeriod()
    ] +
      '需求',
    currentDemand
      .toLocaleString() +
      demandTrend,
    COLORS.danger
  );

  drawMetricChip(
    264,
    chipY,
    110,
    '¥',
    '客单',
    '¥' +
      district.avgSpend,
    COLORS.green
  );

  drawText(
    '餐饮店 ' +
      district.restaurantCount +
      '家',
    17,
    y + h - 14,
    8,
    COLORS.muted,
    '600'
  );

  drawText(
    '租金指数 ' +
      district.rentIndex
        .toFixed(2),
    135,
    y + h - 14,
    8,
    COLORS.muted,
    '600'
  );

  drawText(
    district.saturation >=
      simulationConfig
        .city
        .competitionBands
        .extreme
      ? '高度饱和'
      : district.saturation >=
          simulationConfig
            .city
            .competitionBands
            .high
        ? '竞争激烈'
        : '仍有空间',
    366,
    y + h - 14,
    8,

    district.saturation >=
      85
      ? COLORS.danger
      : COLORS.green,

    '700',
    'right'
  );
}

/* =========================
   底部导航
========================= */

function drawBottomNav() {
  if (
    !drawAtlas(
      'nav',
      0,
      NAV_Y,
      VIEW_W,
      NAV_H
    )
  ) {
    ctx.fillStyle =
      COLORS.navy2;

    ctx.fillRect(
      0,
      NAV_Y,
      VIEW_W,
      NAV_H
    );
  }

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
      i *
        cellW +
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
        current ===
          'propertyMarket'
      );

    if (active) {
      if (
        !drawAtlas(
          'navActive',
          i *
            cellW +
            4,
          NAV_Y +
            4,
          cellW -
            8,
          NAV_H -
            8
        )
      ) {
        roundedRect(
          i *
            cellW +
            4,
          NAV_Y +
            4,
          cellW -
            8,
          NAV_H -
            8,
          11,
          COLORS.gold
        );
      }
    }

    drawText(
      item.icon,
      cx,
      NAV_Y +
        NAV_H *
        0.35,
      15,

      active
        ? '#23323A'
        : COLORS.white,

      '700',
      'center'
    );

    drawText(
      item.name,
      cx,
      NAV_Y +
        NAV_H *
        0.73,
      8.5,

      active
        ? '#23323A'
        : '#E3E9EC',

      active
        ? '700'
        : '500',

      'center'
    );

    addButton(
      'nav:' +
        item.id,
      i *
        cellW,
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
  '城市餐饮经营小游戏 V6 商圈详情与门店分流版启动成功'
);
