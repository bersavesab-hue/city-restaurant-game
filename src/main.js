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

/* V21_HOME_ICON_POLISH */

const V21_DISTRICT_ICON_KEYS = {
  university: 'v21_district_university',
  hightech: 'v21_district_hightech',
  cbd: 'v21_district_cbd',
  oldtown: 'v21_district_oldtown',
  village: 'v21_district_village',
  market: 'v21_district_market',
  industry: 'v21_district_industry'
};

const V21_NAV_ICON_KEYS = {
  city: 'v21_nav_city',
  shop: 'v21_nav_store',
  traffic: 'v21_nav_traffic',
  research: 'v21_nav_menu',
  supply: 'v21_nav_supply',
  business: 'v21_nav_data',
  system: 'v21_nav_system'
};

const V21_METRIC_ICON_KEYS = {
  '人口': 'v21_metric_population',
  '需求': 'v21_metric_demand',
  '客单': 'v21_metric_spend',
  '餐饮店': 'v21_metric_restaurants',
  '饱和度': 'v21_metric_saturation',
  '租金': 'v21_metric_rent'
};

function v21DrawImage(key, cx, cy, w, h, alpha) {
  const image = resourceManager.getImage(key);
  if (!image) return false;

  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.drawImage(
    image,
    cx - w / 2,
    cy - h / 2,
    w,
    h
  );
  ctx.restore();
  return true;
}

const v21OriginalDrawWeatherGlyph = drawWeatherGlyph;
const v21OriginalDrawCashGlyph = drawCashGlyph;
const v21OriginalDrawCrownGlyph = drawCrownGlyph;
const v21OriginalDrawMetricSymbol = drawMetricSymbol;
const v21OriginalDrawNavIcon = drawNavIcon;

updateLayout = function () {
  TOP_H = (VIEW_H < 740 ? 92 : 96) + SAFE_TOP;
  NAV_H = (VIEW_H < 740 ? 56 : 60) + SAFE_BOTTOM;

  MAP_X = 0;
  MAP_Y = TOP_H;
  MAP_W = VIEW_W;

  NAV_Y = VIEW_H - NAV_H;
  MAP_H = NAV_Y - MAP_Y;

  CARD_H = VIEW_H < 740 ? 124 : 136;
  CARD_X = 7;
  CARD_W = VIEW_W - 14;
  CARD_Y = NAV_Y - CARD_H - 6;
};

drawWeatherGlyph = function (weather, x, y) {
  if (v21DrawImage('v21_hud_weather', x, y, 28, 28)) return;
  return v21OriginalDrawWeatherGlyph(weather, x, y);
};

drawCashGlyph = function (x, y) {
  if (v21DrawImage('v21_hud_money', x, y, 27, 27)) return;
  return v21OriginalDrawCashGlyph(x, y);
};

drawCrownGlyph = function (x, y) {
  if (v21DrawImage('v21_hud_crown', x, y, 24, 24)) return;
  return v21OriginalDrawCrownGlyph(x, y);
};

drawMetricSymbol = function (label, x, y, color) {
  const key = V21_METRIC_ICON_KEYS[label];
  if (key && v21DrawImage(key, x, y, 17, 17)) return;

  return v21OriginalDrawMetricSymbol(
    label,
    x,
    y,
    color
  );
};

drawNavIcon = function (id, cx, cy, active) {
  const key = V21_NAV_ICON_KEYS[id];
  if (
    key &&
    v21DrawImage(
      key,
      cx,
      cy,
      active ? 25 : 23,
      active ? 25 : 23,
      active ? 1 : 0.9
    )
  ) {
    return;
  }

  return v21OriginalDrawNavIcon(
    id,
    cx,
    cy,
    active
  );
};

drawDistrictMarker = function (district) {
  const point = getDistrictPoint(district.id);
  if (!point) return;

  const x = point.x;
  const y = point.y;
  const selected = selectedDistrictId === district.id;
  const meta = getDistrictVisualMeta(district);

  const animated = districtFx.id === district.id;
  const markerScale = animated ? districtFx.scale : 1;

  if (selected) {
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      19 + districtFx.flash * 4,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255,195,54,0.20)';
    ctx.fill();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(markerScale, markerScale);

  const key = V21_DISTRICT_ICON_KEYS[district.id];
  if (!key || !v21DrawImage(key, 0, -4, 31, 40)) {
    drawDistrictPictogram(district.id, 0, -5);
  }

  ctx.restore();

  const boxW = Math.max(
    70,
    Math.min(
      91,
      38 + district.name.length * 9
    )
  );

  const preferLeft = x > VIEW_W * 0.64;

  let boxX = preferLeft
    ? x - boxW - 9
    : x + 9;

  boxX = Math.max(
    5,
    Math.min(
      VIEW_W - boxW - 5,
      boxX
    )
  );

  let boxY = y - 13;

  boxY = Math.max(
    MAP_Y + 73,
    Math.min(
      CARD_Y - 44,
      boxY
    )
  );

  roundedRect(
    boxX,
    boxY,
    boxW,
    23,
    9,
    'rgba(5,53,79,0.96)',
    selected
      ? '#FFE06C'
      : 'rgba(255,218,93,0.78)',
    selected ? 1.3 : 0.9
  );

  drawText(
    district.name,
    boxX + 9,
    boxY + 11.5,
    7.7,
    '#FFFFFF',
    '800'
  );

  drawText(
    '›',
    boxX + boxW - 8,
    boxY + 11.5,
    9.5,
    '#FFE49C',
    '800',
    'center'
  );

  roundedRect(
    boxX + 5,
    boxY + 23,
    boxW - 10,
    15,
    6,
    'rgba(255,253,247,0.96)',
    'rgba(11,55,76,0.11)'
  );

  drawText(
    fitText(
      meta.subtitle,
      boxW - 16,
      4.9,
      '700'
    ),
    boxX + boxW / 2,
    boxY + 30.5,
    4.9,
    '#23455B',
    '700',
    'center'
  );

  if (meta.badge) {
    const badgeW = Math.max(
      31,
      14 + meta.badge.length * 5.2
    );

    const badgeX = Math.max(
      5,
      Math.min(
        VIEW_W - badgeW - 5,
        boxX + boxW - badgeW + 3
      )
    );

    roundedRect(
      badgeX,
      boxY - 6,
      badgeW,
      14,
      7,
      meta.badgeColor,
      'rgba(255,245,218,0.96)'
    );

    drawText(
      meta.badge,
      badgeX + badgeW / 2,
      boxY + 1,
      4.8,
      '#FFFFFF',
      '800',
      'center'
    );
  }

  if (meta.myShopCount > 0) {
    const textValue =
      meta.myShopCount > 1
        ? '✓ 我的店×' + meta.myShopCount
        : '✓ 我的店';

    const shopW =
      meta.myShopCount > 1
        ? 49
        : 39;

    const sx = Math.max(
      5,
      Math.min(
        VIEW_W - shopW - 5,
        boxX + boxW - shopW + 6
      )
    );

    roundedRect(
      sx,
      boxY - 22,
      shopW,
      14,
      7,
      '#1E9A5E',
      '#B9F0C8'
    );

    drawText(
      textValue,
      sx + shopW / 2,
      boxY - 15,
      4.6,
      '#FFFFFF',
      '800',
      'center'
    );
  }

  const hitLeft = Math.min(x - 18, boxX - 3);
  const hitRight = Math.max(x + 18, boxX + boxW + 3);
  const hitTop = Math.min(y - 25, boxY - 24);
  const hitBottom = Math.max(y + 20, boxY + 41);

  addButton(
    'district:' + district.id,
    hitLeft,
    hitTop,
    hitRight - hitLeft,
    hitBottom - hitTop
  );
};

const v21OriginalLoadResources = loadResources;

loadResources = function () {
  const assets = [
    ['v21_hud_city', 'hud_city.png'],
    ['v21_hud_weather', 'hud_weather.png'],
    ['v21_hud_money', 'hud_money.png'],
    ['v21_hud_plus', 'hud_plus.png'],
    ['v21_hud_crown', 'hud_crown.png'],
    ['v21_hud_bulletin', 'hud_bulletin.png'],
    ['v21_hud_goal', 'hud_goal.png'],
    ['v21_hud_reward', 'hud_reward.png'],

    ['v21_district_university', 'district_university.png'],
    ['v21_district_hightech', 'district_hightech.png'],
    ['v21_district_cbd', 'district_cbd.png'],
    ['v21_district_oldtown', 'district_oldtown.png'],
    ['v21_district_village', 'district_village.png'],
    ['v21_district_market', 'district_market.png'],
    ['v21_district_industry', 'district_industry.png'],

    ['v21_metric_population', 'metric_population.png'],
    ['v21_metric_demand', 'metric_demand.png'],
    ['v21_metric_spend', 'metric_spend.png'],
    ['v21_metric_restaurants', 'metric_restaurants.png'],
    ['v21_metric_saturation', 'metric_saturation.png'],
    ['v21_metric_rent', 'metric_rent.png'],

    ['v21_nav_city', 'nav_city.png'],
    ['v21_nav_store', 'nav_store.png'],
    ['v21_nav_traffic', 'nav_traffic.png'],
    ['v21_nav_menu', 'nav_menu.png'],
    ['v21_nav_supply', 'nav_supply.png'],
    ['v21_nav_data', 'nav_data.png'],
    ['v21_nav_system', 'nav_system.png']
  ];

  const tasks = [];

  for (let i = 0; i < assets.length; i++) {
    tasks.push(
      resourceManager.loadImage(
        assets[i][0],
        'assets/images/v21/' + assets[i][1],
        'v21-ui'
      )
    );
  }

  return Promise
    .all(tasks)
    .then(function () {
      return v21OriginalLoadResources();
    });
};

console.log('V21_HOME_ICON_POLISH loaded');

/* V22_HOME_MATCH */

const V22_DISTRICT_POINT_RATIOS = {
  university: { x: 0.22, y: 0.24 },
  hightech: { x: 0.81, y: 0.25 },
  cbd: { x: 0.56, y: 0.44 },
  oldtown: { x: 0.12, y: 0.57 },
  village: { x: 0.43, y: 0.64 },
  market: { x: 0.18, y: 0.80 },
  industry: { x: 0.81, y: 0.57 }
};

const v22OriginalDrawMapBase = drawMapBase;
const v22OriginalDrawTopHud = drawTopHud;
const v22OriginalDrawNewsTicker = drawNewsTicker;
const v22OriginalDrawGoalBar = drawGoalBar;
const v22OriginalDrawDistrictCard = drawDistrictCard;
const v22OriginalDrawBottomNav = drawBottomNav;
const v22OriginalDrawDistrictMarker = drawDistrictMarker;

function v22EnsureSelectedDistrict() {
  const districts = getDistricts();
  if (!districts || !districts.length) return null;

  let current = null;
  for (let i = 0; i < districts.length; i++) {
    if (districts[i].id === selectedDistrictId) {
      current = districts[i];
      break;
    }
  }

  if (current) return current;

  const preferred = districts.find(function (item) {
    return item.id === 'market';
  });

  current = preferred || districts[0];
  if (current) {
    selectedDistrictId = current.id;
  }
  return current;
}

