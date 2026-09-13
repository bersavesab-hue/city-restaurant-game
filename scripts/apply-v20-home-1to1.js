'use strict';

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const FILE =
  path.join(
    ROOT,
    'src/main.js'
  );

const MARK =
  'V20_HOME_REFERENCE_1TO1';

function read() {
  return fs.readFileSync(
    FILE,
    'utf8'
  );
}

function write(value) {
  fs.writeFileSync(
    FILE,
    value
  );
}

function replaceBetween(
  source,
  startMarker,
  endMarker,
  replacement,
  label
) {
  const start =
    source.indexOf(
      startMarker
    );

  if (start < 0) {
    throw new Error(
      'V20找不到开始标记：' +
      label
    );
  }

  const end =
    source.indexOf(
      endMarker,
      start +
        startMarker.length
    );

  if (end < 0) {
    throw new Error(
      'V20找不到结束标记：' +
      label
    );
  }

  return (
    source.slice(
      0,
      start
    ) +
    replacement +
    source.slice(
      end
    )
  );
}

function replaceOnce(
  source,
  before,
  after,
  label
) {
  if (
    !source.includes(
      before
    )
  ) {
    throw new Error(
      'V20找不到替换目标：' +
      label
    );
  }

  return source.replace(
    before,
    after
  );
}

let source =
  read();

if (
  source.includes(
    MARK
  )
) {
  console.log(
    'V20主页一比一重构已应用'
  );
  process.exit(
    0
  );
}

source =
  source.replace(
    "'use strict';",
    "'use strict';\n\n// " +
      MARK
  );

source =
  replaceOnce(
    source,
    `const simulationConfig =
  require('./core/simulationConfig.js');`,
    `const simulationConfig =
  require('./core/simulationConfig.js');

const openingPrepSystem =
  require('./opening/openingPrepSystem.js');

const textInput =
  require('./ui/textInput.js');`,
    '主页动态目标依赖'
  );

source =
  replaceBetween(
    source,
    'const NAV_ITEMS = [',
    '\n/* =========================\n   地图小工具',
    `const NAV_ITEMS = [
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
`,
    '底部导航'
  );

source =
  replaceOnce(
    source,
    `let selectedDistrictId =
  null;`,
    `let selectedDistrictId =
  null;

let trafficMode =
  false;`,
    '客流模式状态'
  );

const extraHelpers = `
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

`;

source =
  replaceBetween(
    source,
    'function drawCityBadge(',
    '\nfunction drawDistrictThumb(',
    `function drawCityBadge(
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
`,
    '顶部城市缩略图'
  );


source =
  replaceOnce(
    source,
    'function drawDistrictThumb(\n',
    extraHelpers +
      'function drawDistrictThumb(\n',
    '主页目标与客流辅助函数'
  );

source =
  replaceBetween(
    source,
    'function drawTopHud() {',
    '\n/* =========================\n   城市地图',
    `function drawTopHud() {
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
`,
    '目标图顶部HUD'
  );

source =
  replaceBetween(
    source,
    'function drawDistrictMarker(',
    '\nfunction startDistrictFx(',
    `function drawDistrictMarker(
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
`,
    '目标图商圈气泡'
  );

source =
  replaceBetween(
    source,
    'function drawNewsTicker() {',
    '\n/* =========================\n   地图侧边按钮',
    `function drawNewsTicker() {
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
`,
    '目标图城市通报'
  );

source =
  replaceBetween(
    source,
    'function drawDistrictCard() {',
    '\n/* =========================\n   底部导航',
    `function drawDistrictCard() {
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
`,
    '目标图商圈信息卡'
  );

source =
  replaceBetween(
    source,
    'function drawBottomNav() {',
    '\n/* =========================\n   城市场景',
    `function drawBottomNav() {
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
`,
    '目标图底部导航'
  );

source =
  replaceOnce(
    source,
    `  } else if (
    id ===
    'renovation'
  ) {
    ctx.beginPath();
    ctx.moveTo(
      cx - 8,
      cy + 8
    );
    ctx.lineTo(
      cx + 4,
      cy - 4
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      cx,
      cy - 8
    );
    ctx.lineTo(
      cx + 8,
      cy
    );
    ctx.lineTo(
      cx + 4,
      cy + 4
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      cx - 10,
      cy + 5
    );
    ctx.lineTo(
      cx - 5,
      cy + 10
    );
    ctx.stroke();
  } else if (`,
    `  } else if (
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
  } else if (`,
    '客流底栏图标'
  );

source =
  replaceOnce(
    source,
    `    drawMapBase();

    const districts =
      getDistricts();`,
    `    drawMapBase();

    drawNewsTicker();

    drawGoalBar();

    drawTrafficOverlay();

    const districts =
      getDistricts();`,
    '主页叠层顺序'
  );

source =
  replaceOnce(
    source,
    `    drawNewsTicker();

    drawSideTools();

    drawDistrictCard();`,
    `    drawSideTools();

    drawDistrictCard();`,
    '避免重复绘制通报'
  );

source =
  replaceBetween(
    source,
    `  handleTap(
    x,
    y,
    target
  ) {`,
    `    return false;
  }
};

/* =========================
   页面注册`,
    `  handleTap(
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
   页面注册`,
    '城市页交互'
  );

source =
  replaceBetween(
    source,
    `  if (
    target.id.indexOf(
      'nav:'
    ) ===
    0
  ) {`,
    `  const scene =
    sceneManager
      .getCurrentScene();`,
    `  if (
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
`,
    '底栏客流真实交互'
  );

source =
  source.replace(
    '城市餐饮经营小游戏 V19 城市首页精修版启动成功',
    '城市餐饮经营小游戏 V20 主页目标图一比一版启动成功'
  );

write(
  source
);

const packagePath =
  path.join(
    ROOT,
    'package.json'
  );

const pkg =
  JSON.parse(
    fs.readFileSync(
      packagePath,
      'utf8'
    )
  );

if (
  pkg.scripts &&
  pkg.scripts.pretest ===
    'node scripts/apply-v20-home-1to1.js'
) {
  delete pkg.scripts.pretest;
}

fs.writeFileSync(
  packagePath,
  JSON.stringify(
    pkg,
    null,
    2
  ) +
    '\n'
);

try {
  fs.unlinkSync(
    path.join(
      ROOT,
      'scripts/apply-v20-home-1to1.js'
    )
  );
} catch (
  error
) {
}

console.log(
  'V20主页目标图一比一重构已应用'
);
