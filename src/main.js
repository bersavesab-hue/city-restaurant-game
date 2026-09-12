'use strict';

const runtime =
  globalThis.GameRuntime;

if (!runtime) {
  throw new Error(
    'GameRuntime 未初始化'
  );
}

const api =
  runtime.api;

const canvas =
  runtime.canvas;

const ctx =
  runtime.ctx;

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

const popupManager =
  require('./core/popupManager.js');

const citySystem =
  require('./city/citySystem.js');

const demandSystem =
  require('./city/demandSystem.js');

/* =========================
   页面
========================= */

const shopScene =
  require('./scenes/shopScene.js');

const researchScene =
  require('./scenes/researchScene.js');

const supplyScene =
  require('./scenes/supplyScene.js');

const businessScene =
  require('./scenes/businessScene.js');

/* =========================
   基础尺寸
========================= */

const DESIGN_W = 390;
const DESIGN_H = 844;

const TOP_H = 100;
const NAV_Y = 766;
const NAV_H = 78;

const COLORS = {
  bg: '#F3EBDD',

  top: '#203B50',

  nav: '#2C2927',

  panel: '#FFF8EE',

  map: '#E7D4B7',

  road: '#C7AC88',

  river: '#79B7C8',

  riverLight: '#D4EDF2',

  block: '#D7C09E',

  text: '#2F211C',

  muted: '#846E63',

  accent: '#E7A43A',

  accentDark: '#A45F2F',

  danger: '#D85745',

  gold: '#D69A31',

  white: '#FFFDF9',

  blue: '#4AA4D8',

  mask: '#101820'
};

/* =========================
   商圈地图坐标
========================= */

const DISTRICT_LAYOUT = {
  oldtown: {
    x: 78,
    y: 228
  },

  cbd: {
    x: 205,
    y: 180
  },

  university: {
    x: 278,
    y: 305
  },

  market: {
    x: 128,
    y: 356
  },

  village: {
    x: 67,
    y: 440
  },

  industry: {
    x: 225,
    y: 457
  },

  hightech: {
    x: 321,
    y: 220
  }
};

/* =========================
   文本映射
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
   Canvas适配
========================= */

let scale = 1;

let offsetX = 0;

let offsetY = 0;

let pixelRatio = 1;

let lastFrameTime =
  null;

const buttons = [];

function getSystemInfo() {
  if (
    api.getSystemInfoSync
  ) {
    return (
      api.getSystemInfoSync()
    );
  }

  return {
    windowWidth:
      DESIGN_W,

    windowHeight:
      DESIGN_H,

    pixelRatio:
      1
  };
}

function resizeCanvas() {
  const info =
    getSystemInfo();

  const screenW =
    info.windowWidth ||
    DESIGN_W;

  const screenH =
    info.windowHeight ||
    DESIGN_H;

  pixelRatio =
    info.pixelRatio ||
    1;

  canvas.width =
    Math.floor(
      screenW *
      pixelRatio
    );

  canvas.height =
    Math.floor(
      screenH *
      pixelRatio
    );

  scale =
    Math.min(
      screenW /
        DESIGN_W,

      screenH /
        DESIGN_H
    );

  offsetX =
    (
      screenW -
      DESIGN_W *
        scale
    ) / 2;

  offsetY =
    (
      screenH -
      DESIGN_H *
        scale
    ) / 2;

  ctx.setTransform(
    pixelRatio *
      scale,

    0,

    0,

    pixelRatio *
      scale,

    offsetX *
      pixelRatio,

    offsetY *
      pixelRatio
  );
}

/* =========================
   基础绘图
========================= */