function v22GetDistrictPoint(districtId) {
  const ratio = V22_DISTRICT_POINT_RATIOS[districtId];
  if (!ratio) {
    return getDistrictPoint(districtId);
  }

  const top = MAP_Y + 96;
  const bottom = CARD_Y - 62;
  const usableH = Math.max(120, bottom - top);

  return {
    x: Math.round(MAP_X + MAP_W * ratio.x),
    y: Math.round(top + usableH * ratio.y)
  };
}

updateLayout = function () {
  TOP_H = (VIEW_H < 740 ? 94 : 98) + SAFE_TOP;
  NAV_H = (VIEW_H < 740 ? 58 : 62) + SAFE_BOTTOM;

  MAP_X = 0;
  MAP_Y = TOP_H;
  MAP_W = VIEW_W;

  NAV_Y = VIEW_H - NAV_H;
  MAP_H = NAV_Y - MAP_Y;

  CARD_H = VIEW_H < 740 ? 126 : 138;
  CARD_X = 7;
  CARD_W = VIEW_W - 14;
  CARD_Y = NAV_Y - CARD_H - 5;
};

drawMapBase = function () {
  const image = resourceManager.getImage('city_base_01');
  if (!image) {
    return v22OriginalDrawMapBase();
  }

  drawImageFocus(
    ctx,
    image,
    MAP_X,
    MAP_Y,
    MAP_W,
    MAP_H,
    1.64,
    0.56,
    0.55
  );

  const topFade = ctx.createLinearGradient(0, MAP_Y, 0, MAP_Y + 110);
  topFade.addColorStop(0, 'rgba(8,45,70,0.26)');
  topFade.addColorStop(1, 'rgba(8,45,70,0.02)');
  ctx.fillStyle = topFade;
  ctx.fillRect(MAP_X, MAP_Y, MAP_W, 110);

  const mapTint = ctx.createLinearGradient(0, MAP_Y, 0, CARD_Y - 8);
  mapTint.addColorStop(0, 'rgba(24,118,170,0.03)');
  mapTint.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = mapTint;
  ctx.fillRect(MAP_X, MAP_Y, MAP_W, CARD_Y - MAP_Y);
};

drawTopHud = function () {
  const player = gameState.getPlayer();
  const world = gameState.getWorld();
  const display = timeSystem.getDisplayState();
  const brand = getBrandState(player);

  let cityName = gameState.getCityName();
  if (!cityName || cityName === '未命名城市') cityName = '云州市';

  const cityImage = resourceManager.getImage('city_base_01');
  if (cityImage) {
    drawImageFocus(ctx, cityImage, 0, 0, VIEW_W, TOP_H, 1.58, 0.55, 0.16);
    ctx.fillStyle = 'rgba(4,35,58,0.58)';
    ctx.fillRect(0, 0, VIEW_W, TOP_H);
  } else {
    ctx.fillStyle = COLORS.navy;
    ctx.fillRect(0, 0, VIEW_W, TOP_H);
  }

  drawCityBadge(cityName, 10, 8 + SAFE_TOP, 44);

  drawText(fitText(cityName, 112, 18, '800'), 66, 19 + SAFE_TOP, 18, COLORS.white, '800');

  roundedRect(145, 11 + SAFE_TOP, 18, 18, 5, 'rgba(4,49,72,0.74)', 'rgba(255,255,255,0.24)');
  drawText('✎', 154, 20 + SAFE_TOP, 7.3, '#FFE08B', '800', 'center');
  addButton('city:rename', 140, 6 + SAFE_TOP, 28, 28);

  drawText('打造属于你的美食之都', 66, 40 + SAFE_TOP, 7.2, '#E7F0F5', '600');

  drawWeatherGlyph(world.weather, 187, 24 + SAFE_TOP);
  drawText(WEATHER_NAMES[world.weather] || '多云', 210, 17 + SAFE_TOP, 7.8, '#FFFFFF', '800', 'center');
  drawText(
    (Number.isFinite(Number(world.temperature)) ? world.temperature : 22) + '℃',
    210,
    35 + SAFE_TOP,
    7.8,
    '#E9F4F8',
    '700',
    'center'
  );

  roundedRect(230, 8 + SAFE_TOP, 95, 48, 12, 'rgba(5,43,65,0.92)', 'rgba(114,208,244,0.40)');
  drawCashGlyph(246, 25 + SAFE_TOP);
  drawText(fitText('¥' + player.cash.toLocaleString(), 62, 11.5, '800'), 279, 21 + SAFE_TOP, 11.5, '#FFF1A7', '800', 'center');
  drawText('可用资金', 279, 41 + SAFE_TOP, 6.8, '#DCEBF1', '600', 'center');
  roundedRect(309, 16 + SAFE_TOP, 12, 12, 4, '#F5B62D', '#FFE598');
  drawText('+', 315, 22 + SAFE_TOP, 8.5, '#FFFFFF', '800', 'center');

  roundedRect(331, 8 + SAFE_TOP, 52, 48, 12, 'rgba(5,43,65,0.92)', 'rgba(114,208,244,0.40)');
  drawCrownGlyph(344, 24 + SAFE_TOP);
  drawText('Lv.' + brand.level, 362, 19 + SAFE_TOP, 8.4, '#FFE27D', '800', 'center');
  roundedRect(339, 39 + SAFE_TOP, 35, 4, 2, 'rgba(255,255,255,0.22)');
  roundedRect(339, 39 + SAFE_TOP, Math.max(3, 35 * brand.progress), 4, 2, COLORS.gold);
  drawText(
    brand.reputation + '/100',
    357,
    49 + SAFE_TOP,
    5.2,
    '#E7F2F6',
    '600',
    'center'
  );
  addButton('brand:status', 328, 5 + SAFE_TOP, 58, 54);

  const speedItems = [
    ['time:pause', timeSystem.isPaused() ? '▶' : 'Ⅱ'],
    ['time:speed:1', '1x'],
    ['time:speed:2', '2x'],
    ['time:speed:5', '5x'],
    ['time:speed:10', '10x']
  ];

  const y = TOP_H - 28;
  for (let i = 0; i < speedItems.length; i++) {
    const id = speedItems[i][0];
    const speed = timeSystem.getSpeed();
    const paused = timeSystem.isPaused();
    const active = id === 'time:pause'
      ? paused
      : (!paused && Number(id.split(':')[2]) === speed);

    const x = 12 + i * 46;
    roundedRect(
      x,
      y,
      40,
      21,
      8,
      active ? COLORS.gold : 'rgba(4,40,60,0.86)',
      active ? '#FFE38D' : 'rgba(255,255,255,0.18)'
    );
    drawText(speedItems[i][1], x + 20, y + 10.5, 8, active ? '#173444' : COLORS.white, '800', 'center');
    addButton(id, x - 3, y - 5, 46, 31);
  }

  drawText(
    fitText(display.date + ' · ' + display.time + ' · ' + (MEAL_NAMES[display.mealPeriod] || ''), 168, 6.7, '600'),
    378,
    y + 10.5,
    6.7,
    '#E5F0F4',
    '600',
    'right'
  );
};

drawNewsTicker = function () {
  const feed = simulationSystem.getNewsFeed();
  const bulletin = simulationSystem.getBulletin();
  const x = 8;
  const y = MAP_Y + 5;
  const w = VIEW_W - 16;
  const h = 30;

  roundedRect(x, y, w, h, 15, 'rgba(3,40,62,0.95)', 'rgba(73,192,239,0.54)');
  drawText('📣', x + 16, y + 15.5, 10, '#FFD65A', '800', 'center');
  drawText('城市通报', x + 31, y + 15.5, 7.3, '#FFD65A', '800');

  const items = ((feed && feed.length ? feed : [bulletin])).slice(0, 3);
  const startX = x + 84;
  const sectionW = (w - 111) / Math.max(1, items.length);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (i > 0) {
      ctx.fillStyle = 'rgba(230,242,247,0.34)';
      ctx.fillRect(startX + i * sectionW - 5, y + 8, 1, 14);
    }
    drawText(
      fitText(item && item.title ? item.title : '城市运行平稳', sectionW - 12, 6.2, '600'),
      startX + i * sectionW,
      y + 15.2,
      6.2,
      '#F3FAFC',
      '600'
    );
  }

  drawText('›', x + w - 12, y + 15.3, 14, '#FFE49C', '800', 'center');
  addButton('tool:news', x, y, w, h);
};

