'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const mainPath = path.join(ROOT, 'src/main.js');
const marker = '\n/* =========================\n   启动\n========================= */';

let source = fs.readFileSync(mainPath, 'utf8');

if (source.includes('V21_HOME_ICON_POLISH')) {
  console.log('V21主页图标优化已存在');
} else {
  const index = source.indexOf(marker);
  if (index < 0) {
    throw new Error('V21无法找到启动标记');
  }

  const block = String.raw`
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
`;

  source =
    source.slice(0, index) +
    block +
    source.slice(index);

  source = source.replace(
    '城市餐饮经营小游戏 V20 主页目标图一比一版启动成功',
    '城市餐饮经营小游戏 V21 主页图标重构版启动成功'
  );

  fs.writeFileSync(mainPath, source, 'utf8');
}

const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(
  fs.readFileSync(pkgPath, 'utf8')
);

if (pkg.scripts) {
  delete pkg.scripts.pretest;
}

fs.writeFileSync(
  pkgPath,
  JSON.stringify(pkg, null, 2) + '\n',
  'utf8'
);

try {
  fs.unlinkSync(__filename);
} catch (error) {
}

console.log('V21主页图标与视觉密度重构已应用');