function roundedRect(
  x,
  y,
  w,
  h,
  r,
  fill,
  stroke
) {
  const radius =
    Math.min(
      r,
      w / 2,
      h / 2
    );

  ctx.beginPath();

  ctx.moveTo(
    x + radius,
    y
  );

  ctx.arcTo(
    x + w,
    y,
    x + w,
    y + h,
    radius
  );

  ctx.arcTo(
    x + w,
    y + h,
    x,
    y + h,
    radius
  );

  ctx.arcTo(
    x,
    y + h,
    x,
    y,
    radius
  );

  ctx.arcTo(
    x,
    y,
    x + w,
    y,
    radius
  );

  ctx.closePath();

  if (fill) {
    ctx.fillStyle =
      fill;

    ctx.fill();
  }

  if (stroke) {
    ctx.strokeStyle =
      stroke;

    ctx.lineWidth =
      1.5;

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

/* =========================
   时间按钮
========================= */

function drawSpeedButton(
  id,
  label,
  x,
  active
) {
  roundedRect(
    x,
    66,
    42,
    24,
    8,

    active
      ? '#F0A93A'
      : '#39566A',

    active
      ? '#FFD98A'
      : '#587286'
  );

  drawText(
    label,
    x + 21,
    78,
    10,
    COLORS.white,

    active
      ? '700'
      : '600',

    'center'
  );

  addButton(
    id,
    x,
    66,
    42,
    24
  );
}

/* =========================
   顶部状态栏
========================= */

function drawTopBar() {
  const world =
    gameState.getWorld();

  const player =
    gameState.getPlayer();

  const display =
    timeSystem
      .getDisplayState();

  const weatherName =
    WEATHER_NAMES[
      world.weather
    ] ||
    world.weather;

  ctx.fillStyle =
    COLORS.top;

  ctx.fillRect(
    0,
    0,
    DESIGN_W,
    TOP_H
  );

  drawText(
    gameState
      .getCityName(),

    16,
    19,
    18,
    COLORS.white,
    '700'
  );

  drawText(
    '¥' +
      player.cash
        .toLocaleString(),

    374,
    19,
    17,
    '#FFD692',
    '700',
    'right'
  );

  drawText(
    display.date,
    16,
    46,
    10,
    '#DCE7EC',
    '500'
  );

  drawText(
    display.time,
    170,
    46,
    17,
    COLORS.white,
    '700',
    'center'
  );

  drawText(
    weatherName +
      ' ' +
      world.temperature +
      '℃',

    374,
    46,
    11,
    '#DCE7EC',
    '600',
    'right'
  );

  drawText(
    '时间',
    16,
    78,
    10,
    '#DCE7EC',
    '600'
  );

  const paused =
    timeSystem
      .isPaused();

  const speed =
    timeSystem
      .getSpeed();

  drawSpeedButton(
    'time:pause',

    paused
      ? '▶'
      : 'Ⅱ',

    62,

    paused
  );

  drawSpeedButton(
    'time:speed:1',
    '1×',
    108,

    !paused &&
    speed === 1
  );

  drawSpeedButton(
    'time:speed:2',
    '2×',
    154,

    !paused &&
    speed === 2
  );

  drawSpeedButton(
    'time:speed:5',
    '5×',
    200,

    !paused &&
    speed === 5
  );

  drawSpeedButton(
    'time:speed:10',
    '10×',
    246,

    !paused &&
    speed === 10
  );

  drawText(
    paused
      ? '已暂停'
      : MEAL_NAMES[
          display.mealPeriod
        ],

    374,
    78,
    11,

    paused
      ? '#FFD692'
      : '#DCE7EC',

    '700',
    'right'
  );
}

/* =========================
   临时城市地图
========================= */

function drawRoad(
  x1,
  y1,
  x2,
  y2
) {
  ctx.beginPath();

  ctx.moveTo(
    x1,
    y1
  );

  ctx.lineTo(
    x2,
    y2
  );

  ctx.strokeStyle =
    COLORS.road;

  ctx.lineWidth =
    7;

  ctx.lineCap =
    'round';

  ctx.stroke();
}

function drawMap() {
  roundedRect(
    10,
    110,
    370,
    636,
    22,
    COLORS.map
  );

  drawRoad(
    45,
    205,
    348,
    232
  );

  drawRoad(
    90,
    130,
    118,
    690
  );

  drawRoad(
    182,
    122,
    250,
    700
  );

  drawRoad(
    310,
    130,
    285,
    680
  );

  drawRoad(
    40,
    400,
    342,
    430
  );

  drawRoad(
    45,
    570,
    340,
    600
  );

  const blocks = [
    [35, 130, 60, 40],
    [120, 140, 50, 48],
    [205, 122, 60, 42],
    [285, 142, 50, 38],

    [40, 265, 55, 42],
    [125, 250, 65, 50],
    [210, 260, 50, 42],
    [295, 275, 48, 42],

    [30, 420, 62, 36],
    [120, 410, 55, 45],
    [235, 430, 58, 40],
    [305, 405, 42, 38],

    [45, 525, 58, 42],
    [128, 540, 70, 48],
    [235, 530, 55, 40],
    [302, 545, 48, 42],

    [35, 625, 65, 42],
    [122, 640, 52, 38],
    [215, 625, 62, 46],
    [300, 645, 45, 38]
  ];

  for (
    let i = 0;
    i < blocks.length;
    i++
  ) {
    const b =
      blocks[i];

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

  ctx.moveTo(
    30,
    670
  );

  ctx.bezierCurveTo(
    90,
    570,
    145,
    610,
    205,
    510
  );

  ctx.bezierCurveTo(
    260,
    420,
    310,
    430,
    365,
    245
  );

  ctx.strokeStyle =
    COLORS.river;

  ctx.lineWidth =
    22;

  ctx.stroke();

  ctx.strokeStyle =
    COLORS.riverLight;

  ctx.lineWidth =
    5;

  ctx.stroke();

  drawText(
    '点击任意商圈查看详情',
    195,
    715,
    11,
    '#6F5A4F',
    '600',
    'center'
  );
}

/* =========================
   商圈
========================= */

function getDistricts() {
  const world =
    gameState.getWorld();

  return (
    citySystem
      .getDistrictsByCity(
        world.currentCityId
      )
  );
}

function drawDistrict(
  district
) {
  const layout =
    DISTRICT_LAYOUT[
      district.id
    ];

  if (!layout) {
    return;
  }

  const selected =
    popupManager.is(
      'districtDetail'
    ) &&
    gameState
      .getWorld()
      .currentDistrictId ===
      district.id;

  const cardW = 88;
  const cardH = 50;

  const x =
    layout.x -
    cardW / 2;

  const y =
    layout.y -
    cardH / 2;

  if (selected) {
    ctx.save();

    ctx.shadowColor =
      'rgba(74,164,216,0.75)';

    ctx.shadowBlur =
      15;

    roundedRect(
      x - 2,
      y - 2,
      cardW + 4,
      cardH + 4,
      15,
      '#FFFDF8',
      COLORS.blue
    );

    ctx.restore();
  } else {
    roundedRect(
      x,
      y,
      cardW,
      cardH,
      14,
      '#FFFDF8'
    );
  }

  drawText(
    district.name,
    layout.x,
    y + 17,
    12,
    COLORS.text,
    '700',
    'center'
  );

  drawText(
    '饱和 ' +
      district.saturation +
      '%',

    layout.x,
    y + 35,
    10,

    district.saturation >=
      85
      ? COLORS.danger
      : COLORS.muted,

    '600',
    'center'
  );

  addButton(
    'district:' +
      district.id,

    x,
    y,
    cardW,
    cardH
  );
}

/* =========================
   商圈弹窗
========================= */

function drawDistrictPopup() {
  if (
    !popupManager.is(
      'districtDetail'
    )
  ) {
    return;
  }

  const data =
    popupManager.getData();

  if (!data) {
    return;
  }

  const d =
    citySystem.getDistrict(
      data.districtId
    );

  if (!d) {
    return;
  }

  const progress =
    popupManager
      .getProgress();

  if (
    progress <= 0
  ) {
    return;
  }

  /*
   * 半透明遮罩
   */

  ctx.save();

  ctx.globalAlpha =
    popupManager
      .getMaskAlpha(
        0.38
      );

  ctx.fillStyle =
    COLORS.mask;

  ctx.fillRect(
    0,
    TOP_H,
    DESIGN_W,
    NAV_Y - TOP_H
  );

  ctx.restore();

  /*
   * 遮罩点击区域
   */

  addButton(
    'popup:mask',
    0,
    TOP_H,
    DESIGN_W,
    NAV_Y - TOP_H
  );

  const panelH =
    230;

  const targetY =
    NAV_Y -
    panelH -
    8;

  const slideOffset =
    popupManager
      .getSlideOffset(
        panelH + 20
      );

  const panelY =
    targetY +
    slideOffset;

  /*
   * 卡片阴影
   */

  ctx.save();

  ctx.shadowColor =
    'rgba(0,0,0,0.28)';

  ctx.shadowBlur =
    18;

  ctx.shadowOffsetY =
    -4;

  roundedRect(
    10,
    panelY,
    370,
    panelH,
    22,
    COLORS.panel
  );

  ctx.restore();

  /*
   * 顶部拖拽提示条
   */

  roundedRect(
    168,
    panelY + 8,
    54,
    5,
    3,
    '#D8C9BB'
  );

  /*
   * 标题
   */

  drawText(
    d.name +
      '商圈',

    25,
    panelY + 34,
    19,
    COLORS.text,
    '700'
  );

  drawText(
    d.saturation >= 85
      ? '竞争激烈'
      : '仍有机会',

    330,
    panelY + 34,
    11,

    d.saturation >= 85
      ? COLORS.danger
      : COLORS.accentDark,

    '700',
    'right'
  );

  /*
   * 关闭按钮
   */

  roundedRect(
    340,
    panelY + 20,
    28,
    28,
    14,
    '#EFE5DA'
  );

  drawText(
    '×',
    354,
    panelY + 34,
    18,
    COLORS.muted,
    '700',
    'center'
  );

  addButton(
    'popup:close',
    336,
    panelY + 16,
    36,
    36
  );

  /*
   * 四项核心数据
   */

  const cols = [
    [
      '人口',
      d.population
        .toLocaleString()
    ],

    [
      '日需求',
      d.baseDemand
        .toLocaleString()
    ],

    [
      '客单',
      '¥' +
        d.avgSpend
    ],

    [
      '餐饮店',
      d.restaurantCount +
        '家'
    ]
  ];

  for (
    let i = 0;
    i <
    cols.length;
    i++
  ) {
    const cx =
      25 +
      i * 86;

    drawText(
      cols[i][0],
      cx,
      panelY + 74,
      10,
      COLORS.muted,
      '500'
    );

    drawText(
      cols[i][1],
      cx,
      panelY + 96,
      14,
      COLORS.text,
      '700'
    );
  }

  /*
   * 实时需求
   */

  const mealPeriod =
    timeSystem
      .getMealPeriod();

  const mealName =
    MEAL_NAMES[
      mealPeriod
    ] ||
    '当前';

  const currentDemand =
    demandSystem
      .getTotalDemand(
        d.id
      );

  roundedRect(
    24,
    panelY + 116,
    342,
    36,
    10,
    '#F5EADC'
  );

  drawText(
    mealName +
      '实时需求',

    36,
    panelY + 134,
    11,
    COLORS.muted,
    '600'
  );

  drawText(
    currentDemand
      .toLocaleString() +
      ' 人次',

    352,
    panelY + 134,
    13,
    COLORS.accentDark,
    '700',
    'right'
  );

  /*
   * 饱和度
   */

  drawText(
    '市场饱和度 ' +
      d.saturation +
      '%',

    25,
    panelY + 169,
    11,
    COLORS.muted,
    '600'
  );

  roundedRect(
    25,
    panelY + 184,
    340,
    8,
    4,
    '#E6D6C3'
  );

  roundedRect(
    25,
    panelY + 184,

    340 *
      (
        d.saturation /
        100
      ),

    8,
    4,

    d.saturation >= 85
      ? COLORS.danger
      : COLORS.gold
  );

  /*
   * 进入商圈
   */

  roundedRect(
    25,
    panelY + 202,
    340,
    36,
    12,
    COLORS.accent
  );

  drawText(
    '进入商圈',
    195,
    panelY + 220,
    14,
    COLORS.white,
    '700',
    'center'
  );

  addButton(
    'popup:enterDistrict',
    25,
    panelY + 198,
    340,
    44
  );
}

/* =========================
   所有弹窗
========================= */

function drawPopupLayer() {
  if (
    !popupManager.isOpen()
  ) {
    return;
  }

  if (
    popupManager.is(
      'districtDetail'
    )
  ) {
    drawDistrictPopup();
  }
}

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
    name: '研发',
    icon: '研'
  },

  {
    id: 'supply',
    name: '供应链',
    icon: '供'
  },

  {
    id: 'business',
    name: '经营',
    icon: '营'
  }
];

function drawBottomNav() {
  const currentId =
    sceneManager
      .getCurrentId();

  const cellW =
    DESIGN_W /
    NAV_ITEMS.length;

  ctx.fillStyle =
    COLORS.nav;

  ctx.fillRect(
    0,
    NAV_Y,
    DESIGN_W,
    NAV_H
  );

  for (
    let i = 0;
    i <
    NAV_ITEMS.length;
    i++
  ) {
    const item =
      NAV_ITEMS[i];

    const active =
      currentId ===
      item.id;

    const cx =
      cellW * i +
      cellW / 2;

    if (active) {
      roundedRect(
        cx - 29,
        NAV_Y + 8,
        58,
        52,
        16,
        '#7A4A36'
      );
    }

    drawText(
      item.icon,
      cx,
      NAV_Y + 25,
      18,
      COLORS.white,
      '700',
      'center'
    );

    drawText(
      item.name,
      cx,
      NAV_Y + 51,
      10,

      active
        ? '#FFD692'
        : '#E7D6CA',

      active
        ? '700'
        : '500',

      'center'
    );

    addButton(
      'nav:' +
        item.id,

      cellW * i,
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
    popupManager
      .closeImmediately();
  },

  update() {
  },

  render() {
    ctx.fillStyle =
      COLORS.bg;

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      DESIGN_H
    );

    drawTopBar();

    drawMap();

    const districts =
      getDistricts();

    for (
      let i = 0;
      i <
      districts.length;
      i++
    ) {
      drawDistrict(
        districts[i]
      );
    }
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
      target.id
        .indexOf(
          'district:'
        ) === 0
    ) {
      const districtId =
        target.id
          .split(':')[1];

      citySystem
        .setCurrentDistrict(
          districtId
        );

      popupManager.open({
        id:
          'districtDetail',

        type:
          'bottomSheet',

        data: {
          districtId
        },

        closeOnMask:
          true,

        pauseGame:
          false,

        animation:
          'slideUp',

        duration:
          260
      });

      return true;
    }

    return false;
  }
};