drawGoalBar = function () {
  const goal = getHomeGoalState();
  const x = 8;
  const y = MAP_Y + 40;
  const w = VIEW_W - 16;
  const h = 30;

  roundedRect(x, y, w, h, 15, 'rgba(3,40,62,0.95)', 'rgba(73,192,239,0.46)');
  drawText('◎', x + 15, y + 15, 13, '#FFD85C', '800', 'center');
  drawText('当前目标：', x + 28, y + 15, 7.1, '#FFD85C', '800');
  drawText(goal.title === '筹备首店' ? '开设首家餐厅' : goal.title, x + 83, y + 15, 7.2, '#FFFFFF', '800');

  const labels = goal.title === '筹备首店'
    ? ['选址', '看铺', '谈判', '签约', '装修']
    : goal.steps;
  const currentIndex = Math.max(0, Math.min(labels.length - 1, goal.current));
  const startX = x + 159;
  const usable = w - 190;
  const gap = usable / Math.max(1, labels.length - 1);

  for (let i = 0; i < labels.length; i++) {
    const cx = startX + i * gap;
    const done = i < currentIndex;
    const active = i === currentIndex && !goal.completed;

    if (i < labels.length - 1) {
      ctx.strokeStyle = i < currentIndex ? '#F7CC4A' : 'rgba(220,234,240,0.38)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx + 8, y + 11);
      ctx.lineTo(cx + gap - 8, y + 11);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, y + 11, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = done ? '#F2C744' : (active ? '#FFF8CF' : 'rgba(225,239,244,0.18)');
    ctx.fill();
    ctx.strokeStyle = done || active ? '#FFE58B' : '#9DB8C5';
    ctx.lineWidth = 1;
    ctx.stroke();

    drawText(labels[i], cx, y + 23.5, 5.8, active ? '#FFE08A' : '#E8F3F7', active ? '800' : '600', 'center');
  }

  drawText('🎁', x + w - 13, y + 15.5, 10.5, '#FFD85C', '800', 'center');
};

drawDistrictMarker = function (district) {
  const point = v22GetDistrictPoint(district.id);
  if (!point) return v22OriginalDrawDistrictMarker(district);

  const x = point.x;
  const y = point.y;
  const selected = selectedDistrictId === district.id;
  const meta = getDistrictVisualMeta(district);
  const animated = districtFx.id === district.id;
  const markerScale = animated ? districtFx.scale : 1;

  if (selected) {
    ctx.beginPath();
    ctx.arc(x, y, 20 + districtFx.flash * 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,195,54,0.16)';
    ctx.fill();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(markerScale, markerScale);
  const key = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
  if (!key || !(typeof v21DrawImage === 'function' && v21DrawImage(key, 0, -4, 34, 43))) {
    drawDistrictPictogram(district.id, 0, -5);
  }
  ctx.restore();

  const boxW = Math.max(76, Math.min(95, 38 + district.name.length * 9));
  const preferLeft = x > VIEW_W * 0.64;
  let boxX = preferLeft ? x - boxW - 11 : x + 10;
  boxX = Math.max(5, Math.min(VIEW_W - boxW - 5, boxX));

  let boxY = y - 14;
  boxY = Math.max(MAP_Y + 80, Math.min(CARD_Y - 44, boxY));

  roundedRect(boxX, boxY, boxW, 24, 10, 'rgba(5,53,79,0.97)', selected ? '#FFE06C' : 'rgba(255,218,93,0.82)', selected ? 1.25 : 1);
  drawText(district.name, boxX + 10, boxY + 12, 8.1, '#FFFFFF', '800');
  drawText('›', boxX + boxW - 8, boxY + 12, 9.6, '#FFE49C', '800', 'center');

  roundedRect(boxX + 5, boxY + 24, boxW - 10, 16, 7, 'rgba(255,253,247,0.98)', 'rgba(11,55,76,0.12)');
  drawText(fitText(meta.subtitle, boxW - 16, 5.2, '700'), boxX + boxW / 2, boxY + 31.5, 5.2, '#23455B', '700', 'center');

  if (meta.badge) {
    const badgeW = Math.max(34, 15 + meta.badge.length * 5.6);
    const badgeX = Math.max(5, Math.min(VIEW_W - badgeW - 5, boxX + boxW - badgeW + 4));
    roundedRect(badgeX, boxY - 7, badgeW, 15, 7, meta.badgeColor, 'rgba(255,245,218,0.98)');
    drawText(meta.badge, badgeX + badgeW / 2, boxY + 0.8, 4.9, '#FFFFFF', '800', 'center');
  }

  if (meta.myShopCount > 0) {
    const textValue = meta.myShopCount > 1 ? '✓ 我的店×' + meta.myShopCount : '✓ 我的店';
    const shopW = meta.myShopCount > 1 ? 50 : 40;
    const sx = Math.max(5, Math.min(VIEW_W - shopW - 5, boxX + boxW - shopW + 6));
    roundedRect(sx, boxY - 24, shopW, 14, 7, '#1E9A5E', '#B9F0C8');
    drawText(textValue, sx + shopW / 2, boxY - 17, 4.6, '#FFFFFF', '800', 'center');
  }

  const hitLeft = Math.min(x - 18, boxX - 3);
  const hitRight = Math.max(x + 18, boxX + boxW + 3);
  const hitTop = Math.min(y - 25, boxY - 24);
  const hitBottom = Math.max(y + 22, boxY + 43);
  addButton('district:' + district.id, hitLeft, hitTop, hitRight - hitLeft, hitBottom - hitTop);
};

drawDistrictCard = function () {
  const district = v22EnsureSelectedDistrict();
  if (!district) {
    return v22OriginalDrawDistrictCard();
  }

  const meta = getDistrictVisualMeta(district);
  const x = CARD_X;
  const y = CARD_Y;
  const w = CARD_W;
  const h = CARD_H;

  roundedRect(x, y, w, h, 17, 'rgba(255,255,255,0.98)', 'rgba(10,56,79,0.16)', 1.1);

  const preview = resourceManager.getImage('city_base_01');
  if (preview) {
    ctx.save();
    ctx.beginPath();
    const px = x + 12;
    const py = y + 10;
    const pw = 100;
    const ph = h - 20;
    ctx.moveTo(px + 14, py);
    ctx.arcTo(px + pw, py, px + pw, py + ph, 14);
    ctx.arcTo(px + pw, py + ph, px, py + ph, 14);
    ctx.arcTo(px, py + ph, px, py, 14);
    ctx.arcTo(px, py, px + pw, py, 14);
    ctx.closePath();
    ctx.clip();
    drawImageFocus(ctx, preview, px, py, pw, ph, 2.0, 0.56, 0.60);
    ctx.restore();
  } else {
    roundedRect(x + 12, y + 10, 100, h - 20, 14, '#C5D7E1');
  }

  const iconKey = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
  if (iconKey && typeof v21DrawImage === 'function') {
    v21DrawImage(iconKey, x + 132, y + 22, 23, 29);
  }

  drawText(district.name, x + 146, y + 22, 13.5, '#113654', '800');
  drawText('›', x + 212, y + 22, 13, '#2F5673', '800', 'center');
  drawText(meta.subtitle + ' · ' + (meta.badge ? meta.badge.replace('↑', '') : '仍有经营机会'), x + 146, y + 43, 6.4, '#40627B', '700');

  const metrics = [
    ['人口', district.population.toLocaleString(), '#1E76C5'],
    ['需求', demandSystem.getTotalDemand(district.id).toLocaleString(), '#1E9A5E'],
    ['客单', '¥' + district.avgSpend, '#164A86'],
    ['餐饮店', district.restaurantCount + '家', '#164A86'],
    ['饱和度', district.saturation + '%', '#1E76C5'],
    ['租金', district.rentIndex.toFixed(2), '#164A86']
  ];

  const metricX = x + 120;
  const metricY = y + 52;
  const metricGap = 4;
  const metricW = (w - 132 - metricGap * 5) / 6;
  for (let i = 0; i < metrics.length; i++) {
    const mx = metricX + i * (metricW + metricGap);
    roundedRect(mx, metricY, metricW, 45, 9, '#FAF8F3', 'rgba(17,62,92,0.10)');
    drawMetricSymbol(metrics[i][0], mx + metricW / 2, metricY + 10.5, metrics[i][2]);
    drawText(metrics[i][0], mx + metricW / 2, metricY + 24, 5.4, '#245276', '700', 'center');
    drawText(metrics[i][1], mx + metricW / 2, metricY + 38, 6.8, metrics[i][2], '800', 'center');
  }

  let summary = '客群活跃 · 仍有经营机会';
  if (meta.badge === '租金低') summary = '租金较低 · 适合抢先布局';
  if (meta.badge === '竞争高') summary = '竞争激烈 · 适合差异化经营';
  if (meta.badge === '人气高') summary = '客群活跃 · 仍有经营机会';
  if (meta.myShopCount > 0) summary = '已开门店 · 可继续深耕经营';

  drawText(summary, x + 120, y + h - 38, 7.2, '#25597A', '800');
  drawText('实时数据会随人口、城市事件、竞争和租金变化', x + 120, y + h - 18, 5.6, '#607D92', '600');

  roundedRect(x + w - 119, y + h - 44, 108, 36, 18, '#FFC22D', '#DFA01B', 1.2);
  drawText('进入商圈  ›', x + w - 65, y + h - 26, 8.6, '#123A53', '800', 'center');
  addButton('district:details', x + w - 123, y + h - 48, 116, 44);
};

drawBottomNav = function () {
  const items = [
    { id: 'city', label: '城市' },
    { id: 'shop', label: '门店' },
    { id: 'traffic', label: '客流' },
    { id: 'research', label: '菜单' },
    { id: 'supply', label: '供应链' },
    { id: 'business', label: '数据' },
    { id: 'system', label: '系统' }
  ];

  roundedRect(0, NAV_Y, VIEW_W, NAV_H, 0, 'rgba(5,52,79,0.98)');
  const glow = ctx.createLinearGradient(0, NAV_Y, 0, NAV_Y + NAV_H);
  glow.addColorStop(0, 'rgba(23,125,203,0.18)');
  glow.addColorStop(1, 'rgba(23,125,203,0.00)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, NAV_Y, VIEW_W, NAV_H);

  const cellW = VIEW_W / items.length;
  const current = sceneManager.getCurrentId();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const active =
      (
        item.id === 'city' &&
        current === 'city' &&
        !trafficMode
      ) ||
      (
        item.id === 'traffic' &&
        current === 'city' &&
        trafficMode
      ) ||
      (
        item.id === 'shop' &&
        (
          current === 'shop' ||
          current === 'propertyMarket' ||
          current === 'equipment' ||
          current === 'license' ||
          current === 'staff' ||
          current === 'renovation'
        )
      ) ||
      (
        item.id !== 'city' &&
        item.id !== 'traffic' &&
        item.id !== 'shop' &&
        item.id === current
      );
    const cellX = i * cellW;

    if (active) {
      roundedRect(cellX + 3, NAV_Y + 4, cellW - 6, NAV_H - 8, 14, '#F3BF20', '#FFE599', 1.1);
    }

    drawNavIcon(item.id, cellX + cellW / 2, NAV_Y + 19, active);
    drawText(item.label, cellX + cellW / 2, NAV_Y + 42, 6.8, active ? '#173444' : '#FFFFFF', active ? '800' : '600', 'center');

    addButton('nav:' + item.id, cellX, NAV_Y, cellW, NAV_H);
  }
};

if (cityScene && typeof cityScene.enter === 'function') {
  const v22OriginalCityEnter = cityScene.enter;
  cityScene.enter = function () {
    v22OriginalCityEnter.call(this);
    v22EnsureSelectedDistrict();
  };
}

console.log('V22_HOME_MATCH loaded');

/* V23_HOME_REMAP */

const V23_DISTRICT_LAYOUT = {
  university: {
    px: 0.17,
    py: 0.34,
    cardFocusX: 0.23,
    cardFocusY: 0.30,
    labelSide: 'right'
  },
  hightech: {
    px: 0.79,
    py: 0.36,
    cardFocusX: 0.76,
    cardFocusY: 0.31,
    labelSide: 'left'
  },
  cbd: {
    px: 0.50,
    py: 0.49,
    cardFocusX: 0.52,
    cardFocusY: 0.46,
    labelSide: 'right'
  },
  oldtown: {
    px: 0.10,
    py: 0.63,
    cardFocusX: 0.17,
    cardFocusY: 0.58,
    labelSide: 'right'
  },
  village: {
    px: 0.36,
    py: 0.71,
    cardFocusX: 0.41,
    cardFocusY: 0.66,
    labelSide: 'right'
  },
  market: {
    px: 0.16,
    py: 0.85,
    cardFocusX: 0.19,
    cardFocusY: 0.79,
    labelSide: 'right'
  },
  industry: {
    px: 0.80,
    py: 0.61,
    cardFocusX: 0.79,
    cardFocusY: 0.58,
    labelSide: 'left'
  }
};

const v23OriginalDrawMapBase = drawMapBase;
const v23OriginalDrawDistrictMarker = drawDistrictMarker;
const v23OriginalDrawDistrictCard = drawDistrictCard;
const v23OriginalDrawTopHud = drawTopHud;
const v23OriginalDrawNewsTicker = drawNewsTicker;
const v23OriginalDrawGoalBar = drawGoalBar;
const v23OriginalDrawBottomNav = drawBottomNav;

function v23EnsureSelectedDistrict() {
  const districts = getDistricts();
  if (!districts || !districts.length) return null;

  for (let i = 0; i < districts.length; i++) {
    if (districts[i].id === selectedDistrictId) {
      return districts[i];
    }
  }

  const fallback = districts.find(function (item) {
    return item.id === 'market';
  }) || districts[0];

  if (fallback) {
    selectedDistrictId = fallback.id;
  }

  return fallback || null;
}

function v23GetMapPoint(districtId) {
  const config = V23_DISTRICT_LAYOUT[districtId];
  if (!config) {
    return getDistrictPoint(districtId);
  }

  const top = MAP_Y + 84;
  const bottom = CARD_Y - 44;
  const usableH = Math.max(120, bottom - top);

  return {
    x: Math.round(MAP_X + MAP_W * config.px),
    y: Math.round(top + usableH * config.py)
  };
}

function v23GetCardFocus(districtId) {
  const config = V23_DISTRICT_LAYOUT[districtId] || {};
  return {
    x: config.cardFocusX == null ? 0.56 : config.cardFocusX,
    y: config.cardFocusY == null ? 0.60 : config.cardFocusY
  };
}

updateLayout = function () {
  TOP_H = (VIEW_H < 740 ? 93 : 96) + SAFE_TOP;
  NAV_H = (VIEW_H < 740 ? 58 : 62) + SAFE_BOTTOM;

  MAP_X = 0;
  MAP_Y = TOP_H;
  MAP_W = VIEW_W;

  NAV_Y = VIEW_H - NAV_H;
  MAP_H = NAV_Y - MAP_Y;

  CARD_H = VIEW_H < 740 ? 122 : 132;
  CARD_X = 6;
  CARD_W = VIEW_W - 12;
  CARD_Y = NAV_Y - CARD_H - 4;
};

drawMapBase = function () {
  const image = resourceManager.getImage('city_base_01');
  if (!image) {
    return v23OriginalDrawMapBase();
  }

  drawImageFocus(
    ctx,
    image,
    MAP_X,
    MAP_Y,
    MAP_W,
    MAP_H,
    1.72,
    0.56,
    0.57
  );

  const topFade = ctx.createLinearGradient(0, MAP_Y, 0, MAP_Y + 120);
  topFade.addColorStop(0, 'rgba(6,39,61,0.24)');
  topFade.addColorStop(1, 'rgba(6,39,61,0.01)');
  ctx.fillStyle = topFade;
  ctx.fillRect(MAP_X, MAP_Y, MAP_W, 120);

  const bottomFade = ctx.createLinearGradient(0, CARD_Y - 50, 0, CARD_Y + 10);
  bottomFade.addColorStop(0, 'rgba(255,255,255,0.00)');
  bottomFade.addColorStop(1, 'rgba(255,255,255,0.10)');
  ctx.fillStyle = bottomFade;
  ctx.fillRect(MAP_X, CARD_Y - 50, MAP_W, 60);
};

drawTopHud = function () {
  v23OriginalDrawTopHud();
  drawText('品牌：' + ((gameState.getPlayer() && gameState.getPlayer().brandName) || '未命名品牌'), 66, 50 + SAFE_TOP, 6.2, '#EAF5FA', '600');
};

drawNewsTicker = function () {
  const feed = simulationSystem.getNewsFeed();
  const bulletin = simulationSystem.getBulletin();
  const x = 8;
  const y = MAP_Y + 6;
  const w = VIEW_W - 16;
  const h = 29;

  roundedRect(x, y, w, h, 14, 'rgba(2,42,67,0.96)', 'rgba(82,199,243,0.50)');
  drawText('📣', x + 16, y + 14.5, 9.5, '#FFD75F', '800', 'center');
  drawText('城市通报', x + 31, y + 14.5, 7.4, '#FFD75F', '800');

  const items = ((feed && feed.length ? feed : [bulletin])).slice(0, 2);
  const startX = x + 84;
  const sectionW = (w - 107) / Math.max(1, items.length);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (i > 0) {
      ctx.fillStyle = 'rgba(235,245,248,0.28)';
      ctx.fillRect(startX + i * sectionW - 7, y + 8, 1, 13);
    }

    drawText(
      fitText(item && item.title ? item.title : '城市运行平稳', sectionW - 16, 6.5, '600'),
      startX + i * sectionW,
      y + 14.5,
      6.5,
      '#F5FBFD',
      '600'
    );
  }

  drawText('›', x + w - 13, y + 14.5, 13, '#FFD75F', '800', 'center');
  addButton('tool:news', x, y, w, h);
};

drawGoalBar = function () {
  const goal = getHomeGoalState();
  const x = 8;
  const y = MAP_Y + 41;
  const w = VIEW_W - 16;
  const h = 30;

  roundedRect(x, y, w, h, 14, 'rgba(2,42,67,0.96)', 'rgba(82,199,243,0.45)');
  drawText('◎', x + 15, y + 14.5, 12.5, '#FFD85C', '800', 'center');
  drawText('当前目标：', x + 28, y + 14.5, 7.3, '#FFD85C', '800');
  drawText(goal.title === '筹备首店' ? '开设首家餐厅' : goal.title, x + 83, y + 14.5, 7.3, '#FFFFFF', '800');

  const labels = goal.title === '筹备首店'
    ? ['选址', '看铺', '谈判', '签约', '装修']
    : goal.steps;
  const currentIndex = Math.max(0, Math.min(labels.length - 1, goal.current));
  const startX = x + 164;
  const usable = w - 197;
  const gap = usable / Math.max(1, labels.length - 1);

  for (let i = 0; i < labels.length; i++) {
    const cx = startX + i * gap;
    const done = i < currentIndex;
    const active = i === currentIndex && !goal.completed;

    if (i < labels.length - 1) {
      ctx.strokeStyle = i < currentIndex ? '#F3C644' : 'rgba(227,237,241,0.40)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + 8, y + 10.5);
      ctx.lineTo(cx + gap - 8, y + 10.5);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, y + 10.5, 5.1, 0, Math.PI * 2);
    ctx.fillStyle = done ? '#F2C745' : (active ? '#FFF6C7' : 'rgba(225,239,244,0.18)');
    ctx.fill();
    ctx.strokeStyle = done || active ? '#FFE58B' : '#9DB8C5';
    ctx.lineWidth = 1;
    ctx.stroke();

    drawText(labels[i], cx, y + 22.5, 5.8, active ? '#FFE08A' : '#E8F3F7', active ? '800' : '600', 'center');
  }

  drawText('🎁', x + w - 13, y + 15, 10.5, '#FFD85C', '800', 'center');
};

drawDistrictMarker = function (district) {
  const config = V23_DISTRICT_LAYOUT[district.id];
  if (!config) {
    return v23OriginalDrawDistrictMarker(district);
  }

  const point = v23GetMapPoint(district.id);
  const x = point.x;
  const y = point.y;
  const selected = selectedDistrictId === district.id;
  const meta = getDistrictVisualMeta(district);
  const animated = districtFx.id === district.id;
  const markerScale = animated ? districtFx.scale : 1;

  if (selected) {
    ctx.beginPath();
    ctx.arc(x, y, 23 + districtFx.flash * 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,199,65,0.16)';
    ctx.fill();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(markerScale, markerScale);

  const key = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
  if (!key || !(typeof v21DrawImage === 'function' && v21DrawImage(key, 0, -3, 40, 50))) {
    drawDistrictPictogram(district.id, 0, -3);
  }

  ctx.restore();

  const boxW = Math.max(82, Math.min(106, 44 + district.name.length * 10));
  const boxH = 25;
  const subH = 17;
  const side = config.labelSide || 'right';
  let boxX = side === 'left' ? x - boxW - 13 : x + 14;
  boxX = Math.max(6, Math.min(VIEW_W - boxW - 6, boxX));

  let boxY = y - 14;
  boxY = Math.max(MAP_Y + 84, Math.min(CARD_Y - 52, boxY));

  roundedRect(boxX, boxY, boxW, boxH, 11, 'rgba(5,53,79,0.98)', selected ? '#FFE06C' : 'rgba(255,218,93,0.82)', selected ? 1.25 : 1);
  drawText(district.name, boxX + 10, boxY + 12.3, 8.5, '#FFFFFF', '800');
  drawText('›', boxX + boxW - 9, boxY + 12.3, 9.6, '#FFE49C', '800', 'center');

  roundedRect(boxX + 5, boxY + boxH, boxW - 10, subH, 7, 'rgba(255,253,247,0.99)', 'rgba(11,55,76,0.10)');
  drawText(fitText(meta.subtitle, boxW - 16, 5.7, '700'), boxX + boxW / 2, boxY + boxH + 8.6, 5.7, '#23455B', '700', 'center');

  if (meta.badge) {
    const badgeW = Math.max(35, 16 + meta.badge.length * 5.8);
    const badgeX = Math.max(6, Math.min(VIEW_W - badgeW - 6, boxX + boxW - badgeW + 4));
    roundedRect(badgeX, boxY - 8, badgeW, 16, 8, meta.badgeColor, 'rgba(255,245,218,0.98)');
    drawText(meta.badge, badgeX + badgeW / 2, boxY + 0.8, 5.1, '#FFFFFF', '800', 'center');
  }

  if (meta.myShopCount > 0) {
    const textValue = meta.myShopCount > 1 ? '✓ 我的店×' + meta.myShopCount : '✓ 我的店';
    const shopW = meta.myShopCount > 1 ? 52 : 42;
    const sx = Math.max(6, Math.min(VIEW_W - shopW - 6, boxX + boxW - shopW + 2));
    roundedRect(sx, boxY - 26, shopW, 15, 7, '#1E9A5E', '#B9F0C8');
    drawText(textValue, sx + shopW / 2, boxY - 18.5, 4.8, '#FFFFFF', '800', 'center');
  }

  const hitLeft = Math.min(x - 20, boxX - 4);
  const hitRight = Math.max(x + 22, boxX + boxW + 4);
  const hitTop = Math.min(y - 28, boxY - 26);
  const hitBottom = Math.max(y + 25, boxY + 44);
  addButton('district:' + district.id, hitLeft, hitTop, hitRight - hitLeft, hitBottom - hitTop);
};

drawDistrictCard = function () {
  const district = v23EnsureSelectedDistrict();
  if (!district) {
    return v23OriginalDrawDistrictCard();
  }

  const meta = getDistrictVisualMeta(district);
  const x = CARD_X;
  const y = CARD_Y;
  const w = CARD_W;
  const h = CARD_H;

  roundedRect(x, y, w, h, 17, 'rgba(255,255,255,0.985)', 'rgba(10,56,79,0.16)', 1.1);

  const preview = resourceManager.getImage('city_base_01');
  const px = x + 11;
  const py = y + 10;
  const pw = 88;
  const ph = h - 20;
  if (preview) {
    const focus = v23GetCardFocus(district.id);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px + 14, py);
    ctx.arcTo(px + pw, py, px + pw, py + ph, 14);
    ctx.arcTo(px + pw, py + ph, px, py + ph, 14);
    ctx.arcTo(px, py + ph, px, py, 14);
    ctx.arcTo(px, py, px + pw, py, 14);
    ctx.closePath();
    ctx.clip();
    drawImageFocus(ctx, preview, px, py, pw, ph, 2.15, focus.x, focus.y);
    ctx.restore();
  } else {
    roundedRect(px, py, pw, ph, 14, '#C5D7E1');
  }

  const iconKey = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
  if (iconKey && typeof v21DrawImage === 'function') {
    v21DrawImage(iconKey, x + 118, y + 19, 19, 24);
  }

  drawText(district.name, x + 130, y + 18, 13.2, '#103655', '800');
  drawText('›', x + 194, y + 18, 12.4, '#2F5673', '800', 'center');

  let summary = '客群活跃 · 仍有经营机会';
  if (meta.badge === '租金低') summary = '租金较低 · 适合抢先布局';
  if (meta.badge === '竞争高') summary = '竞争激烈 · 适合差异化经营';
  if (meta.badge === '需求↑') summary = '需求上涨 · 可优先进入';
  if (meta.badge === '人气高') summary = '客群活跃 · 仍有经营机会';
  if (meta.myShopCount > 0) summary = '已开门店 · 可继续深耕经营';

  drawText(summary, x + 110, y + 35, 6.2, '#39627E', '700');

  const metrics = [
    ['人口', district.population.toLocaleString(), '#1E76C5'],
    ['需求', demandSystem.getTotalDemand(district.id).toLocaleString(), '#1E9A5E'],
    ['客单', '¥' + district.avgSpend, '#164A86'],
    ['餐饮店', district.restaurantCount + '家', '#164A86'],
    ['饱和度', district.saturation + '%', '#1E76C5'],
    ['租金', district.rentIndex.toFixed(2), '#164A86']
  ];

  const metricX = x + 103;
  const metricY = y + 47;
  const metricGap = 4;
  const metricW = Math.floor((w - 220 - metricGap * 5) / 6);
  for (let i = 0; i < metrics.length; i++) {
    const mx = metricX + i * (metricW + metricGap);
    roundedRect(mx, metricY, metricW, 39, 8, '#FAF8F3', 'rgba(17,62,92,0.10)');
    drawMetricSymbol(metrics[i][0], mx + metricW / 2, metricY + 9.5, metrics[i][2]);
    drawText(metrics[i][0], mx + metricW / 2, metricY + 20.5, 4.9, '#245276', '700', 'center');
    drawText(metrics[i][1], mx + metricW / 2, metricY + 33.5, 6.2, metrics[i][2], '800', 'center');
  }

  drawText('实时数据会随人口、城市事件、竞争和租金变化', x + 109, y + h - 17, 5.5, '#607D92', '600');

  roundedRect(x + w - 116, y + h - 42, 106, 34, 18, '#FFC22D', '#DFA01B', 1.2);
  drawText('进入商圈  ›', x + w - 63, y + h - 25, 8.4, '#123A53', '800', 'center');
  addButton('district:details', x + w - 120, y + h - 46, 112, 42);
};

drawBottomNav = function () {
  v23OriginalDrawBottomNav();
  ctx.strokeStyle = 'rgba(86,190,244,0.26)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, NAV_Y + 0.5, VIEW_W - 1, NAV_H - 1);
};

if (cityScene && typeof cityScene.enter === 'function') {
  const v23OriginalCityEnter = cityScene.enter;
  cityScene.enter = function () {
    v23OriginalCityEnter.call(this);
    v23EnsureSelectedDistrict();
  };
}

console.log('V23_HOME_REMAP loaded');

/* V24_FINAL_HOME_PACK */

const V24_DISTRICT_PREVIEW_KEYS = {
  university: 'v24_preview_university',
  hightech: 'v24_preview_hightech',
  cbd: 'v24_preview_cbd',
  oldtown: 'v24_preview_oldtown',
  village: 'v24_preview_village',
  market: 'v24_preview_market',
  industry: 'v24_preview_industry'
};

const v24OriginalLoadResources = loadResources;
const v24OriginalDrawDistrictCard = drawDistrictCard;
const v24OriginalDrawMapBase = drawMapBase;

loadResources = function () {
  const previews = [
    ['v24_preview_university', 'district_preview_university.png'],
    ['v24_preview_hightech', 'district_preview_hightech.png'],
    ['v24_preview_cbd', 'district_preview_cbd.png'],
    ['v24_preview_oldtown', 'district_preview_oldtown.png'],
    ['v24_preview_village', 'district_preview_village.png'],
    ['v24_preview_market', 'district_preview_market.png'],
    ['v24_preview_industry', 'district_preview_industry.png']
  ];

  const tasks = [];
  for (let i = 0; i < previews.length; i++) {
    tasks.push(
      resourceManager.loadImage(
        previews[i][0],
        'assets/images/v24/' + previews[i][1],
        'v24-ui'
      )
    );
  }

  return Promise.all(tasks).then(function () {
    return v24OriginalLoadResources();
  });
};

drawMapBase = function () {
  const image = resourceManager.getImage('city_base_01');
  if (!image) {
    return v24OriginalDrawMapBase();
  }

  drawImageFocus(
    ctx,
    image,
    MAP_X,
    MAP_Y,
    MAP_W,
    MAP_H,
    1.58,
    0.51,
    0.52
  );

  const topFade = ctx.createLinearGradient(0, MAP_Y, 0, MAP_Y + 120);
  topFade.addColorStop(0, 'rgba(5,35,54,0.20)');
  topFade.addColorStop(1, 'rgba(5,35,54,0.00)');
  ctx.fillStyle = topFade;
  ctx.fillRect(MAP_X, MAP_Y, MAP_W, 120);
};

drawDistrictCard = function () {
  const district = (typeof v23EnsureSelectedDistrict === 'function')
    ? v23EnsureSelectedDistrict()
    : ((getDistricts() || [])[0] || null);

  if (!district) {
    return v24OriginalDrawDistrictCard();
  }

  const meta = getDistrictVisualMeta(district);
  const x = CARD_X;
  const y = CARD_Y;
  const w = CARD_W;
  const h = CARD_H;

  roundedRect(x, y, w, h, 17, 'rgba(255,255,255,0.988)', 'rgba(10,56,79,0.16)', 1.1);

  const previewKey = V24_DISTRICT_PREVIEW_KEYS[district.id];
  const preview = resourceManager.getImage(previewKey);
  const px = x + 11;
  const py = y + 10;
  const pw = 88;
  const ph = h - 20;
  if (preview) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px + 14, py);
    ctx.arcTo(px + pw, py, px + pw, py + ph, 14);
    ctx.arcTo(px + pw, py + ph, px, py + ph, 14);
    ctx.arcTo(px, py + ph, px, py, 14);
    ctx.arcTo(px, py, px + pw, py, 14);
    ctx.closePath();
    ctx.clip();
    drawImageFocus(ctx, preview, px, py, pw, ph, 1.02, 0.5, 0.5);
    ctx.restore();
  } else {
    return v24OriginalDrawDistrictCard();
  }

  const iconKey = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
  if (iconKey && typeof v21DrawImage === 'function') {
    v21DrawImage(iconKey, x + 118, y + 19, 19, 24);
  }

  drawText(district.name, x + 130, y + 18, 13.2, '#103655', '800');
  drawText('›', x + 194, y + 18, 12.4, '#2F5673', '800', 'center');

  let summary = '客群活跃 · 仍有经营机会';
  if (meta.badge === '租金低') summary = '租金较低 · 适合抢先布局';
  if (meta.badge === '竞争高') summary = '竞争激烈 · 适合差异化经营';
  if (meta.badge === '需求↑') summary = '需求上涨 · 可优先进入';
  if (meta.badge === '人气高') summary = '客群活跃 · 仍有经营机会';
  if (meta.myShopCount > 0) summary = '已开门店 · 可继续深耕经营';

  drawText(summary, x + 110, y + 35, 6.2, '#39627E', '700');

  const metrics = [
    ['人口', district.population.toLocaleString(), '#1E76C5'],
    ['需求', demandSystem.getTotalDemand(district.id).toLocaleString(), '#1E9A5E'],
    ['客单', '¥' + district.avgSpend, '#164A86'],
    ['餐饮店', district.restaurantCount + '家', '#164A86'],
    ['饱和度', district.saturation + '%', '#1E76C5'],
    ['租金', district.rentIndex.toFixed(2), '#164A86']
  ];

  const metricX = x + 103;
  const metricY = y + 47;
  const metricGap = 4;
  const metricW = Math.floor((w - 220 - metricGap * 5) / 6);
  for (let i = 0; i < metrics.length; i++) {
    const mx = metricX + i * (metricW + metricGap);
    roundedRect(mx, metricY, metricW, 39, 8, '#FAF8F3', 'rgba(17,62,92,0.10)');
    drawMetricSymbol(metrics[i][0], mx + metricW / 2, metricY + 9.5, metrics[i][2]);
    drawText(metrics[i][0], mx + metricW / 2, metricY + 20.5, 4.9, '#245276', '700', 'center');
    drawText(metrics[i][1], mx + metricW / 2, metricY + 33.5, 6.2, metrics[i][2], '800', 'center');
  }

  drawText('实时数据会随人口、城市事件、竞争和租金变化', x + 109, y + h - 17, 5.5, '#607D92', '600');
  roundedRect(x + w - 116, y + h - 42, 106, 34, 18, '#FFC22D', '#DFA01B', 1.2);
  drawText('进入商圈  ›', x + w - 63, y + h - 25, 8.4, '#123A53', '800', 'center');
  addButton('district:details', x + w - 120, y + h - 46, 112, 42);
};

