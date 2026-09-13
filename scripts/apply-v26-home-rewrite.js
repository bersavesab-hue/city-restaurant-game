"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const mainPath = path.join(ROOT, "src/main.js");
const marker = "\n/* =========================\n   启动\n========================= */";

let source = fs.readFileSync(mainPath, "utf8");

if (!source.includes("V26_HARD_REBUILD_HOME")) {
  const index = source.indexOf(marker);
  if (index < 0) {
    throw new Error("V26无法找到启动标记");
  }

  const block = String.raw`
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
`;

  source = source.slice(0, index) + block + source.slice(index);
  source = source.replace(
    '城市餐饮经营小游戏 V25 严格主页版式版启动成功',
    '城市餐饮经营小游戏 V26 主页硬重构版启动成功'
  );
  source = source.replace(
    '城市餐饮经营小游戏 V24 最终主页资源版启动成功',
    '城市餐饮经营小游戏 V26 主页硬重构版启动成功'
  );

  fs.writeFileSync(mainPath, source, 'utf8');
}

console.log('V26主页硬重构已应用');