/* =========================
   注册页面
========================= */

sceneManager.register(
  'city',
  cityScene
);

sceneManager.register(
  'shop',
  shopScene
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
  resizeCanvas();

  buttons.length =
    0;

  ctx.clearRect(
    0,
    0,
    DESIGN_W,
    DESIGN_H
  );

  /*
   * 当前页面
   */

  sceneManager.render(
    ctx
  );

  /*
   * 动态弹窗
   */

  drawPopupLayer();

  /*
   * 底栏放最后，
   * 保持导航永远可以点击
   */

  drawBottomNav();
}

/* =========================
   坐标转换
========================= */

function screenToDesign(
  x,
  y
) {
  return {
    x:
      (
        x -
        offsetX
      ) /
      scale,

    y:
      (
        y -
        offsetY
      ) /
      scale
  };
}

function hitTest(
  x,
  y
) {
  for (
    let i =
      buttons.length - 1;

    i >= 0;

    i--
  ) {
    const b =
      buttons[i];

    if (
      x >= b.x &&
      x <=
        b.x + b.w &&

      y >= b.y &&
      y <=
        b.y + b.h
    ) {
      return b;
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
    ) === 0
  ) {
    const speed =
      Number(
        id
          .split(':')[2]
      );

    if (
      timeSystem
        .setSpeed(
          speed
        )
    ) {
      timeSystem
        .resetAccumulator();

      return true;
    }
  }

  return false;
}