console.log('V24_FINAL_HOME_PACK loaded');

/* V25_STRICT_HOME_LAYOUT */

const V25_POINTS = {
  university: { x: 0.17, y: 0.13, side: 'right' },
  hightech:   { x: 0.80, y: 0.15, side: 'left'  },
  cbd:        { x: 0.54, y: 0.36, side: 'right' },
  oldtown:    { x: 0.10, y: 0.52, side: 'right' },
  village:    { x: 0.38, y: 0.63, side: 'right' },
  industry:   { x: 0.81, y: 0.57, side: 'left'  },
  market:     { x: 0.17, y: 0.80, side: 'right' }
};

function v25SelectedDistrict() {
  const districts = getDistricts() || [];
  let selected = districts.find(function (d) {
    return d.id === selectedDistrictId;
  });

  if (!selected) {
    selected =
      districts.find(function (d) { return d.id === 'market'; }) ||
      districts[0] ||
      null;

    if (selected) selectedDistrictId = selected.id;
  }

  return selected;
}

function v25Point(id) {
  const p = V25_POINTS[id];
  if (!p) return getDistrictPoint(id);

  const top = MAP_Y + 78;
  const bottom = CARD_Y - 34;
  const usable = Math.max(160, bottom - top);

  return {
    x: Math.round(MAP_X + MAP_W * p.x),
    y: Math.round(top + usable * p.y)
  };
}

