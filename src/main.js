'use strict';

const runtime = globalThis.GameRuntime;

if (!runtime) {
  throw new Error('GameRuntime 未初始化');
}

const api = runtime.api;
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

const popupManager =
  require('./core/popupManager.js');

const resourceManager =
  require('./core/resourceManager.js');

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
   设计尺寸
========================= */

const DESIGN_W = 390;
const DESIGN_H = 844;

const TOP_H = 100;

const MAP_X = 10;
const MAP_Y = 110;
const MAP_W = 370;
const MAP_H = 636;

const NAV_Y = 766;
const NAV_H = 78;

/* =========================
   颜色
========================= */

const COLORS = {
  bg: '#F3EBDD',

  top: '#203B50',

  nav: '#2C2927',

  panel: '#FFF8EE',

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

   后面正式做地图拖动/缩放后
   会继续调整。
========================= */

const DISTRICT_LAYOUT = {
  oldtown: {
    x: 115,
    y: 455
  },

  cbd: {
    x: 220,
    y: 400
  },

  university: {
    x: 105,
    y: 305
  },

  market: {
    x: 82,
    y: 545
  },

  village: {
    x: 135,
    y: 640
  },

  industry: {
    x: 280,
    y: 555
  },

  hightech: {
    x: 285,
    y: 315
  }
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
   Canvas状态
========================= */

let scale = 1;

let offsetX = 0;

let offsetY = 0;

let pixelRatio = 1;

let lastFrameTime = null;

const buttons = [];

/* =========================
   屏幕适配
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
    windowWidth: DESIGN_W,
    windowHeight: DESIGN_H,
    pixelRatio: 1
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

  const targetW =
    Math.floor(
      screenW *
      pixelRatio
    );

  const targetH =
    Math.floor(
      screenH *
      pixelRatio
    );

  /*
   * 只有尺寸变化时才真正调整Canvas。
   * 动画期间不能每帧重新创建画布。
   */
  if (
    canvas.width !== targetW ||
    canvas.height !== targetH
  ) {
    canvas.width =
      targetW;

    canvas.height =
      targetH;
  }

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
    pixelRatio * scale,
    0,
    0,
    pixelRatio * scale,
    offsetX * pixelRatio,
    offsetY * pixelRatio
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
   图片圆角裁切
========================= */

function clipRoundedRect(
  x,
  y,
  w,
  h,
  radius
) {
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

  ctx.clip();
}

/* =========================
   Cover模式绘图

   图片不会被拉伸变形。
========================= */

function drawImageCover(
  image,
  x,
  y,
  w,
  h
) {
  const imageW =
    image.naturalWidth ||
    image.width;

  const imageH =
    image.naturalHeight ||
    image.height;

  if (
    !imageW ||
    !imageH
  ) {
    return;
  }

  const imageRatio =
    imageW /
    imageH;

  const boxRatio =
    w /
    h;

  let sourceX = 0;
  let sourceY = 0;

  let sourceW =
    imageW;

  let sourceH =
    imageH;

  /*
   * 城市图目前本身较宽。
   * 竖屏地图会优先显示中部城区。
   *
   * 后续加入地图拖动和缩放后，
   * 玩家可以浏览整张城市图。
   */
  if (
    imageRatio >
    boxRatio
  ) {
    sourceW =
      imageH *
      boxRatio;

    sourceX =
      (
        imageW -
        sourceW
      ) / 2;
  } else {
    sourceH =
      imageW /
      boxRatio;

    sourceY =
      (
        imageH -
        sourceH
      ) / 2;
  }

  ctx.drawImage(
    image,

    sourceX,
    sourceY,
    sourceW,
    sourceH,

    x,
    y,
    w,
    h
  );
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
   顶部栏
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

  /*
   * 城市名字不再固定。
   */

  drawText(
    gameState
      .getCityName(),

    16,
    19,
    18,
    COLORS.white,
    '700'
  );

  /*
   * 资金
   */

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

  /*
   * 日期
   */

  drawText(
    display.date,
    16,
    46,
    10,
    '#DCE7EC',
    '500'
  );

  /*
   * 当前时间
   */

  drawText(
    display.time,
    170,
    46,
    17,
    COLORS.white,
    '700',
    'center'
  );

  /*
   * 天气
   */

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

  /*
   * 暂停
   */

  drawSpeedButton(
    'time:pause',

    paused
      ? '▶'
      : 'Ⅱ',

    62,

    paused
  );

  /*
   * 1倍
   */

  drawSpeedButton(
    'time:speed:1',
    '1×',
    108,

    !paused &&
    speed === 1
  );

  /*
   * 2倍
   */

  drawSpeedButton(
    'time:speed:2',
    '2×',
    154,

    !paused &&
    speed === 2
  );

  /*
   * 5倍
   */

  drawSpeedButton(
    'time:speed:5',
    '5×',
    200,

    !paused &&
    speed === 5
  );

  /*
   * 10倍
   */

  drawSpeedButton(
    'time:speed:10',
    '10×',
    246,

    !paused &&
    speed === 10
  );

  /*
   * 当前餐饮时段
   */

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
   正式城市地图
========================= */

function drawMap() {
  /*
   * 底色
   */

  roundedRect(
    MAP_X,
    MAP_Y,
    MAP_W,
    MAP_H,
    22,
    '#CBBEAA'
  );

  const image =
    resourceManager
      .getImage(
        'city_base_01'
      );

  /*
   * 图片还没加载完成
   */

  if (!image) {
    drawText(
      '城市地图加载中…',
      DESIGN_W / 2,
      MAP_Y +
        MAP_H / 2,
      13,
      COLORS.muted,
      '600',
      'center'
    );

    return;
  }

  /*
   * 地图圆角区域
   */

  ctx.save();

  clipRoundedRect(
    MAP_X,
    MAP_Y,
    MAP_W,
    MAP_H,
    22
  );

  drawImageCover(
    image,
    MAP_X,
    MAP_Y,
    MAP_W,
    MAP_H
  );

  /*
   * 很轻的暗层。
   * 让商圈标记更清楚。
   */

  ctx.fillStyle =
    'rgba(20,30,35,0.06)';

  ctx.fillRect(
    MAP_X,
    MAP_Y,
    MAP_W,
    MAP_H
  );

  ctx.restore();

  /*
   * 外框
   */

  roundedRect(
    MAP_X,
    MAP_Y,
    MAP_W,
    MAP_H,
    22,
    null,
    'rgba(40,50,55,0.28)'
  );

  /*
   * 地图提示
   */

  roundedRect(
    120,
    706,
    150,
    28,
    14,
    'rgba(20,30,35,0.56)'
  );

  drawText(
    '点击商圈查看详情',
    195,
    720,
    11,
    COLORS.white,
    '700',
    'center'
  );
}

/* =========================
   商圈数据
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

/* =========================
   商圈标记
========================= */

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

  const cardW = 86;
  const cardH = 46;

  const x =
    layout.x -
    cardW / 2;

  const y =
    layout.y -
    cardH / 2;

  /*
   * 选中商圈发光
   */

  if (selected) {
    ctx.save();

    ctx.shadowColor =
      'rgba(74,164,216,0.9)';

    ctx.shadowBlur =
      16;

    roundedRect(
      x - 2,
      y - 2,
      cardW + 4,
      cardH + 4,
      14,
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
      13,
      'rgba(255,253,248,0.94)',
      'rgba(60,55,50,0.18)'
    );
  }

  /*
   * 商圈名字
   */

  drawText(
    district.name,
    layout.x,
    y + 15,
    11,
    COLORS.text,
    '700',
    'center'
  );

  /*
   * 饱和度
   */

  drawText(
    '饱和 ' +
      district.saturation +
      '%',

    layout.x,
    y + 32,
    9,

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
   商圈详情弹窗
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
    popupManager
      .getData();

  if (!data) {
    return;
  }

  const district =
    citySystem
      .getDistrict(
        data.districtId
      );

  if (!district) {
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

  /* =========================
     遮罩
  ========================= */

  ctx.save();

  ctx.globalAlpha =
    popupManager
      .getMaskAlpha(
        0.42
      );

  ctx.fillStyle =
    COLORS.mask;

  ctx.fillRect(
    0,
    TOP_H,
    DESIGN_W,
    NAV_Y -
      TOP_H
  );

  ctx.restore();

  /*
   * 遮罩点击区域。
   */

  addButton(
    'popup:mask',
    0,
    TOP_H,
    DESIGN_W,
    NAV_Y -
      TOP_H
  );

  /* =========================
     底部卡片
  ========================= */

  const panelH =
    230;

  const targetY =
    NAV_Y -
    panelH -
    8;

  const slideOffset =
    popupManager
      .getSlideOffset(
        panelH + 30
      );

  const panelY =
    targetY +
    slideOffset;

  /*
   * 阴影
   */

  ctx.save();

  ctx.shadowColor =
    'rgba(0,0,0,0.32)';

  ctx.shadowBlur =
    20;

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
   * 重要：
   * 吃掉卡片内部的点击，
   * 不让它误触遮罩关闭。
   */

  addButton(
    'popup:panel',
    10,
    panelY,
    370,
    panelH
  );

  /*
   * 顶部拖拽条
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
    district.name +
      '商圈',

    25,
    panelY + 34,
    19,
    COLORS.text,
    '700'
  );

  /*
   * 市场状态
   */

  drawText(
    district.saturation >= 85
      ? '竞争激烈'
      : '仍有机会',

    326,
    panelY + 34,
    11,

    district.saturation >= 85
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

  /* =========================
     四项基础数据
  ========================= */

  const cols = [
    [
      '人口',

      district.population
        .toLocaleString()
    ],

    [
      '日需求',

      district.baseDemand
        .toLocaleString()
    ],

    [
      '客单',

      '¥' +
        district.avgSpend
    ],

    [
      '餐饮店',

      district.restaurantCount +
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

  /* =========================
     实时需求
  ========================= */

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
        district.id
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

  /* =========================
     饱和度
  ========================= */

  drawText(
    '市场饱和度 ' +
      district.saturation +
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
        district.saturation /
        100
      ),

    8,
    4,

    district.saturation >= 85
      ? COLORS.danger
      : COLORS.gold
  );

  /* =========================
     进入商圈
  ========================= */

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
   弹窗层
========================= */

function drawPopupLayer() {
  if (
    !popupManager
      .isOpen()
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
  id: 'city',

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

    /*
     * 点击商圈
     */

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
   注册场景
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

  /*
   * 清空设计区域
   */

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
   * 弹窗层
   */

  drawPopupLayer();

  /*
   * 底部导航
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

/* =========================
   点击检测
========================= */

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
    const button =
      buttons[i];

    if (
      x >= button.x &&
      x <=
        button.x +
        button.w &&

      y >= button.y &&
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
   弹窗按钮
========================= */

function handlePopupButton(
  target
) {
  if (
    !target ||
    target.id
      .indexOf(
        'popup:'
      ) !== 0
  ) {
    return false;
  }

  /*
   * 点遮罩关闭
   */

  if (
    target.id ===
    'popup:mask'
  ) {
    popupManager
      .handleMaskTap();

    return true;
  }

  /*
   * 点弹窗主体：
   * 只拦截，不关闭。
   */

  if (
    target.id ===
    'popup:panel'
  ) {
    return true;
  }

  /*
   * X关闭
   */

  if (
    target.id ===
    'popup:close'
  ) {
    popupManager
      .close();

    return true;
  }

  /*
   * 进入商圈
   */

  if (
    target.id ===
    'popup:enterDistrict'
  ) {
    const district =
      citySystem
        .getCurrentDistrict();

    if (
      district &&
      api &&
      typeof api.showToast ===
        'function'
    ) {
      api.showToast({
        title:
          '进入' +
          district.name +
          '商圈',

        icon:
          'none'
      });
    }

    /*
     * 下一阶段这里会真正进入：
     *
     * 商圈
     * ↓
     * 街道
     * ↓
     * 房源
     */

    return true;
  }

  return false;
}

/* =========================
   总点击逻辑
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

  /*
   * 时间按钮
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
   * 有弹窗时，
   * 弹窗优先处理点击。
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

    return;
  }

  /*
   * 当前页面
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
          point.x,
          point.y,
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
   * 页面更新
   */

  sceneManager.update(
    deltaMs
  );

  /*
   * UI动画
   */

  const animationChanged =
    animationManager.update(
      deltaMs
    );

  /*
   * 游戏时间
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
   * 时间改变或动画播放时重绘。
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
   城市资源
========================= */

function loadCityResources() {
  resourceManager
    .loadImage(
      'city_base_01',

      'assets/images/map/city_base_01.png',

      'city'
    )
    .then(
      function () {
        console.log(
          '城市地图加载成功'
        );

        render();
      }
    )
    .catch(
      function (error) {
        console.error(
          '城市地图加载失败',
          error
        );
      }
    );
}

/* =========================
   启动
========================= */

sceneManager.switchTo(
  'city'
);

/*
 * 先显示UI。
 */

render();

/*
 * 再异步加载地图。
 */

loadCityResources();

/*
 * 开始游戏循环。
 */

scheduleNextFrame(
  gameLoop
);

console.log(
  '城市餐饮经营小游戏启动成功'
);
