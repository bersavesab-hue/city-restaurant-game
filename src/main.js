'use strict';

// V20_HOME_REFERENCE_1TO1

// V19_CITY_HOME_POLISH

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

const openingPrepSystem =
  require('./opening/openingPrepSystem.js');

const textInput =
  require('./ui/textInput.js');

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
  {
    id: 'city',
    name: '城市',
    icon: 'city'
  },
  {
    id: 'shop',
    name: '门店',
    icon: 'shop'
  },
  {
    id: 'traffic',
    name: '客流',
    icon: 'traffic'
  },
  {
    id: 'research',
    name: '菜单',
    icon: 'research'
  },
  {
    id: 'supply',
    name: '供应链',
    icon: 'supply'
  },
  {
    id: 'business',
    name: '数据',
    icon: 'business'
  },
  {
    id: 'system',
    name: '系统',
    icon: 'system'
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

let trafficMode =
  false;

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

function getBrandState(
  player
) {
  const reputation =
    Math.max(
      0,
      Number(
        player &&
        player.reputation
      ) ||
      0
    );

  const thresholds = [
    0,
    80,
    200,
    420,
    760,
    1200,
    1800,
    2600,
    3600,
    5000
  ];

  let level =
    1;

  for (
    let i = 1;
    i <
    thresholds.length;
    i++
  ) {
    if (
      reputation >=
      thresholds[i]
    ) {
      level =
        i + 1;
    }
  }

  const currentIndex =
    Math.min(
      level - 1,
      thresholds.length - 1
    );

  const current =
    thresholds[
      currentIndex
    ];

  const next =
    thresholds[
      Math.min(
        currentIndex + 1,
        thresholds.length - 1
      )
    ];

  const progress =
    next <= current
      ? 1
      : Math.max(
          0,
          Math.min(
            1,
            (
              reputation -
              current
            ) /
            (
              next -
              current
            )
          )
        );

  return {
    level,
    reputation,
    progress
  };
}

function drawCityBadge(
  cityName,
  x,
  y,
  size
) {
  const image =
    resourceManager
      .getImage(
        'city_base_01'
      );

  roundedRect(
    x,
    y,
    size,
    size,
    10,
    '#FFFFFF',
    '#F6C64E',
    1.2
  );

  if (image) {
    ctx.save();

    roundedPath(
      ctx,
      x + 3,
      y + 3,
      size - 6,
      size - 6,
      8
    );

    ctx.clip();

    drawImageFocus(
      ctx,
      image,
      x + 3,
      y + 3,
      size - 6,
      size - 6,
      2.1,
      0.52,
      0.28
    );

    ctx.restore();
  } else {
    drawText(
      String(
        cityName ||
        '城'
      ).charAt(
        0
      ),
      x +
        size / 2,
      y +
        size / 2,
      15,
      '#0A3A57',
      '800',
      'center'
    );
  }
}


function drawWeatherGlyph(
  weather,
  x,
  y
) {
  ctx.save();

  const isRain =
    weather ===
      'rain' ||
    weather ===
      'heavyRain';

  const isCloud =
    weather ===
      'cloudy' ||
    isRain;

  ctx.fillStyle =
    '#FFD34D';

  ctx.beginPath();

  ctx.arc(
    x - 4,
    y - 3,
    5,
    0,
    Math.PI *
      2
  );

  ctx.fill();

  for (
    let i = 0;
    i < 8;
    i++
  ) {
    const a =
      i *
      Math.PI /
      4;

    ctx.strokeStyle =
      '#FFD34D';

    ctx.lineWidth =
      1.4;

    ctx.beginPath();

    ctx.moveTo(
      x - 4 +
        Math.cos(
          a
        ) *
          8,
      y - 3 +
        Math.sin(
          a
        ) *
          8
    );

    ctx.lineTo(
      x - 4 +
        Math.cos(
          a
        ) *
          11,
      y - 3 +
        Math.sin(
          a
        ) *
          11
    );

    ctx.stroke();
  }

  if (
    isCloud
  ) {
    ctx.fillStyle =
      '#EAF4F8';

    ctx.beginPath();

    ctx.arc(
      x + 2,
      y + 1,
      6,
      Math.PI,
      0
    );

    ctx.arc(
      x + 9,
      y,
      5,
      Math.PI,
      0
    );

    ctx.arc(
      x + 6,
      y + 3,
      6,
      0,
      Math.PI
    );

    ctx.closePath();

    ctx.fill();
  }

  if (
    isRain
  ) {
    ctx.strokeStyle =
      '#7ED8FF';

    ctx.lineWidth =
      1.5;

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      ctx.beginPath();

      ctx.moveTo(
        x +
          i * 5,
        y + 8
      );

      ctx.lineTo(
        x - 2 +
          i * 5,
        y + 12
      );

      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawCashGlyph(
  x,
  y
) {
  ctx.save();

  roundedRect(
    x - 11,
    y - 6,
    22,
    12,
    2,
    '#58B766',
    '#DDF6B2',
    1
  );

  roundedRect(
    x - 8,
    y - 9,
    22,
    12,
    2,
    '#78C96C',
    '#E8F7B8',
    1
  );

  drawText(
    '¥',
    x + 3,
    y - 3,
    7.4,
    '#F7FFCE',
    '800',
    'center'
  );

  ctx.restore();
}

function drawCrownGlyph(
  x,
  y
) {
  ctx.save();

  ctx.fillStyle =
    '#FFD557';

  ctx.strokeStyle =
    '#FFF0A8';

  ctx.lineWidth =
    1;

  ctx.beginPath();

  ctx.moveTo(
    x - 12,
    y + 6
  );

  ctx.lineTo(
    x - 9,
    y - 7
  );

  ctx.lineTo(
    x - 2,
    y
  );

  ctx.lineTo(
    x + 3,
    y - 10
  );

  ctx.lineTo(
    x + 9,
    y
  );

  ctx.lineTo(
    x + 13,
    y - 7
  );

  ctx.lineTo(
    x + 11,
    y + 6
  );

  ctx.closePath();

  ctx.fill();

  ctx.stroke();

  ctx.restore();
}

function getShopForDistrict(
  districtId
) {
  const business =
    gameState
      .getBusiness();

  if (
    !business ||
    !Array.isArray(
      business.shops
    )
  ) {
    return [];
  }

  return business.shops
    .filter(
      shop =>
        shop.districtId ===
        districtId
    );
}

function getDistrictVisualMeta(
  district
) {
  const descriptions = {
    university:
      '学生美食天堂',
    hightech:
      '白领聚餐首选',
    cbd:
      '高端餐饮聚集地',
    oldtown:
      '传统美食街',
    village:
      '烟火气十足',
    market:
      '传统市场焕发新活力',
    industry:
      '工作餐需求大'
  };

  const shops =
    getShopForDistrict(
      district.id
    );

  const demandDelta =
    Number(
      district
        .demandDeltaRatio
    ) ||
    0;

  let badge =
    '';

  let badgeColor =
    '#D93E36';

  if (
    district.saturation >=
      92
  ) {
    badge =
      '竞争激烈';
  } else if (
    demandDelta >=
      0.035
  ) {
    badge =
      '需求↑';
  } else if (
    district.rentIndex <=
      0.52
  ) {
    badge =
      '租金低';
  } else if (
    Number(
      district
        .populationDelta
    ) >
      20
  ) {
    badge =
      '人气高';
  } else if (
    demandDelta <=
      -0.035
  ) {
    badge =
      '需求↓';

    badgeColor =
      '#447FAD';
  }

  return {
    subtitle:
      descriptions[
        district.id
      ] ||
      '餐饮消费活跃',
    badge,
    badgeColor,
    myShopCount:
      shops.length
  };
}

function drawDistrictPictogram(
  districtId,
  x,
  y
) {
  ctx.save();

  ctx.strokeStyle =
    '#FFFFFF';

  ctx.fillStyle =
    '#FFFFFF';

  ctx.lineWidth =
    1.5;

  ctx.lineCap =
    'round';

  ctx.lineJoin =
    'round';

  if (
    districtId ===
    'university'
  ) {
    ctx.beginPath();
    ctx.moveTo(
      x - 5,
      y - 6
    );
    ctx.lineTo(
      x - 5,
      y + 6
    );
    ctx.moveTo(
      x - 8,
      y - 6
    );
    ctx.lineTo(
      x - 8,
      y - 1
    );
    ctx.moveTo(
      x - 2,
      y - 6
    );
    ctx.lineTo(
      x - 2,
      y - 1
    );
    ctx.moveTo(
      x + 5,
      y - 6
    );
    ctx.lineTo(
      x + 5,
      y + 6
    );
    ctx.stroke();
  } else if (
    districtId ===
    'hightech'
  ) {
    ctx.strokeRect(
      x - 7,
      y - 6,
      14,
      10
    );

    ctx.beginPath();

    ctx.moveTo(
      x,
      y + 4
    );

    ctx.lineTo(
      x,
      y + 8
    );

    ctx.moveTo(
      x - 4,
      y + 8
    );

    ctx.lineTo(
      x + 4,
      y + 8
    );

    ctx.stroke();
  } else if (
    districtId ===
    'cbd'
  ) {
    roundedRect(
      x - 5,
      y - 4,
      10,
      10,
      2,
      null,
      '#FFFFFF',
      1.5
    );

    ctx.beginPath();

    ctx.arc(
      x,
      y - 4,
      4,
      Math.PI,
      0
    );

    ctx.stroke();
  } else if (
    districtId ===
    'oldtown'
  ) {
    ctx.beginPath();

    ctx.moveTo(
      x - 7,
      y - 3
    );

    ctx.lineTo(
      x,
      y - 8
    );

    ctx.lineTo(
      x + 7,
      y - 3
    );

    ctx.stroke();

    ctx.strokeRect(
      x - 5,
      y - 3,
      10,
      10
    );
  } else if (
    districtId ===
    'village'
  ) {
    ctx.beginPath();

    ctx.moveTo(
      x - 7,
      y
    );

    ctx.lineTo(
      x,
      y - 7
    );

    ctx.lineTo(
      x + 7,
      y
    );

    ctx.stroke();

    ctx.strokeRect(
      x - 5,
      y,
      10,
      7
    );
  } else if (
    districtId ===
    'market'
  ) {
    ctx.strokeRect(
      x - 7,
      y - 1,
      14,
      8
    );

    ctx.beginPath();

    ctx.moveTo(
      x - 8,
      y - 1
    );

    ctx.lineTo(
      x - 5,
      y - 7
    );

    ctx.lineTo(
      x + 5,
      y - 7
    );

    ctx.lineTo(
      x + 8,
      y - 1
    );

    ctx.stroke();
  } else {
    ctx.strokeRect(
      x - 7,
      y - 1,
      14,
      8
    );

    ctx.beginPath();

    ctx.moveTo(
      x - 5,
      y - 1
    );

    ctx.lineTo(
      x - 5,
      y - 7
    );

    ctx.moveTo(
      x + 1,
      y - 1
    );

    ctx.lineTo(
      x + 1,
      y - 9
    );

    ctx.moveTo(
      x + 5,
      y - 1
    );

    ctx.lineTo(
      x + 5,
      y - 5
    );

    ctx.stroke();
  }

  ctx.restore();
}

function getHomeGoalState() {
  const business =
    gameState
      .getBusiness();

  if (
    !business.hasShop ||
    !Array.isArray(
      business.shops
    ) ||
    business.shops.length ===
      0
  ) {
    const process =
      business.propertyProcess ||
      {
        visits: {},
        negotiations: {},
        leases: {}
      };

    const visitCount =
      Object.keys(
        process.visits ||
        {}
      ).length;

    const negotiationCount =
      Object.keys(
        process.negotiations ||
        {}
      ).length;

    let current =
      selectedDistrictId
        ? 1
        : 0;

    if (
      visitCount >
      0
    ) {
      current =
        Math.max(
          current,
          2
        );
    }

    if (
      negotiationCount >
      0
    ) {
      current =
        Math.max(
          current,
          3
        );
    }

    return {
      title:
        '开设首店',
      steps: [
        '选址',
        '看铺',
        '谈判',
        '签约',
        '装修'
      ],
      current,
      completed:
        false
    };
  }

  const shop =
    business.shops.find(
      item =>
        item.id ===
        business.currentShopId
    ) ||
    business.shops[0];

  const readiness =
    openingPrepSystem
      .getReadiness(
        shop.id
      );

  let current =
    1;

  if (
    readiness
      .renovationReady
  ) {
    current =
      2;
  }

  if (
    readiness
      .permitsReady
  ) {
    current =
      3;
  }

  if (
    readiness
      .staffingReady
  ) {
    current =
      4;
  }

  if (
    readiness.ready ||
    shop.status ===
      'open'
  ) {
    current =
      5;
  }

  return {
    title:
      shop.status ===
        'open'
        ? '稳定经营'
        : '筹备首店',
    steps: [
      '签约',
      '装修',
      '证照',
      '招聘',
      '营业'
    ],
    current,
    completed:
      shop.status ===
      'open'
  };
}

function drawGoalBar() {
  const goal =
    getHomeGoalState();

  const x =
    8;

  const y =
    MAP_Y +
    43;

  const w =
    VIEW_W -
    16;

  const h =
    30;

  roundedRect(
    x,
    y,
    w,
    h,
    15,
    'rgba(3,40,62,0.94)',
    'rgba(73,192,239,0.48)'
  );

  drawText(
    '◎',
    x + 15,
    y + 15,
    13,
    '#FFD85C',
    '800',
    'center'
  );

  drawText(
    '当前目标：',
    x + 29,
    y + 15,
    6.8,
    '#FFD85C',
    '800'
  );

  drawText(
    goal.title,
    x + 76,
    y + 15,
    7.1,
    '#FFFFFF',
    '800'
  );

  const startX =
    x + 150;

  const available =
    w - 185;

  const gap =
    available /
    Math.max(
      1,
      goal.steps.length -
        1
    );

  for (
    let i = 0;
    i <
    goal.steps.length;
    i++
  ) {
    const cx =
      startX +
      i *
        gap;

    const done =
      i <
      goal.current;

    const active =
      i ===
      goal.current &&
      !goal.completed;

    ctx.beginPath();

    ctx.arc(
      cx,
      y + 11,
      5.5,
      0,
      Math.PI *
        2
    );

    ctx.fillStyle =
      done
        ? '#F2C744'
        : active
          ? '#FFF8CF'
          : 'rgba(225,239,244,0.18)';

    ctx.fill();

    ctx.strokeStyle =
      done ||
      active
        ? '#FFE58B'
        : '#9DB8C5';

    ctx.lineWidth =
      1;

    ctx.stroke();

    if (
      i <
      goal.steps.length -
        1
    ) {
      ctx.strokeStyle =
        i <
        goal.current
          ? '#F2C744'
          : 'rgba(178,205,218,0.48)';

      ctx.lineWidth =
        1.2;

      ctx.beginPath();

      ctx.moveTo(
        cx + 7,
        y + 11
      );

      ctx.lineTo(
        cx +
          gap -
          7,
        y + 11
      );

      ctx.stroke();
    }

    drawText(
      goal.steps[i],
      cx,
      y + 24,
      5.2,
      done ||
      active
        ? '#FFE595'
        : '#D7E6EC',
      done ||
      active
        ? '800'
        : '600',
      'center'
    );
  }

  drawText(
    '🎁',
    x +
      w -
      15,
    y + 15,
    10,
    '#FFE280',
    '700',
    'center'
  );

  addButton(
    'goal:current',
    x,
    y,
    w,
    h
  );
}

function selectBusiestDistrict() {
  const districts =
    getDistricts();

  let best =
    null;

  let bestDemand =
    -1;

  for (
    let i = 0;
    i <
    districts.length;
    i++
  ) {
    const demand =
      demandSystem
        .getTotalDemand(
          districts[i].id
        );

    if (
      demand >
      bestDemand
    ) {
      bestDemand =
        demand;

      best =
        districts[i];
    }
  }

  if (best) {
    selectedDistrictId =
      best.id;

    citySystem
      .setCurrentDistrict(
        best.id
      );

    startDistrictFx(
      best.id
    );
  }

  return best;
}

function drawTrafficOverlay() {
  if (!trafficMode) {
    return;
  }

  const districts =
    getDistricts();

  const demands =
    districts.map(
      item =>
        demandSystem
          .getTotalDemand(
            item.id
          )
    );

  const maxDemand =
    Math.max(
      1,
      ...demands
    );

  for (
    let i = 0;
    i <
    districts.length;
    i++
  ) {
    const district =
      districts[i];

    const point =
      getDistrictPoint(
        district.id
      );

    if (!point) {
      continue;
    }

    const ratio =
      demands[i] /
      maxDemand;

    const radius =
      17 +
      ratio *
        18;

    const glow =
      ctx.createRadialGradient(
        point.x,
        point.y,
        2,
        point.x,
        point.y,
        radius
      );

    glow.addColorStop(
      0,
      ratio > 0.72
        ? 'rgba(255,167,47,0.42)'
        : 'rgba(65,191,235,0.34)'
    );

    glow.addColorStop(
      1,
      'rgba(55,168,218,0)'
    );

    ctx.fillStyle =
      glow;

    ctx.beginPath();

    ctx.arc(
      point.x,
      point.y,
      radius,
      0,
      Math.PI *
        2
    );

    ctx.fill();

    roundedRect(
      point.x - 22,
      point.y + 24,
      44,
      16,
      8,
      'rgba(5,50,72,0.88)',
      'rgba(255,224,122,0.45)'
    );

    drawText(
      String(
        demands[i]
      ),
      point.x,
      point.y + 32,
      5.8,
      '#FFF5C2',
      '800',
      'center'
    );
  }

  roundedRect(
    13,
    MAP_Y + 79,
    92,
    22,
    11,
    'rgba(4,45,67,0.90)',
    'rgba(255,218,96,0.56)'
  );

  drawText(
    '客流热力模式',
    59,
    MAP_Y + 90,
    6.4,
    '#FFE084',
    '800',
    'center'
  );
}

function drawMetricSymbol(
  ctxLabel,
  x,
  y,
  color
) {
  ctx.save();

  ctx.strokeStyle =
    color;

  ctx.fillStyle =
    color;

  ctx.lineWidth =
    1.4;

  if (
    ctxLabel ===
    '人口'
  ) {
    ctx.beginPath();
    ctx.arc(
      x - 4,
      y - 3,
      3,
      0,
      Math.PI *
        2
    );
    ctx.arc(
      x + 4,
      y - 3,
      3,
      0,
      Math.PI *
        2
    );
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      x - 4,
      y + 5,
      5,
      Math.PI,
      0
    );
    ctx.arc(
      x + 4,
      y + 5,
      5,
      Math.PI,
      0
    );
    ctx.fill();
  } else if (
    ctxLabel ===
    '需求'
  ) {
    ctx.fillRect(
      x - 7,
      y + 1,
      3,
      7
    );

    ctx.fillRect(
      x - 1,
      y - 3,
      3,
      11
    );

    ctx.fillRect(
      x + 5,
      y - 8,
      3,
      16
    );
  } else if (
    ctxLabel ===
    '客单'
  ) {
    ctx.beginPath();

    ctx.ellipse(
      x,
      y - 5,
      7,
      3,
      0,
      0,
      Math.PI *
        2
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
      x - 7,
      y - 5
    );

    ctx.lineTo(
      x - 7,
      y + 6
    );

    ctx.moveTo(
      x + 7,
      y - 5
    );

    ctx.lineTo(
      x + 7,
      y + 6
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.ellipse(
      x,
      y + 6,
      7,
      3,
      0,
      0,
      Math.PI
    );

    ctx.stroke();
  } else if (
    ctxLabel ===
    '餐饮店'
  ) {
    ctx.strokeRect(
      x - 7,
      y - 1,
      14,
      9
    );

    ctx.beginPath();
    ctx.moveTo(
      x - 8,
      y - 1
    );
    ctx.lineTo(
      x - 5,
      y - 7
    );
    ctx.lineTo(
      x + 5,
      y - 7
    );
    ctx.lineTo(
      x + 8,
      y - 1
    );
    ctx.stroke();
  } else if (
    ctxLabel ===
    '饱和度'
  ) {
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      7,
      0,
      Math.PI *
        2
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      x,
      y
    );
    ctx.lineTo(
      x,
      y - 7
    );
    ctx.lineTo(
      x + 6,
      y + 3
    );
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(
      x - 7,
      y
    );
    ctx.lineTo(
      x,
      y - 7
    );
    ctx.lineTo(
      x + 7,
      y
    );
    ctx.stroke();

    ctx.strokeRect(
      x - 5,
      y,
      10,
      7
    );
  }

  ctx.restore();
}

function drawDistrictThumb(
  districtId,
  x,
  y,
  w,
  h
) {
  const image =
    resourceManager
      .getImage(
        'city_base_01'
      );

  const layout =
    DISTRICT_LAYOUT[
      districtId
    ] ||
    {
      x: 0.5,
      y: 0.5
    };

  ctx.save();

  roundedPath(
    ctx,
    x,
    y,
    w,
    h,
    11
  );

  ctx.clip();

  if (image) {
    drawImageFocus(
      ctx,
      image,
      x,
      y,
      w,
      h,
      2.6,
      Math.max(
        0.08,
        Math.min(
          0.92,
          layout.x
        )
      ),
      Math.max(
        0.08,
        Math.min(
          0.92,
          layout.y
        )
      )
    );

    const shade =
      ctx.createLinearGradient(
        x,
        y,
        x,
        y + h
      );

    shade.addColorStop(
      0,
      'rgba(5,37,55,0.02)'
    );

    shade.addColorStop(
      1,
      'rgba(5,37,55,0.28)'
    );

    ctx.fillStyle =
      shade;

    ctx.fillRect(
      x,
      y,
      w,
      h
    );
  } else {
    ctx.fillStyle =
      '#D9E8E7';

    ctx.fillRect(
      x,
      y,
      w,
      h
    );
  }

  ctx.restore();

  roundedRect(
    x,
    y,
    w,
    h,
    11,
    null,
    'rgba(8,48,67,0.18)',
    1
  );
}

function drawNavIcon(
  id,
  cx,
  cy,
  active
) {
  const color =
    active
      ? '#173545'
      : '#E7F2F5';

  ctx.save();

  ctx.strokeStyle =
    color;

  ctx.fillStyle =
    color;

  ctx.lineWidth =
    1.8;

  ctx.lineCap =
    'round';

  ctx.lineJoin =
    'round';

  if (
    id ===
    'city'
  ) {
    ctx.strokeRect(
      cx - 10,
      cy - 6,
      7,
      13
    );

    ctx.strokeRect(
      cx - 1,
      cy - 10,
      8,
      17
    );

    ctx.strokeRect(
      cx + 9,
      cy - 3,
      5,
      10
    );

    ctx.fillRect(
      cx + 1,
      cy - 6,
      2,
      2
    );

    ctx.fillRect(
      cx + 1,
      cy - 1,
      2,
      2
    );
  } else if (
    id ===
    'shop'
  ) {
    ctx.strokeRect(
      cx - 11,
      cy - 4,
      22,
      12
    );

    ctx.beginPath();
    ctx.moveTo(
      cx - 12,
      cy - 4
    );
    ctx.lineTo(
      cx - 9,
      cy - 10
    );
    ctx.lineTo(
      cx + 9,
      cy - 10
    );
    ctx.lineTo(
      cx + 12,
      cy - 4
    );
    ctx.stroke();

    for (
      let i = -6;
      i <= 6;
      i += 6
    ) {
      ctx.beginPath();
      ctx.moveTo(
        cx + i,
        cy - 10
      );
      ctx.lineTo(
        cx + i,
        cy - 4
      );
      ctx.stroke();
    }

    ctx.strokeRect(
      cx - 3,
      cy + 1,
      6,
      7
    );
  } else if (
    id ===
    'traffic'
  ) {
    ctx.beginPath();
    ctx.arc(
      cx - 6,
      cy - 4,
      3,
      0,
      Math.PI *
        2
    );
    ctx.arc(
      cx + 5,
      cy - 3,
      3,
      0,
      Math.PI *
        2
    );
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      cx - 6,
      cy + 5,
      5,
      Math.PI,
      0
    );
    ctx.arc(
      cx + 5,
      cy + 6,
      5,
      Math.PI,
      0
    );
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(
      cx - 12,
      cy + 11
    );
    ctx.lineTo(
      cx + 12,
      cy + 11
    );
    ctx.stroke();
  } else if (
    id ===
    'research'
  ) {
    ctx.beginPath();
    ctx.arc(
      cx - 1,
      cy,
      8,
      0,
      Math.PI *
        2
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      cx + 9,
      cy - 10
    );
    ctx.lineTo(
      cx + 4,
      cy + 10
    );
    ctx.moveTo(
      cx + 13,
      cy - 9
    );
    ctx.lineTo(
      cx + 8,
      cy + 10
    );
    ctx.stroke();
  } else if (
    id ===
    'supply'
  ) {
    ctx.strokeRect(
      cx - 12,
      cy - 7,
      14,
      11
    );

    ctx.beginPath();
    ctx.moveTo(
      cx + 2,
      cy - 4
    );
    ctx.lineTo(
      cx + 8,
      cy - 4
    );
    ctx.lineTo(
      cx + 12,
      cy
    );
    ctx.lineTo(
      cx + 12,
      cy + 4
    );
    ctx.lineTo(
      cx + 2,
      cy + 4
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(
      cx - 6,
      cy + 7,
      2.4,
      0,
      Math.PI *
        2
    );
    ctx.arc(
      cx + 8,
      cy + 7,
      2.4,
      0,
      Math.PI *
        2
    );
    ctx.stroke();
  } else if (
    id ===
    'business'
  ) {
    ctx.fillRect(
      cx - 11,
      cy + 1,
      4,
      8
    );

    ctx.fillRect(
      cx - 3,
      cy - 4,
      4,
      13
    );

    ctx.fillRect(
      cx + 5,
      cy - 9,
      4,
      18
    );

    ctx.beginPath();
    ctx.moveTo(
      cx - 12,
      cy + 10
    );
    ctx.lineTo(
      cx + 12,
      cy + 10
    );
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      5.5,
      0,
      Math.PI *
        2
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      1.7,
      0,
      Math.PI *
        2
    );
    ctx.fill();

    for (
      let i = 0;
      i < 8;
      i++
    ) {
      const a =
        i *
        Math.PI /
        4;

      ctx.beginPath();

      ctx.moveTo(
        cx +
          Math.cos(
            a
          ) *
          7,
        cy +
          Math.sin(
            a
          ) *
          7
      );

      ctx.lineTo(
        cx +
          Math.cos(
            a
          ) *
          10,
        cy +
          Math.sin(
            a
          ) *
          10
      );

      ctx.stroke();
    }
  }

  ctx.restore();
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

  const cityImage =
    resourceManager
      .getImage(
        'city_base_01'
      );

  if (cityImage) {
    drawImageFocus(
      ctx,
      cityImage,
      0,
      0,
      VIEW_W,
      TOP_H,
      1.48,
      0.52,
      0.17
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

  drawCityBadge(
    cityName,
    10,
    8 +
      SAFE_TOP,
    45
  );

  drawText(
    fitText(
      cityName,
      87,
      15.5,
      '800'
    ),
    65,
    20 +
      SAFE_TOP,
    15.5,
    COLORS.white,
    '800'
  );

  roundedRect(
    145,
    12 +
      SAFE_TOP,
    18,
    18,
    5,
    'rgba(4,49,72,0.74)',
    'rgba(255,255,255,0.24)'
  );

  drawText(
    '✎',
    154,
    21 +
      SAFE_TOP,
    7.4,
    '#FFE08B',
    '800',
    'center'
  );

  addButton(
    'city:rename',
    140,
    7 +
      SAFE_TOP,
    28,
    28
  );

  drawText(
    '打造属于你的美食帝国',
    65,
    42 +
      SAFE_TOP,
    7.1,
    '#E1EEF3',
    '600'
  );

  drawWeatherGlyph(
    world.weather,
    190,
    24 +
      SAFE_TOP
  );

  drawText(
    WEATHER_NAMES[
      world.weather
    ] ||
    '晴',
    211,
    20 +
      SAFE_TOP,
    6.9,
    '#FFFFFF',
    '700',
    'center'
  );

  drawText(
    Number.isFinite(
      Number(
        world.temperature
      )
    )
      ? world.temperature +
        '℃'
      : '--℃',
    211,
    40 +
      SAFE_TOP,
    6.6,
    '#DDECF1',
    '600',
    'center'
  );

  roundedRect(
    231,
    8 +
      SAFE_TOP,
    94,
    47,
    12,
    'rgba(5,43,65,0.90)',
    'rgba(114,208,244,0.44)'
  );

  drawCashGlyph(
    247,
    25 +
      SAFE_TOP
  );

  drawText(
    fitText(
      '¥' +
        player.cash
          .toLocaleString(),
      61,
      10.8,
      '800'
    ),
    278,
    22 +
      SAFE_TOP,
    10.8,
    '#FFF1A7',
    '800',
    'center'
  );

  drawText(
    '可用资金',
    278,
    42 +
      SAFE_TOP,
    6.2,
    '#D9E9EF',
    '600',
    'center'
  );

  roundedRect(
    309,
    16 +
      SAFE_TOP,
    11,
    11,
    4,
    '#F5B62D',
    '#FFE598'
  );

  drawText(
    '+',
    314.5,
    21.5 +
      SAFE_TOP,
    8,
    '#FFFFFF',
    '800',
    'center'
  );

  const brand =
    getBrandState(
      player
    );

  roundedRect(
    330,
    8 +
      SAFE_TOP,
    51,
    47,
    12,
    'rgba(5,43,65,0.90)',
    'rgba(114,208,244,0.44)'
  );

  drawCrownGlyph(
    343,
    24 +
      SAFE_TOP
  );

  drawText(
    'Lv.' +
      brand.level,
    361,
    21 +
      SAFE_TOP,
    7.8,
    '#FFE27D',
    '800',
    'center'
  );

  roundedRect(
    339,
    41 +
      SAFE_TOP,
    34,
    3,
    1.5,
    'rgba(255,255,255,0.22)'
  );

  roundedRect(
    339,
    41 +
      SAFE_TOP,
    Math.max(
      3,
      34 *
        brand.progress
    ),
    3,
    1.5,
    COLORS.gold
  );

  drawText(
    brand.reputation +
      '/' +
      Math.max(
        100,
        Math.ceil(
          (
            brand.reputation +
            1
          ) /
          100
        ) *
          100
      ),
    356,
    50 +
      SAFE_TOP,
    4.9,
    '#E7F2F6',
    '600',
    'center'
  );

  addButton(
    'brand:status',
    327,
    5 +
      SAFE_TOP,
    57,
    53
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
      28;

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
            ) ===
              speed
          );

    const x =
      12 +
      i *
        45;

    roundedRect(
      x,
      y,
      39,
      21,
      8,
      active
        ? COLORS.gold
        : 'rgba(4,40,60,0.84)',
      active
        ? '#FFE38D'
        : 'rgba(255,255,255,0.20)'
    );

    drawText(
      speedItems[i][1],
      x +
        19.5,
      y +
        10.5,
      8,
      active
        ? '#173444'
        : COLORS.white,
      '800',
      'center'
    );

    addButton(
      id,
      x -
        3,
      y -
        5,
      45,
      31
    );
  }

  drawText(
    fitText(
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
      148,
      6.5,
      '600'
    ),
    377,
    y +
      10.5,
    6.5,
    '#E5F0F4',
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

  const meta =
    getDistrictVisualMeta(
      district
    );

  const animated =
    districtFx.id ===
      district.id;

  const markerScale =
    animated
      ? districtFx.scale
      : 1;

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
      23 +
        districtFx.flash *
          5,
      0,
      Math.PI *
        2
    );

    ctx.fillStyle =
      'rgba(255,195,54,0.24)';

    ctx.fill();
  }

  ctx.save();

  ctx.translate(
    x,
    y
  );

  ctx.scale(
    markerScale,
    markerScale
  );

  if (image) {
    ctx.drawImage(
      image,
      -18,
      -27,
      36,
      50
    );
  } else {
    ctx.beginPath();

    ctx.arc(
      0,
      0,
      10,
      0,
      Math.PI *
        2
    );

    ctx.fillStyle =
      COLORS.gold;

    ctx.fill();
  }

  drawDistrictPictogram(
    district.id,
    0,
    -8
  );

  ctx.restore();

  const boxW =
    Math.max(
      81,
      Math.min(
        102,
        43 +
          district.name.length *
            11
      )
    );

  const preferLeft =
    x >
    VIEW_W *
      0.62;

  let boxX =
    preferLeft
      ? x -
        boxW -
        11
      : x +
        11;

  boxX =
    Math.max(
      5,
      Math.min(
        VIEW_W -
          boxW -
          5,
        boxX
      )
    );

  let boxY =
    y -
      15;

  boxY =
    Math.max(
      MAP_Y +
        82,
      Math.min(
        CARD_Y -
          54,
        boxY
      )
    );

  roundedRect(
    boxX,
    boxY,
    boxW,
    27,
    11,
    '#073E5D',
    selected
      ? '#FFE06C'
      : '#F1C34A',
    selected
      ? 1.4
      : 1
  );

  drawText(
    district.name,
    boxX + 11,
    boxY + 13.5,
    8.7,
    '#FFFFFF',
    '800'
  );

  drawText(
    '›',
    boxX +
      boxW -
      10,
    boxY +
      13.5,
    11,
    '#FFE49C',
    '800',
    'center'
  );

  roundedRect(
    boxX + 6,
    boxY + 27,
    boxW - 12,
    18,
    7,
    'rgba(255,253,247,0.96)',
    'rgba(11,55,76,0.13)'
  );

  drawText(
    fitText(
      meta.subtitle,
      boxW - 20,
      5.5,
      '700'
    ),
    boxX +
      boxW /
        2,
    boxY + 36,
    5.5,
    '#23455B',
    '700',
    'center'
  );

  if (
    meta.badge
  ) {
    const badgeW =
      Math.max(
        35,
        17 +
          meta.badge.length *
            6
      );

    const badgeX =
      Math.max(
        5,
        Math.min(
          VIEW_W -
            badgeW -
            5,
          boxX +
            boxW -
            badgeW +
            5
        )
      );

    roundedRect(
      badgeX,
      boxY - 7,
      badgeW,
      17,
      8,
      meta.badgeColor,
      '#FFF2C8'
    );

    drawText(
      meta.badge,
      badgeX +
        badgeW /
          2,
      boxY +
        1.5,
      5.4,
      '#FFFFFF',
      '800',
      'center'
    );
  }

  if (
    meta.myShopCount >
      0
  ) {
    const textValue =
      meta.myShopCount >
        1
        ? (
            '✓ 我的店×' +
            meta.myShopCount
          )
        : '✓ 我的店';

    const shopW =
      meta.myShopCount >
        1
        ? 54
        : 43;

    const sx =
      Math.max(
        5,
        Math.min(
          VIEW_W -
            shopW -
            5,
          boxX +
            boxW -
            shopW +
            8
        )
      );

    roundedRect(
      sx,
      boxY - 27,
      shopW,
      17,
      8,
      '#1E9A5E',
      '#B9F0C8'
    );

    drawText(
      textValue,
      sx +
        shopW /
          2,
      boxY - 18.5,
      5.2,
      '#FFFFFF',
      '800',
      'center'
    );
  }

  const hitLeft =
    Math.min(
      x - 20,
      boxX - 3
    );

  const hitRight =
    Math.max(
      x + 20,
      boxX +
        boxW +
        3
    );

  const hitTop =
    Math.min(
      y - 31,
      boxY - 29
    );

  const hitBottom =
    Math.max(
      y + 25,
      boxY + 49
    );

  addButton(
    'district:' +
      district.id,
    hitLeft,
    hitTop,
    hitRight -
      hitLeft,
    hitBottom -
      hitTop
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
  const feed =
    simulationSystem
      .getNewsFeed();

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
    'rgba(3,40,62,0.94)',
    'rgba(73,192,239,0.56)'
  );

  drawText(
    '📣',
    x + 16,
    y + 15.5,
    10,
    '#FFD65A',
    '800',
    'center'
  );

  drawText(
    '城市通报',
    x + 31,
    y + 15.5,
    7,
    '#FFD65A',
    '800'
  );

  const items =
    (
      feed &&
      feed.length
        ? feed
        : [
            bulletin
          ]
    )
    .slice(
      0,
      3
    );

  const startX =
    x + 85;

  const sectionW =
    (
      w -
      112
    ) /
    Math.max(
      1,
      items.length
    );

  for (
    let i = 0;
    i <
    items.length;
    i++
  ) {
    const item =
      items[i];

    if (
      i >
      0
    ) {
      ctx.fillStyle =
        'rgba(230,242,247,0.34)';

      ctx.fillRect(
        startX +
          i *
            sectionW -
          5,
        y + 8,
        1,
        15
      );
    }

    drawText(
      fitText(
        item &&
        item.title
          ? item.title
          : '城市运行平稳',
        sectionW - 10,
        6,
        '600'
      ),
      startX +
        i *
          sectionW,
      y + 15.5,
      6,
      '#F3FAFC',
      '600'
    );
  }

  drawText(
    '›',
    x +
      w -
      13,
    y +
      15.5,
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
    'rgba(255,253,247,0.988)',
    'rgba(17,53,72,0.22)',
    1
  );

  if (
    !selectedDistrictId
  ) {
    drawText(
      trafficMode
        ? '请选择一个客流热点'
        : '请选择一个商圈',
      18,
      y + 22,
      12.3,
      COLORS.text,
      '800'
    );

    drawText(
      trafficMode
        ? '地图热力显示实时餐饮需求，点击热点查看详细数据'
        : '点击地图地点，查看经营数据与开店机会',
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
      '需求',
      '--',
      COLORS.green
    );

    drawMetricChip(
      264,
      y + 58,
      108,
      '客单',
      '--',
      COLORS.navy
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

  drawDistrictThumb(
    district.id,
    x + 8,
    y + 8,
    95,
    h - 16
  );

  const meta =
    getDistrictVisualMeta(
      district
    );

  roundedRect(
    x + 113,
    y + 11,
    22,
    22,
    11,
    '#F2A51F',
    '#FFD964'
  );

  drawDistrictPictogram(
    district.id,
    x + 124,
    y + 22
  );

  drawText(
    fitText(
      district.name,
      126,
      13.4,
      '800'
    ),
    x + 142,
    y + 22,
    13.4,
    '#0D3760',
    '800'
  );

  drawText(
    fitText(
      meta.subtitle +
        ' · ' +
        (
          district.saturation >=
            90
            ? '竞争较高'
            : '仍有经营机会'
        ),
      190,
      6.1,
      '600'
    ),
    x + 142,
    y + 42,
    6.1,
    '#4776A0',
    '600'
  );

  const metrics = [
    [
      '人口',
      district.population
        .toLocaleString(),
      '#1769AE'
    ],
    [
      '需求',
      currentDemand
        .toLocaleString(),
      '#15924C'
    ],
    [
      '客单',
      '¥' +
        district.avgSpend,
      '#164A86'
    ],
    [
      '餐饮店',
      district.restaurantCount +
        '家',
      '#164A86'
    ],
    [
      '饱和度',
      district.saturation +
        '%',
      '#1E76C5'
    ],
    [
      '租金',
      district.rentIndex
        .toFixed(
          2
        ),
      '#164A86'
    ]
  ];

  const metricX =
    x + 111;

  const metricY =
    y + 54;

  const metricGap =
    3;

  const metricW =
    (
      w -
      121 -
      metricGap *
        5
    ) /
    6;

  for (
    let i = 0;
    i <
    metrics.length;
    i++
  ) {
    const mx =
      metricX +
      i *
        (
          metricW +
          metricGap
        );

    roundedRect(
      mx,
      metricY,
      metricW,
      48,
      9,
      '#F8F5EF',
      'rgba(17,62,92,0.10)'
    );

    drawMetricSymbol(
      metrics[i][0],
      mx +
        metricW /
          2,
      metricY + 11,
      metrics[i][2]
    );

    drawText(
      metrics[i][0],
      mx +
        metricW /
          2,
      metricY + 27,
      5.5,
      '#245276',
      '700',
      'center'
    );

    drawText(
      metrics[i][1],
      mx +
        metricW /
          2,
      metricY + 41,
      6.9,
      metrics[i][2],
      '800',
      'center'
    );
  }

  drawText(
    trafficMode
      ? '客流热力会随时间、天气、事件与消费时段实时变化'
      : '实时数据会随人口、城市事件、竞争和租金变化',
    x + 112,
    y + h - 18,
    5.7,
    '#50718A',
    '600'
  );

  roundedRect(
    x + w - 115,
    y + h - 43,
    104,
    34,
    17,
    '#FFC22D',
    '#DFA01B',
    1.2
  );

  drawText(
    '进入商圈  ›',
    x +
      w -
      63,
    y +
      h -
      26,
    8.2,
    '#123A53',
    '800',
    'center'
  );

  addButton(
    'district:details',
    x + w - 121,
    y + h - 48,
    116,
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
    '#0B4A70'
  );

  gradient.addColorStop(
    1,
    '#052A42'
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
    'rgba(75,191,239,0.36)';

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
      i *
        cellW +
      cellW /
        2;

    const active =
      (
        item.id ===
          'city' &&
        current ===
          'city' &&
        !trafficMode
      ) ||
      (
        item.id ===
          'traffic' &&
        current ===
          'city' &&
        trafficMode
      ) ||
      (
        item.id ===
          'shop' &&
        (
          current ===
            'shop' ||
          current ===
            'propertyMarket' ||
          current ===
            'equipment' ||
          current ===
            'license' ||
          current ===
            'staff' ||
          current ===
            'renovation'
        )
      ) ||
      (
        item.id ===
          current
      );

    if (
      active
    ) {
      const fill =
        ctx.createLinearGradient(
          0,
          NAV_Y + 6,
          0,
          VIEW_H - 6
        );

      fill.addColorStop(
        0,
        '#FFE066'
      );

      fill.addColorStop(
        1,
        '#F2B22A'
      );

      roundedRect(
        i *
          cellW +
          4,
        NAV_Y + 6,
        cellW - 8,
        NAV_H - 12,
        11,
        fill,
        '#FFE79B',
        1.2
      );
    }

    drawNavIcon(
      item.id,
      cx,
      NAV_Y +
        NAV_H *
          0.34,
      active
    );

    drawText(
      item.name,
      cx,
      NAV_Y +
        NAV_H *
          0.73,
      6.5,
      active
        ? '#173545'
        : '#EEF7FA',
      active
        ? '800'
        : '600',
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

    drawNewsTicker();

    drawGoalBar();

    drawTrafficOverlay();

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

    if (
      target.id ===
      'city:rename'
    ) {
      textInput
        .requestText({
          title:
            '修改城市名称',
          value:
            gameState
              .getCityName(),
          placeholder:
            '请输入城市名称',
          maxLength:
            8
        })
        .then(
          value => {
            if (!value) {
              return;
            }

            if (
              gameState
                .setCityName(
                  value
                )
            ) {
              textInput
                .requestRender();
            }
          }
        );

      return true;
    }

    if (
      target.id ===
      'brand:status'
    ) {
      const brand =
        getBrandState(
          gameState
            .getPlayer()
        );

      showToast(
        '品牌等级 Lv.' +
          brand.level +
          ' · 声望 ' +
          brand.reputation
      );

      return true;
    }

    if (
      target.id ===
      'goal:current'
    ) {
      const business =
        gameState
          .getBusiness();

      if (
        business.hasShop &&
        business.shops.length
      ) {
        sceneManager
          .switchTo(
            'shop'
          );

        return true;
      }

      if (
        !selectedDistrictId
      ) {
        selectBusiestDistrict();

        return true;
      }

      sceneManager
        .switchTo(
          'district',
          {
            districtId:
              selectedDistrictId
          }
        );

      return true;
    }

    return false;
  }
};

/* =========================
   页面注册    return false;
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

      if (
        bulletin &&
        bulletin.districtId &&
        citySystem
          .getDistrict(
            bulletin.districtId
          )
      ) {
        selectedDistrictId =
          bulletin.districtId;

        citySystem
          .setCurrentDistrict(
            bulletin.districtId
          );

        startDistrictFx(
          bulletin.districtId
        );
      }

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
      'traffic'
    ) {
      trafficMode =
        true;

      if (
        sceneManager
          .getCurrentId() !==
        'city'
      ) {
        sceneManager
          .switchTo(
            'city'
          );
      }

      if (
        !selectedDistrictId
      ) {
        selectBusiestDistrict();
      }

      render();

      return;
    }

    if (
      sceneId ===
      'city'
    ) {
      trafficMode =
        false;

      selectedDistrictId =
        null;

      animationManager
        .cancelGroup(
          'districtTap'
        );

      if (
        sceneManager
          .getCurrentId() !==
        'city'
      ) {
        sceneManager
          .switchTo(
            'city'
          );
      }

      render();

      return;
    }

    if (
      sceneId ===
      'system'
    ) {
      showToast(
        '系统设置将在下一阶段接入'
      );

      return;
    }

    trafficMode =
      false;

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
  '城市餐饮经营小游戏 V20 主页目标图一比一版启动成功'
);