updateLayout = function () {
  TOP_H = (VIEW_H < 740 ? 91 : 94) + SAFE_TOP;
  NAV_H = (VIEW_H < 740 ? 64 : 68) + SAFE_BOTTOM;

  MAP_X = 0;
  MAP_Y = TOP_H;
  MAP_W = VIEW_W;

  NAV_Y = VIEW_H - NAV_H;
  MAP_H = NAV_Y - MAP_Y;

  CARD_H = VIEW_H < 740 ? 96 : 102;
  CARD_X = 6;
  CARD_W = VIEW_W - 12;
  CARD_Y = NAV_Y - CARD_H - 5;
};

drawNewsTicker = function () {
  const feed = simulationSystem.getNewsFeed();
  const bulletin = simulationSystem.getBulletin();
  const x = 8;
  const y = MAP_Y + 5;
  const w = VIEW_W - 16;
  const h = 28;

  roundedRect(x, y, w, h, 14, 'rgba(3,42,66,0.965)', 'rgba(84,199,243,0.50)');
  drawText('📣', x + 16, y + 14, 9.2, '#FFD75F', '800', 'center');
  drawText('城市通报', x + 31, y + 14, 7.5, '#FFD75F', '800');

  const items = ((feed && feed.length ? feed : [bulletin])).slice(0, 3);
  const startX = x + 84;
  const sectionW = (w - 106) / Math.max(1, items.length);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (i > 0) {
      ctx.fillStyle = 'rgba(235,245,248,0.28)';
      ctx.fillRect(startX + i * sectionW - 6, y + 7, 1, 14);
    }

    drawText(
      fitText(item && item.title ? item.title : '城市运行平稳', sectionW - 12, 6.1, '600'),
      startX + i * sectionW,
      y + 14,
      6.1,
      '#F6FBFD',
      '600'
    );
  }

  drawText('›', x + w - 12, y + 14, 13, '#FFE071', '800', 'center');
  addButton('tool:news', x, y, w, h);
};