/* =========================
   弹窗点击
========================= */

function handlePopupButton(
  target
) {
  if (
    !target ||
    target.id.indexOf(
      'popup:'
    ) !== 0
  ) {
    return false;
  }

  if (
    target.id ===
    'popup:mask'
  ) {
    popupManager
      .handleMaskTap();

    return true;
  }

  if (
    target.id ===
    'popup:close'
  ) {
    popupManager
      .close();

    return true;
  }

  if (
    target.id ===
    'popup:enterDistrict'
  ) {
    const d =
      citySystem
        .getCurrentDistrict();

    if (
      api.showToast &&
      d
    ) {
      api.showToast({
        title:
          '进入' +
          d.name +
          '商圈',

        icon:
          'none'
      });
    }

    return true;
  }

  return false;
}

/* =========================
   点击处理
========================= */

function handleTap(
  screenX,
  screenY
) {
  const p =
    screenToDesign(
      screenX,
      screenY
    );

  const target =
    hitTest(
      p.x,
      p.y
    );

  /*
   * 时间控制
   */

  if (
    target &&
    target.id
      .indexOf(
        'time:'
      ) === 0
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

  /*
   * 底部导航
   */

  if (
    target &&
    target.id
      .indexOf(
        'nav:'
      ) === 0
  ) {
    popupManager
      .closeImmediately();

    const sceneId =
      target.id
        .split(':')[1];

    sceneManager
      .switchTo(
        sceneId
      );

    render();

    return;
  }

  /*
   * 弹窗按钮优先
   */

  if (
    popupManager
      .isOpen()
  ) {
    if (
      handlePopupButton(
        target
      )
    ) {
      render();

      return;
    }

    /*
     * 弹窗存在时，
     * 不允许点击下面的地图。
     */

    return;
  }

  /*
   * 当前场景
   */

  const currentScene =
    sceneManager
      .getCurrentScene();

  if (
    currentScene &&
    typeof
      currentScene
        .handleTap ===
      'function'
  ) {
    const changed =
      currentScene
        .handleTap(
          p.x,
          p.y,
          target
        );

    if (changed) {
      render();
    }
  }
}

/* =========================
   触摸监听
========================= */

if (
  api.onTouchEnd
) {
  api.onTouchEnd(
    function (event) {
      const touch =
        event
          .changedTouches &&
        event
          .changedTouches[0];

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
    typeof
      requestAnimationFrame ===
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

  /*
   * 当前页面更新
   */

  sceneManager.update(
    deltaMs
  );

  /*
   * 动画更新
   */

  const animationChanged =
    animationManager.update(
      deltaMs
    );

  /*
   * 游戏时间推进
   */

  let advancedMinutes =
    0;

  if (
    !popupManager
      .shouldPauseGame()
  ) {
    advancedMinutes =
      timeSystem.update(
        deltaMs
      );
  }

  /*
   * 时间变化或者动画播放时重绘
   */

  if (
    advancedMinutes > 0 ||
    animationChanged
  ) {
    render();
  }

  scheduleNextFrame(
    gameLoop
  );
}

/* =========================
   启动
========================= */

sceneManager.switchTo(
  'city'
);

render();

scheduleNextFrame(
  gameLoop
);

console.log(
  '城市餐饮经营小游戏启动成功'
);