drawGoalBar = function () {
  const goal = getHomeGoalState();
  const x = 8;
  const y = MAP_Y + 38;
  const w = VIEW_W - 16;
  const h = 28;

  roundedRect(x, y, w, h, 14, 'rgba(3,42,66,0.965)', 'rgba(84,199,243,0.45)');
  drawText('◎', x + 15, y + 14, 12, '#FFD85C', '800', 'center');
  drawText('当前目标：', x + 29, y + 14, 7.2, '#FFD85C', '800');
  drawText(goal.title === '筹备首店' ? '开设首家餐厅' : goal.title, x + 84, y + 14, 7.2, '#FFFFFF', '800');

  const labels = goal.title === '筹备首店'
    ? ['选址', '看铺', '谈判', '签约', '装修']
    : goal.steps;

  const currentIndex = Math.max(0, Math.min(labels.length - 1, goal.current));
  const startX = x + 165;
  const usable = w - 198;
  const gap = usable / Math.max(1, labels.length - 1);

  for (let i = 0; i < labels.length; i++) {
    const cx = startX + i * gap;
    const done = i < currentIndex;
    const active = i === currentIndex && !goal.completed;

    if (i < labels.length - 1) {
      ctx.strokeStyle = i < currentIndex ? '#F5C94A' : 'rgba(226,238,243,0.42)';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.moveTo(cx + 7, y + 9.5);
      ctx.lineTo(cx + gap - 7, y + 9.5);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, y + 9.5, 4.8, 0, Math.PI * 2);
    ctx.fillStyle = done ? '#F2C744' : (active ? '#FFF6CC' : 'rgba(225,239,244,0.17)');
    ctx.fill();
    ctx.strokeStyle = done || active ? '#FFE58B' : '#9DB8C5';
    ctx.lineWidth = 1;
    ctx.stroke();

    drawText(labels[i], cx, y + 21.5, 5.9, active ? '#FFE08A' : '#EBF4F7', active ? '800' : '600', 'center');
  }

  drawText('🎁', x + w - 13, y + 14, 10, '#FFD85C', '800', 'center');
};

drawDistrictMarker = function (district) {
  const point = v25Point(district.id);
  if (!point) return;

  const x = point.x;
  const y = point.y;
  const selected = selectedDistrictId === district.id;
  const meta = getDistrictVisualMeta(district);
  const config = V25_POINTS[district.id] || { side: 'right' };
  const animated = districtFx.id === district.id;
  const markerScale = animated ? districtFx.scale : 1;

  if (selected) {
    ctx.beginPath();
    ctx.arc(x, y, 25 + districtFx.flash * 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,196,46,0.18)';
    ctx.fill();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(markerScale, markerScale);

  const key = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
  if (!key || !(typeof v21DrawImage === 'function' && v21DrawImage(key, 0, -4, 46, 58))) {
    drawDistrictPictogram(district.id, 0, -4);
  }

  ctx.restore();

  const boxW = Math.max(90, Math.min(118, 48 + district.name.length * 11));
  const boxH = 28;
  const subH = 18;

  let boxX =
    config.side === 'left'
      ? x - boxW - 15
      : x + 15;

  boxX = Math.max(6, Math.min(VIEW_W - boxW - 6, boxX));

  let boxY = y - 15;
  boxY = Math.max(MAP_Y + 72, Math.min(CARD_Y - 50, boxY));

  roundedRect(
    boxX,
    boxY,
    boxW,
    boxH,
    12,
    'rgba(4,52,79,0.98)',
    selected ? '#FFE06C' : 'rgba(255,220,97,0.86)',
    selected ? 1.35 : 1
  );

  drawText(
    district.name,
    boxX + 11,
    boxY + 14,
    9.2,
    '#FFFFFF',
    '800'
  );

  drawText(
    '›',
    boxX + boxW - 10,
    boxY + 14,
    10.3,
    '#FFE49C',
    '800',
    'center'
  );

  roundedRect(
    boxX + 6,
    boxY + boxH,
    boxW - 12,
    subH,
    8,
    'rgba(255,253,247,0.99)',
    'rgba(11,55,76,0.10)'
  );

  drawText(
    fitText(meta.subtitle, boxW - 20, 6.1, '700'),
    boxX + boxW / 2,
    boxY + boxH + 9,
    6.1,
    '#23455B',
    '700',
    'center'
  );

  if (meta.badge) {
    const badgeW = Math.max(37, 16 + meta.badge.length * 6.1);
    const badgeX = Math.max(
      6,
      Math.min(VIEW_W - badgeW - 6, boxX + boxW - badgeW + 5)
    );

    roundedRect(
      badgeX,
      boxY - 9,
      badgeW,
      17,
      8,
      meta.badgeColor,
      'rgba(255,245,218,0.98)'
    );

    drawText(
      meta.badge,
      badgeX + badgeW / 2,
      boxY - 0.5,
      5.4,
      '#FFFFFF',
      '800',
      'center'
    );
  }

  if (meta.myShopCount > 0) {
    const txt = meta.myShopCount > 1
      ? '✓ 我的店×' + meta.myShopCount
      : '✓ 我的店';

    const sw = meta.myShopCount > 1 ? 55 : 44;
    const sx = Math.max(
      6,
      Math.min(VIEW_W - sw - 6, boxX + boxW - sw + 3)
    );

    roundedRect(
      sx,
      boxY - 28,
      sw,
      16,
      8,
      '#1E9A5E',
      '#B9F0C8'
    );

    drawText(
      txt,
      sx + sw / 2,
      boxY - 20,
      5,
      '#FFFFFF',
      '800',
      'center'
    );
  }

  const hitLeft = Math.min(x - 24, boxX - 4);
  const hitRight = Math.max(x + 24, boxX + boxW + 4);
  const hitTop = Math.min(y - 32, boxY - 28);
  const hitBottom = Math.max(y + 28, boxY + boxH + subH + 3);

  addButton(
    'district:' + district.id,
    hitLeft,
    hitTop,
    hitRight - hitLeft,
    hitBottom - hitTop
  );
};

drawDistrictCard = function () {
  const district = v25SelectedDistrict();
  if (!district) return;

  const meta = getDistrictVisualMeta(district);
  const x = CARD_X;
  const y = CARD_Y;
  const w = CARD_W;
  const h = CARD_H;

  roundedRect(x, y, w, h, 17, 'rgba(255,255,255,0.99)', 'rgba(10,56,79,0.16)', 1.1);

  const previewKey =
    typeof V24_DISTRICT_PREVIEW_KEYS !== 'undefined'
      ? V24_DISTRICT_PREVIEW_KEYS[district.id]
      : null;

  const preview = previewKey
    ? resourceManager.getImage(previewKey)
    : resourceManager.getImage('city_base_01');

  const px = x + 10;
  const py = y + 8;
  const pw = 91;
  const ph = h - 16;

  if (preview) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px + 13, py);
    ctx.arcTo(px + pw, py, px + pw, py + ph, 13);
    ctx.arcTo(px + pw, py + ph, px, py + ph, 13);
    ctx.arcTo(px, py + ph, px, py, 13);
    ctx.arcTo(px, py, px + pw, py, 13);
    ctx.closePath();
    ctx.clip();
    drawImageFocus(ctx, preview, px, py, pw, ph, 1.02, 0.5, 0.5);
    ctx.restore();
  }

  const iconKey = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
  if (iconKey && typeof v21DrawImage === 'function') {
    v21DrawImage(iconKey, x + 116, y + 17, 18, 23);
  }

  drawText(district.name, x + 129, y + 17, 12.3, '#103655', '800');
  drawText('›', x + 195, y + 17, 12, '#2F5673', '800', 'center');

  let summary = '客群活跃 · 仍有经营机会';
  if (meta.badge === '租金低') summary = '租金较低 · 适合抢先布局';
  if (meta.badge === '竞争高') summary = '竞争激烈 · 适合差异化经营';
  if (meta.badge === '需求↑') summary = '需求上涨 · 可优先进入';
  if (meta.myShopCount > 0) summary = '已开门店 · 可继续深耕经营';

  drawText(summary, x + 109, y + 32, 5.9, '#39627E', '700');

  const metrics = [
    ['人口', district.population.toLocaleString(), '#1E76C5'],
    ['需求', demandSystem.getTotalDemand(district.id).toLocaleString(), '#1E9A5E'],
    ['客单', '¥' + district.avgSpend, '#164A86'],
    ['餐饮店', district.restaurantCount + '家', '#164A86'],
    ['饱和度', district.saturation + '%', '#1E76C5'],
    ['租金', district.rentIndex.toFixed(2), '#164A86']
  ];

  const metricX = x + 105;
  const metricY = y + 40;
  const metricGap = 3;
  const metricW = Math.floor((w - 218 - metricGap * 5) / 6);

  for (let i = 0; i < metrics.length; i++) {
    const mx = metricX + i * (metricW + metricGap);

    roundedRect(
      mx,
      metricY,
      metricW,
      35,
      8,
      '#FAF8F3',
      'rgba(17,62,92,0.10)'
    );

    drawMetricSymbol(
      metrics[i][0],
      mx + metricW / 2,
      metricY + 8.5,
      metrics[i][2]
    );

    drawText(
      metrics[i][0],
      mx + metricW / 2,
      metricY + 18.5,
      4.7,
      '#245276',
      '700',
      'center'
    );

    drawText(
      metrics[i][1],
      mx + metricW / 2,
      metricY + 30,
      5.9,
      metrics[i][2],
      '800',
      'center'
    );
  }

  drawText(
    '实时数据随人口、城市事件、竞争和租金变化',
    x + 108,
    y + h - 11,
    5,
    '#607D92',
    '600'
  );

  roundedRect(
    x + w - 104,
    y + h - 35,
    95,
    29,
    15,
    '#FFC22D',
    '#DFA01B',
    1.15
  );

  drawText(
    '进入商圈  ›',
    x + w - 57,
    y + h - 20.5,
    7.6,
    '#123A53',
    '800',
    'center'
  );

  addButton(
    'district:details',
    x + w - 108,
    y + h - 39,
    103,
    37
  );
};

drawBottomNav = function () {
  const items = [
    { id: 'city', label: '城市' },
    { id: 'shop', label: '门店' },
    { id: 'traffic', label: '客流' },
    { id: 'research', label: '菜单' },
    { id: 'supply', label: '供应链' },
    { id: 'business', label: '数据' },
    { id: 'system', label: '系统' }
  ];

  roundedRect(0, NAV_Y, VIEW_W, NAV_H, 0, 'rgba(4,52,79,0.99)');

  const cellW = VIEW_W / items.length;
  const current = sceneManager.getCurrentId();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const active =
      (item.id === 'city' && current === 'city' && !trafficMode) ||
      (item.id === 'traffic' && current === 'city' && trafficMode) ||
      (
        item.id === 'shop' &&
        (
          current === 'shop' ||
          current === 'propertyMarket' ||
          current === 'equipment' ||
          current === 'license' ||
          current === 'staff' ||
          current === 'renovation'
        )
      ) ||
      (
        item.id !== 'city' &&
        item.id !== 'traffic' &&
        item.id !== 'shop' &&
        item.id === current
      );

    const cellX = i * cellW;

    if (active) {
      roundedRect(
        cellX + 3,
        NAV_Y + 4,
        cellW - 6,
        NAV_H - 8,
        15,
        '#F3BF20',
        '#FFE599',
        1.1
      );
    }

    drawNavIcon(
      item.id,
      cellX + cellW / 2,
      NAV_Y + 21,
      active
    );

    drawText(
      item.label,
      cellX + cellW / 2,
      NAV_Y + 47,
      7.5,
      active ? '#173444' : '#FFFFFF',
      active ? '800' : '700',
      'center'
    );

    addButton(
      'nav:' + item.id,
      cellX,
      NAV_Y,
      cellW,
      NAV_H
    );
  }

  ctx.strokeStyle = 'rgba(86,190,244,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, NAV_Y + 0.5, VIEW_W - 1, NAV_H - 1);
};

console.log('V25_STRICT_HOME_LAYOUT loaded');

/* V26_HARD_REBUILD_HOME */

const V26_HOME_POINTS = {
  university: { x: 0.18, y: 0.17, side: 'right' },
  hightech:   { x: 0.82, y: 0.17, side: 'left'  },
  cbd:        { x: 0.55, y: 0.38, side: 'right' },
  oldtown:    { x: 0.08, y: 0.57, side: 'right' },
  industry:   { x: 0.10, y: 0.76, side: 'right' },
  village:    { x: 0.79, y: 0.57, side: 'left'  },
  market:     { x: 0.81, y: 0.79, side: 'left'  }
};

const V26_HOME_DEFAULT_GOAL_STEPS = ['选址', '装修', '试营业', '经营', '签约'];

function v26GetDistricts() {
  return getDistricts() || [];
}

function v26GetSelectedDistrict() {
  const districts = v26GetDistricts();
  let current = districts.find(function (item) {
    return item.id === selectedDistrictId;
  });

  if (!current) {
    current =
      districts.find(function (item) {
        return item.id === 'market';
      }) ||
      districts[0] ||
      null;
  }

  if (current) {
    selectedDistrictId = current.id;
  }

  return current;
}

function v26GetPoint(districtId) {
  const ratio = V26_HOME_POINTS[districtId];
  if (!ratio) {
    return getDistrictPoint(districtId);
  }

  const top = MAP_Y + 70;
  const bottom = CARD_Y - 36;
  const usableH = Math.max(170, bottom - top);
  return {
    x: Math.round(MAP_X + MAP_W * ratio.x),
    y: Math.round(top + usableH * ratio.y)
  };
}

function v26GetBadgeSummary(meta) {
  if (meta.myShopCount > 0) return '已开门店 · 可继续深耕经营';
  if (meta.badge === '租金低') return '租金较低 · 适合抢先布局';
  if (meta.badge === '竞争高') return '竞争激烈 · 适合差异化经营';
  if (meta.badge === '需求↑') return '需求上涨 · 可优先进入';
  return '客群活跃 · 仍有经营机会';
}

updateLayout = function () {
  TOP_H = (VIEW_H < 740 ? 92 : 96) + SAFE_TOP;
  NAV_H = (VIEW_H < 740 ? 78 : 82) + SAFE_BOTTOM;
  MAP_X = 0;
  MAP_Y = TOP_H;
  MAP_W = VIEW_W;
  NAV_Y = VIEW_H - NAV_H;
  MAP_H = NAV_Y - MAP_Y;
  CARD_H = VIEW_H < 740 ? 118 : 126;
  CARD_X = 7;
  CARD_W = VIEW_W - 14;
  CARD_Y = NAV_Y - CARD_H - 6;
};

drawMapBase = function () {
  const image = resourceManager.getImage('city_base_01');
  if (!image) {
    ctx.fillStyle = COLORS.navy;
    ctx.fillRect(MAP_X, MAP_Y, MAP_W, MAP_H);
    return;
  }

  drawImageFocus(
    ctx,
    image,
    MAP_X,
    MAP_Y,
    MAP_W,
    MAP_H,
    1.49,
    0.52,
    0.545
  );

  const fade = ctx.createLinearGradient(0, MAP_Y, 0, MAP_Y + 115);
  fade.addColorStop(0, 'rgba(6,40,62,0.22)');
  fade.addColorStop(1, 'rgba(6,40,62,0.00)');
  ctx.fillStyle = fade;
  ctx.fillRect(MAP_X, MAP_Y, MAP_W, 115);
};

drawTopHud = function () {
  const player = gameState.getPlayer();
  const world = gameState.getWorld();
  const display = timeSystem.getDisplayState();
  const brand = getBrandState(player);

  let cityName = gameState.getCityName();
  if (!cityName || cityName === '未命名城市') cityName = '美食市';

  const bg = resourceManager.getImage('city_base_01');
  if (bg) {
    drawImageFocus(ctx, bg, 0, 0, VIEW_W, TOP_H, 1.56, 0.54, 0.18);
    ctx.fillStyle = 'rgba(7,41,64,0.60)';
    ctx.fillRect(0, 0, VIEW_W, TOP_H);
  } else {
    ctx.fillStyle = COLORS.navy;
    ctx.fillRect(0, 0, VIEW_W, TOP_H);
  }

  drawCityBadge(cityName, 10, 9 + SAFE_TOP, 44);
  drawText(fitText(cityName, 116, 18, '800'), 66, 20 + SAFE_TOP, 18, COLORS.white, '800');

  roundedRect(145, 12 + SAFE_TOP, 18, 18, 5, 'rgba(4,49,72,0.74)', 'rgba(255,255,255,0.22)');
  drawText('✎', 154, 21 + SAFE_TOP, 7.3, '#FFE08B', '800', 'center');
  addButton('city:rename', 140, 7 + SAFE_TOP, 28, 28);

  drawText('打造属于你的美食之都', 66, 40 + SAFE_TOP, 7.2, '#E7F0F5', '600');
  drawText('品牌：' + ((player.brandName && player.brandName.trim()) || '未命名品牌'), 66, 53 + SAFE_TOP, 6.7, '#E7F0F5', '600');

  drawWeatherGlyph(world.weather, 186, 26 + SAFE_TOP);
  drawText(WEATHER_NAMES[world.weather] || '多云', 210, 17 + SAFE_TOP, 7.6, '#FFFFFF', '800', 'center');
  drawText((Number(world.temperature) || 22) + '℃', 210, 34 + SAFE_TOP, 7.6, '#E9F4F8', '700', 'center');

  roundedRect(230, 9 + SAFE_TOP, 96, 49, 12, 'rgba(5,43,65,0.92)', 'rgba(114,208,244,0.40)');
  drawCashGlyph(246, 26 + SAFE_TOP);
  drawText(fitText('¥' + player.cash.toLocaleString(), 63, 11.8, '800'), 279, 21 + SAFE_TOP, 11.8, '#FFF1A7', '800', 'center');
  drawText('可用资金', 279, 41 + SAFE_TOP, 6.8, '#DCEBF1', '600', 'center');
  roundedRect(309, 16 + SAFE_TOP, 12, 12, 4, '#F5B62D', '#FFE598');
  drawText('+', 315, 22 + SAFE_TOP, 8.5, '#FFFFFF', '800', 'center');

  roundedRect(331, 9 + SAFE_TOP, 52, 49, 12, 'rgba(5,43,65,0.92)', 'rgba(114,208,244,0.40)');
  drawCrownGlyph(344, 26 + SAFE_TOP);
  drawText('Lv.' + brand.level, 362, 19 + SAFE_TOP, 8.4, '#FFE27D', '800', 'center');
  roundedRect(339, 40 + SAFE_TOP, 35, 4, 2, 'rgba(255,255,255,0.22)');
  roundedRect(339, 40 + SAFE_TOP, Math.max(3, 35 * brand.progress), 4, 2, COLORS.gold);
  drawText(brand.reputation + '/100', 357, 50 + SAFE_TOP, 5.2, '#E7F2F6', '600', 'center');
  addButton('brand:status', 328, 5 + SAFE_TOP, 58, 54);

  const speedItems = [
    ['time:pause', timeSystem.isPaused() ? 'Ⅱ' : 'Ⅱ'],
    ['time:speed:1', '1x'],
    ['time:speed:2', '2x'],
    ['time:speed:5', '5x'],
    ['time:speed:10', '10x']
  ];
  const y = TOP_H - 30;
  for (let i = 0; i < speedItems.length; i++) {
    const id = speedItems[i][0];
    const speed = timeSystem.getSpeed();
    const paused = timeSystem.isPaused();
    const active = id === 'time:pause' ? paused : (!paused && Number(id.split(':')[2]) === speed);
    const x = 10 + i * 47;
    roundedRect(x, y, 40, 22, 8, active ? COLORS.gold : 'rgba(4,40,60,0.86)', active ? '#FFE38D' : 'rgba(255,255,255,0.18)');
    drawText(speedItems[i][1], x + 20, y + 11, 8, active ? '#173444' : COLORS.white, '800', 'center');
    addButton(id, x - 3, y - 5, 46, 31);
  }

  const timeText = fitText(display.date + ' · ' + display.time + ' · ' + (MEAL_NAMES[display.mealPeriod] || ''), 172, 6.6, '600');
  drawText(timeText, VIEW_W - 10, y + 11, 6.6, '#E5F0F4', '600', 'right');
};

drawNewsTicker = function () {
  const feed = simulationSystem.getNewsFeed();
  const bulletin = simulationSystem.getBulletin();
  const x = 8;
  const y = MAP_Y + 4;
  const w = VIEW_W - 16;
  const h = 30;

  roundedRect(x, y, w, h, 15, 'rgba(3,41,64,0.96)', 'rgba(77,194,240,0.48)');
  drawText('🔊', x + 16, y + 15.5, 10, '#FFD65A', '800', 'center');
  drawText('城市播报', x + 31, y + 15.5, 7.3, '#FFD65A', '800');

  const items = ((feed && feed.length ? feed : [bulletin])).slice(0, 3);
  const startX = x + 85;
  const sectionW = (w - 109) / 3;
  for (let i = 0; i < 3; i++) {
    const item = items[i] || { title: i === 0 ? '美食节即将盛大开幕' : i === 1 ? '新活动：舌尖上的城市' : '餐饮品牌纷纷入驻' };
    if (i > 0) {
      ctx.fillStyle = 'rgba(230,242,247,0.32)';
      ctx.fillRect(startX + i * sectionW - 6, y + 8, 1, 14);
    }
    drawText(fitText(item.title || '城市运行平稳', sectionW - 12, 6.2, '600'), startX + i * sectionW, y + 15.2, 6.2, '#F3FAFC', '600');
  }

  drawText('›', x + w - 12, y + 15.3, 14, '#FFE49C', '800', 'center');
  addButton('tool:news', x, y, w, h);
};

drawGoalBar = function () {
  const goal = getHomeGoalState();
  const x = 8;
  const y = MAP_Y + 39;
  const w = VIEW_W - 16;
  const h = 28;

  roundedRect(x, y, w, h, 14, 'rgba(3,41,64,0.96)', 'rgba(77,194,240,0.42)');
  drawText('◎', x + 15, y + 14.5, 12.5, '#FFD85C', '800', 'center');
  drawText('当前目标：', x + 28, y + 14.5, 7.1, '#FFD85C', '800');
  drawText('开设餐厅', x + 83, y + 14.5, 7.2, '#FFFFFF', '800');

  const labels = V26_HOME_DEFAULT_GOAL_STEPS;
  let currentIndex = Math.max(0, Math.min(labels.length - 1, goal.current || 0));
  const startX = x + 167;
  const usable = w - 198;
  const gap = usable / (labels.length - 1);

  for (let i = 0; i < labels.length; i++) {
    const cx = startX + i * gap;
    const done = i < currentIndex;
    const active = i === currentIndex && !goal.completed;
    if (i < labels.length - 1) {
      ctx.strokeStyle = i < currentIndex ? '#F6CC4A' : 'rgba(220,234,240,0.38)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + 8, y + 10.5);
      ctx.lineTo(cx + gap - 8, y + 10.5);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, y + 10.5, 5.2, 0, Math.PI * 2);
    ctx.fillStyle = done ? '#F2C744' : (active ? '#FFF8CF' : 'rgba(225,239,244,0.18)');
    ctx.fill();
    ctx.strokeStyle = done || active ? '#FFE58B' : '#9DB8C5';
    ctx.lineWidth = 1;
    ctx.stroke();
    drawText(labels[i], cx, y + 22.8, 5.8, active ? '#FFE08A' : '#E8F3F7', active ? '800' : '600', 'center');
  }
  drawText('🎁', x + w - 13, y + 15, 10, '#FFD85C', '800', 'center');
};

drawDistrictMarker = function (district) {
  const point = v26GetPoint(district.id);
  if (!point) return;
  const x = point.x;
  const y = point.y;
  const selected = selectedDistrictId === district.id;
  const meta = getDistrictVisualMeta(district);
  const config = V26_HOME_POINTS[district.id] || { side: 'right' };
  const animated = districtFx.id === district.id;
  const markerScale = animated ? districtFx.scale : 1;

  if (selected) {
    ctx.beginPath();
    ctx.arc(x, y, 24 + districtFx.flash * 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,195,54,0.16)';
    ctx.fill();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(markerScale, markerScale);
  const key = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
  if (!key || !(typeof v21DrawImage === 'function' && v21DrawImage(key, 0, -4, 44, 56))) {
    drawDistrictPictogram(district.id, 0, -4);
  }
  ctx.restore();

  const boxW = Math.max(94, Math.min(112, 45 + district.name.length * 10));
  const boxXBase = config.side === 'left' ? x - boxW - 12 : x + 12;
  const boxX = Math.max(6, Math.min(VIEW_W - boxW - 6, boxXBase));
  const boxY = Math.max(MAP_Y + 74, Math.min(CARD_Y - 58, y - 14));

  roundedRect(boxX, boxY, boxW, 27, 12, 'rgba(5,53,79,0.97)', selected ? '#FFE06C' : 'rgba(255,218,93,0.82)', selected ? 1.25 : 1);
  drawText(district.name, boxX + 10, boxY + 13.5, 9.1, '#FFFFFF', '800');
  drawText('›', boxX + boxW - 9, boxY + 13.5, 10.1, '#FFE49C', '800', 'center');

  roundedRect(boxX + 5, boxY + 27, boxW - 10, 18, 8, 'rgba(255,253,247,0.98)', 'rgba(11,55,76,0.12)');
  drawText(fitText(meta.subtitle, boxW - 18, 6.0, '700'), boxX + boxW / 2, boxY + 36.5, 6.0, '#23455B', '700', 'center');

  if (meta.badge) {
    const badgeW = Math.max(37, 15 + meta.badge.length * 6.0);
    const badgeX = Math.max(6, Math.min(VIEW_W - badgeW - 6, boxX + boxW - badgeW + 6));
    roundedRect(badgeX, boxY - 9, badgeW, 17, 8, meta.badgeColor, 'rgba(255,245,218,0.98)');
    drawText(meta.badge, badgeX + badgeW / 2, boxY - 0.4, 5.4, '#FFFFFF', '800', 'center');
  }

  if (meta.myShopCount > 0) {
    const txt = meta.myShopCount > 1 ? '✓ 我的店×' + meta.myShopCount : '✓ 我的店';
    const sw = meta.myShopCount > 1 ? 56 : 45;
    const sx = Math.max(6, Math.min(VIEW_W - sw - 6, boxX + boxW - sw + 4));
    roundedRect(sx, boxY - 28, sw, 16, 8, '#1E9A5E', '#B9F0C8');
    drawText(txt, sx + sw / 2, boxY - 20, 5.0, '#FFFFFF', '800', 'center');
  }

  const hitLeft = Math.min(x - 22, boxX - 4);
  const hitRight = Math.max(x + 22, boxX + boxW + 4);
  const hitTop = Math.min(y - 30, boxY - 28);
  const hitBottom = Math.max(y + 28, boxY + 46);
  addButton('district:' + district.id, hitLeft, hitTop, hitRight - hitLeft, hitBottom - hitTop);
};

drawDistrictCard = function () {
  const district = v26GetSelectedDistrict();
  if (!district) return;

  const meta = getDistrictVisualMeta(district);
  const x = CARD_X;
  const y = CARD_Y;
  const w = CARD_W;
  const h = CARD_H;

  roundedRect(x, y, w, h, 18, 'rgba(255,255,255,0.985)', 'rgba(10,56,79,0.16)', 1.1);

  const previewKey = (typeof V24_DISTRICT_PREVIEW_KEYS !== 'undefined') ? V24_DISTRICT_PREVIEW_KEYS[district.id] : null;
  const preview = previewKey ? resourceManager.getImage(previewKey) : resourceManager.getImage('city_base_01');
  const px = x + 11;
  const py = y + 10;
  const pw = 90;
  const ph = h - 20;
  if (preview) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px + 14, py);
    ctx.arcTo(px + pw, py, px + pw, py + ph, 14);
    ctx.arcTo(px + pw, py + ph, px, py + ph, 14);
    ctx.arcTo(px, py + ph, px, py, 14);
    ctx.arcTo(px, py, px + pw, py, 14);
    ctx.closePath();
    ctx.clip();
    drawImageFocus(ctx, preview, px, py, pw, ph, 1.02, 0.5, 0.5);
    ctx.restore();
  }

  const iconKey = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
  if (iconKey && typeof v21DrawImage === 'function') {
    v21DrawImage(iconKey, x + 114, y + 16, 18, 22);
  }

  drawText(district.name, x + 128, y + 16, 13.6, '#103655', '800');
  drawText('›', x + 197, y + 16, 12.8, '#2F5673', '800', 'center');
  drawText(v26GetBadgeSummary(meta), x + 128, y + 32, 6.2, '#39627E', '700');

  const metrics = [
    ['人口', district.population.toLocaleString(), '#1E76C5'],
    ['需求', demandSystem.getTotalDemand(district.id).toLocaleString(), '#1E9A5E'],
    ['客单', '¥' + district.avgSpend, '#164A86'],
    ['餐饮店', district.restaurantCount + '家', '#164A86'],
    ['饱和度', district.saturation + '%', '#1E76C5'],
    ['租金', district.rentIndex.toFixed(2), '#164A86']
  ];

  const metricX = x + 110;
  const metricY = y + 42;
  const metricGap = 4;
  const metricW = Math.floor((w - 224 - metricGap * 5) / 6);
  for (let i = 0; i < metrics.length; i++) {
    const mx = metricX + i * (metricW + metricGap);
    roundedRect(mx, metricY, metricW, 40, 9, '#FAF8F3', 'rgba(17,62,92,0.10)');
    drawMetricSymbol(metrics[i][0], mx + metricW / 2, metricY + 10, metrics[i][2]);
    drawText(metrics[i][0], mx + metricW / 2, metricY + 21, 5.0, '#245276', '700', 'center');
    drawText(metrics[i][1], mx + metricW / 2, metricY + 34, 6.4, metrics[i][2], '800', 'center');
  }

  drawText('实时数据会随人口、城市事件、竞争和租金变化', x + 110, y + h - 18, 5.4, '#607D92', '600');
  roundedRect(x + w - 112, y + h - 46, 102, 34, 17, '#FFC22D', '#DFA01B', 1.2);
  drawText('进入商圈  ›', x + w - 61, y + h - 28, 8.4, '#123A53', '800', 'center');
  addButton('district:details', x + w - 116, y + h - 50, 108, 42);
};

drawBottomNav = function () {
  const items = [
    { id: 'city', label: '城市', mapTo: 'city' },
    { id: 'shop', label: '门店', mapTo: 'shop' },
    { id: 'traffic', label: '客流', mapTo: 'city' },
    { id: 'research', label: '菜单', mapTo: 'menu' },
    { id: 'supply', label: '供应链', mapTo: 'supply' },
    { id: 'business', label: '数据', mapTo: 'business' },
    { id: 'system', label: '系统', mapTo: 'system' }
  ];

  roundedRect(0, NAV_Y, VIEW_W, NAV_H, 0, 'rgba(5,52,79,0.99)');
  const glow = ctx.createLinearGradient(0, NAV_Y, 0, NAV_Y + NAV_H);
  glow.addColorStop(0, 'rgba(23,125,203,0.18)');
  glow.addColorStop(1, 'rgba(23,125,203,0.00)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, NAV_Y, VIEW_W, NAV_H);
  ctx.strokeStyle = 'rgba(85,191,243,0.34)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, NAV_Y + 0.5, VIEW_W - 1, NAV_H - 1);

  const cellW = VIEW_W / items.length;
  const current = sceneManager.getCurrentId();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const active =
      (item.id === 'city' && current === 'city' && !trafficMode) ||
      (item.id === 'traffic' && current === 'city' && trafficMode) ||
      (item.id === 'shop' && (current === 'shop' || current === 'propertyMarket' || current === 'equipment' || current === 'license' || current === 'staff' || current === 'renovation')) ||
      (item.id !== 'city' && item.id !== 'traffic' && item.id !== 'shop' && item.mapTo === current);

    const cellX = i * cellW;
    if (active) {
      roundedRect(cellX + 3, NAV_Y + 5, cellW - 6, NAV_H - 10, 15, '#F3BF20', '#FFE599', 1.1);
    }

    drawNavIcon(item.id, cellX + cellW / 2, NAV_Y + 23, active);
    drawText(item.label, cellX + cellW / 2, NAV_Y + 50, 7.4, active ? '#173444' : '#FFFFFF', active ? '800' : '700', 'center');
    addButton('nav:' + item.id, cellX, NAV_Y, cellW, NAV_H);
  }
};

if (cityScene && typeof cityScene.enter === 'function' && !cityScene.__v26Wrapped) {
  const v26OriginalCityEnter = cityScene.enter;
  cityScene.enter = function () {
    v26OriginalCityEnter.call(this);
    v26GetSelectedDistrict();
  };
  cityScene.__v26Wrapped = true;
}

console.log('V26_HARD_REBUILD_HOME loaded');

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
  '城市餐饮经营小游戏 V26 主页硬重构版启动成功'
);
