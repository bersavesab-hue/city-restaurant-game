'use strict';

const runtime = globalThis.GameRuntime;
if (!runtime) {
  throw new Error('TrafficDataScene：GameRuntime 未初始化');
}

const api = runtime.api || {};
const gameState = require('../core/gameState.js');
const citySystem = require('../city/citySystem.js');
const demandSystem = require('../city/demandSystem.js');
const customerTrafficSystem = require('../city/customerTrafficSystem.js');
const shopScene = require('./shopScene.js');

const DESIGN_W = 390;
const COLORS = {
  navy: '#12384D',
  navy2: '#0A2A3B',
  paper: '#F4EBDD',
  panel: '#FFF9EF',
  panel2: '#F8F0E4',
  text: '#24323A',
  muted: '#718087',
  gold: '#E4AA48',
  orange: '#D9853E',
  red: '#BF584A',
  green: '#4B9567',
  blue: '#4C86A6',
  line: '#DED1C1',
  white: '#FFFFFF'
};

const TABS = [
  ['overview', '门店概览'],
  ['funnel', '客流漏斗'],
  ['district', '商圈分析'],
  ['loss', '流失原因']
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function money(value) {
  return '¥' + Math.round(Number(value) || 0).toLocaleString('zh-CN');
}

function pct(value) {
  return Math.round(clamp(value, 0, 1) * 100) + '%';
}

function n(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function safeCall(obj, name, fallback) {
  try {
    if (obj && typeof obj[name] === 'function') {
      const value = obj[name]();
      return value == null ? fallback : value;
    }
  } catch (_) {}
  return fallback;
}

function candidateOwnedStore() {
  let direct = null;

  try {
    if (typeof gameState.getStore === 'function') {
      direct = gameState.getStore();
    }
  } catch (_) {}

  if (direct && typeof direct === 'object') {
    return { store: direct, source: 'owned', label: direct.name || '当前门店' };
  }

  const player = safeCall(gameState, 'getPlayer', {}) || {};
  const world = safeCall(gameState, 'getWorld', {}) || {};
  const candidates = [
    player.store,
    player.currentStore,
    player.restaurant,
    world.store,
    world.currentStore,
    world.restaurant
  ];

  for (const item of candidates) {
    if (item && typeof item === 'object') {
      return {
        store: item,
        source: 'owned',
        label: item.name || '当前门店'
      };
    }
  }

  try {
    if (shopScene && typeof shopScene.getSelectedListing === 'function') {
      const selected = shopScene.getSelectedListing();
      if (selected) {
        return {
          store: selected,
          source: 'listing',
          label: selected.address || selected.name || '当前评估铺位'
        };
      }
    }
  } catch (_) {}

  if (shopScene && Array.isArray(shopScene.cachedListings) && shopScene.cachedListings.length) {
    const first = shopScene.cachedListings[0];
    return {
      store: first,
      source: 'listing',
      label: first.address || first.name || '当前评估铺位'
    };
  }

  const worldDistrict = world.currentDistrictId || 'university';
  const district = citySystem.getDistrict(worldDistrict) || citySystem.getCurrentDistrict();
  const avgSpend = district ? Number(district.avgSpend) || 28 : 28;

  return {
    source: 'estimate',
    label: '35㎡成熟小店（经营估算）',
    store: {
      usableArea: 35,
      grossArea: 42,
      footfall: district ? Math.max(2200, (Number(district.baseDemand) || 700) * 5.2) : 4200,
      visibility: 72,
      frontage: 4.2,
      rating: 3.7,
      reputation: 45,
      priceFit: 70,
      menuAppeal: 64,
      averageSpend: avgSpend,
      exhaust: true,
      drainage: true,
      greaseTrap: true,
      fireSprinkler: true,
      threePhase: true,
      staffCount: 3
    }
  };
}

class TrafficDataScene {
  constructor() {
    this.id = 'business';
    this.tab = 'overview';
    this.localButtons = [];
    this.viewH = 780;
    this.navH = 64;
    this.contentBottom = 716;
    this.snapshot = null;
  }

  getLayout() {
    let height = 780;
    if (api && typeof api.getSystemInfoSync === 'function') {
      const info = api.getSystemInfoSync();
      const screenW = Math.max(1, Number(info.windowWidth) || DESIGN_W);
      const screenH = Math.max(1, Number(info.windowHeight) || 780);
      height = screenH / (screenW / DESIGN_W);
    }
    this.viewH = height;
    this.navH = height < 740 ? 60 : 64;
    this.contentBottom = height - this.navH;
  }

  enter() {
    this.tab = 'overview';
    this.refresh();
  }

  exit() {
    this.localButtons = [];
  }

  update() {
    this.refresh();
  }

  refresh() {
    const world = safeCall(gameState, 'getWorld', {}) || {};
    const districtId = world.currentDistrictId || 'university';
    const district = citySystem.getDistrict(districtId) || citySystem.getCurrentDistrict();
    const current = candidateOwnedStore();
    const store = current.store || {};

    let result = null;
    try {
      if (typeof demandSystem.getTrafficFunnel === 'function') {
        result = demandSystem.getTrafficFunnel(districtId, store);
      }
    } catch (_) {}

    if (!result) {
      try {
        const pool = demandSystem.createDemandPool(districtId);
        if (pool) {
          result = customerTrafficSystem.simulate({
            district,
            demandPool: pool,
            store,
            mealPeriod: pool.mealPeriod,
            customerTypes: {}
          });
        }
      } catch (_) {}
    }

    this.snapshot = {
      current,
      store,
      district,
      districtId,
      result,
      format: customerTrafficSystem.classifyStore(store)
    };
  }

  roundedPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  roundedRect(ctx, x, y, w, h, r, fill, stroke) {
    this.roundedPath(ctx, x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  text(ctx, text, x, y, size, color, weight, align) {
    ctx.fillStyle = color || COLORS.text;
    ctx.font = (weight || '500') + ' ' + size + 'px sans-serif';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), x, y);
  }

  addButton(id, x, y, w, h) {
    this.localButtons.push({ id, x, y, w, h });
  }

  metric(ctx, x, y, w, label, value, note) {
    this.roundedRect(ctx, x, y, w, 63, 12, COLORS.panel, COLORS.line);
    this.text(ctx, label, x + 11, y + 13, 7, COLORS.muted, '600');
    this.text(ctx, value, x + 11, y + 34, 14, COLORS.text, '700');
    if (note) this.text(ctx, note, x + 11, y + 52, 6.5, COLORS.muted, '500');
  }

  bar(ctx, x, y, w, label, value, max, color) {
    const safeMax = Math.max(1, Number(max) || 1);
    const ratio = clamp((Number(value) || 0) / safeMax, 0, 1);
    this.text(ctx, label, x, y, 7, COLORS.muted, '600');
    this.text(ctx, n(value), x + w, y, 7, COLORS.text, '700', 'right');
    this.roundedRect(ctx, x, y + 8, w, 8, 4, '#E8DED0');
    this.roundedRect(ctx, x, y + 8, Math.max(3, w * ratio), 8, 4, color || COLORS.blue);
  }

  renderHeader(ctx) {
    const s = this.snapshot || {};
    const current = s.current || { label: '经营数据' };
    const format = s.format || { name: '待识别', seatCapacity: 0, dineInAllowed: false };

    ctx.fillStyle = COLORS.navy2;
    ctx.fillRect(0, 0, DESIGN_W, 68);
    this.text(ctx, '经营数据', 14, 20, 17, COLORS.white, '700');
    this.text(ctx, current.label, 14, 44, 8, 'rgba(255,255,255,.72)', '500');

    this.roundedRect(ctx, 270, 12, 106, 42, 11, 'rgba(255,255,255,.09)', 'rgba(255,255,255,.15)');
    this.text(ctx, format.name, 323, 25, 8, '#FFE8AE', '700', 'center');
    this.text(
      ctx,
      format.dineInAllowed ? '堂食 · ' + n(format.seatCapacity) + '座' : '非堂食经营',
      323,
      43,
      6.5,
      '#D8E5EB',
      '600',
      'center'
    );
  }

  renderTabs(ctx) {
    const y = 76;
    const gap = 4;
    const w = (DESIGN_W - 16 - gap * 3) / 4;
    for (let i = 0; i < TABS.length; i++) {
      const item = TABS[i];
      const active = item[0] === this.tab;
      const x = 8 + i * (w + gap);
      this.roundedRect(ctx, x, y, w, 32, 9, active ? COLORS.gold : '#E8DED0', active ? '#D49434' : '#D5C8B9');
      this.text(ctx, item[1], x + w / 2, y + 16, 7.2, active ? '#26343B' : COLORS.text, '700', 'center');
      this.addButton('tab:' + item[0], x, y, w, 32);
    }
  }

  renderOverview(ctx, top) {
    const s = this.snapshot;
    const r = s && s.result;
    const f = r && r.funnel;
    const format = s.format;
    const district = s.district || {};

    const colW = 177;
    this.metric(ctx, 10, top, colW, '当前餐期门前经过', f ? n(f.periodPassers) + '人' : '—', '不是商圈总人口');
    this.metric(ctx, 203, top, colW, '实际成交顾客', f ? n(f.actualCustomers) + '人' : '—', f ? '尝试转化 ' + pct(r.rates.attemptConversionRate) : '');
    this.metric(ctx, 10, top + 72, colW, '排队等待', r ? n(r.queue.queueCandidates) + '人' : '—', r ? '平均 ' + r.queue.averageWaitMinutes + '分钟' : '');
    this.metric(ctx, 203, top + 72, colW, '顾客流失', f ? n(f.lostCustomers) + '人' : '—', r ? '当前瓶颈：' + this.bottleneckName(r.bottleneck) : '');

    const y = top + 151;
    this.roundedRect(ctx, 10, y, 370, 126, 13, COLORS.panel, COLORS.line);
    this.text(ctx, '经营形态与空间约束', 22, y + 18, 9, COLORS.text, '700');
    this.text(ctx, '可用面积', 22, y + 45, 7, COLORS.muted, '600');
    this.text(ctx, format.usableArea + '㎡', 118, y + 45, 8, COLORS.text, '700', 'right');
    this.text(ctx, '堂食能力', 144, y + 45, 7, COLORS.muted, '600');
    this.text(ctx, format.dineInAllowed ? '支持' : '不支持', 240, y + 45, 8, format.dineInAllowed ? COLORS.green : COLORS.orange, '700', 'right');
    this.text(ctx, '座位上限', 266, y + 45, 7, COLORS.muted, '600');
    this.text(ctx, n(format.seatCapacity) + '座', 366, y + 45, 8, COLORS.text, '700', 'right');

    this.text(ctx, '热厨条件', 22, y + 72, 7, COLORS.muted, '600');
    this.text(ctx, format.hotKitchenReady ? '适配' : '受限', 118, y + 72, 8, format.hotKitchenReady ? COLORS.green : COLORS.red, '700', 'right');
    this.text(ctx, '商圈竞争', 144, y + 72, 7, COLORS.muted, '600');
    this.text(ctx, n(district.saturation) + '%', 240, y + 72, 8, COLORS.text, '700', 'right');
    this.text(ctx, '平均客单', 266, y + 72, 7, COLORS.muted, '600');
    this.text(ctx, money(district.avgSpend || s.store.averageSpend || 0), 366, y + 72, 8, COLORS.text, '700', 'right');

    const warning = format.warnings && format.warnings.length ? format.warnings[0] : '当前面积和基础硬件与经营形态匹配。';
    this.text(ctx, warning, 22, y + 103, 7, format.warnings && format.warnings.length ? COLORS.orange : COLORS.green, '600');
  }

  renderFunnel(ctx, top) {
    const r = this.snapshot && this.snapshot.result;
    if (!r) {
      this.empty(ctx, top, '当前没有足够数据生成客流漏斗。');
      return;
    }

    const f = r.funnel;
    const max = Math.max(1, f.periodPassers);
    const rows = [
      ['门前经过', f.periodPassers, COLORS.blue],
      ['目标客群', f.targetCustomers, '#648FB0'],
      ['注意到门店', f.noticed, COLORS.gold],
      ['产生兴趣', f.interested, COLORS.orange],
      ['尝试进店/下单', f.attempted, '#B06D4B'],
      ['实际成交', f.actualCustomers, COLORS.green]
    ];

    this.roundedRect(ctx, 10, top, 370, 267, 13, COLORS.panel, COLORS.line);
    this.text(ctx, '客流漏斗', 22, top + 18, 9, COLORS.text, '700');
    this.text(ctx, '每一层都能对应具体经营动作，不再只显示一个“客流量”。', 22, top + 36, 6.8, COLORS.muted, '500');

    let y = top + 58;
    for (const row of rows) {
      this.bar(ctx, 24, y, 342, row[0], row[1], max, row[2]);
      y += 32;
    }
  }

  renderDistrict(ctx, top) {
    const s = this.snapshot;
    const d = s.district || {};
    const r = s.result;
    const pool = r && r.demandPool;
    const groups = pool && pool.customerGroups ? Object.values(pool.customerGroups) : [];

    this.metric(ctx, 10, top, 114, '商圈餐饮需求', pool ? n(pool.totalDemand) + '人' : n(d.baseDemand) + '人', '当前餐期');
    this.metric(ctx, 138, top, 114, '餐饮店数量', n(d.restaurantCount) + '家', '竞争供给');
    this.metric(ctx, 266, top, 114, '饱和度', n(d.saturation) + '%', d.saturation >= 85 ? '竞争偏强' : '仍有空间');

    const y = top + 77;
    this.roundedRect(ctx, 10, y, 370, 202, 13, COLORS.panel, COLORS.line);
    this.text(ctx, '主要客群需求', 22, y + 18, 9, COLORS.text, '700');

    if (!groups.length) {
      this.text(ctx, '暂无客群拆分数据。', 22, y + 48, 8, COLORS.muted, '600');
      return;
    }

    const sorted = groups.slice().sort((a, b) => n(b.demand) - n(a.demand)).slice(0, 5);
    const max = Math.max.apply(null, sorted.map(x => n(x.demand)).concat([1]));
    let rowY = y + 48;
    for (const g of sorted) {
      this.bar(ctx, 24, rowY, 342, g.name || g.typeId || '客群', g.demand, max, COLORS.blue);
      rowY += 31;
    }
  }

  renderLoss(ctx, top) {
    const r = this.snapshot && this.snapshot.result;
    if (!r) {
      this.empty(ctx, top, '当前没有足够数据分析流失。');
      return;
    }

    const losses = r.losses || {};
    const total = Math.max(1, r.funnel.lostCustomers || 1);
    const rows = [
      ['排队放弃', losses.lostByQueue || 0, '等太久，速度敏感客群离开'],
      ['厨房产能不足', losses.lostByKitchen || 0, '后厨吞吐限制实际成交'],
      ['前厅服务不足', losses.lostByFrontService || 0, '人员与前厅处理能力不足'],
      ['座位/堂食压力', losses.potentialNoSeatPressure || 0, '面积和座位限制堂食承接']
    ];

    this.roundedRect(ctx, 10, top, 370, 264, 13, COLORS.panel, COLORS.line);
    this.text(ctx, '顾客为什么流失', 22, top + 18, 9, COLORS.text, '700');

    let y = top + 47;
    for (const row of rows) {
      this.text(ctx, row[0], 24, y, 8, COLORS.text, '700');
      this.text(ctx, n(row[1]) + '人', 364, y, 8, row[1] > 0 ? COLORS.red : COLORS.green, '700', 'right');
      this.text(ctx, row[2], 24, y + 17, 6.5, COLORS.muted, '500');
      this.roundedRect(ctx, 24, y + 29, 340, 6, 3, '#E8DED0');
      if (row[1] > 0) this.roundedRect(ctx, 24, y + 29, Math.max(4, 340 * clamp(row[1] / total, 0, 1)), 6, 3, COLORS.red);
      y += 52;
    }
  }

  bottleneckName(id) {
    if (id === 'kitchen') return '厨房';
    if (id === 'front_service') return '前厅服务';
    return '较均衡';
  }

  empty(ctx, top, text) {
    this.roundedRect(ctx, 10, top, 370, 120, 13, COLORS.panel, COLORS.line);
    this.text(ctx, text, 195, top + 60, 8, COLORS.muted, '600', 'center');
  }

  render(ctx) {
    if (!ctx) return;
    this.getLayout();
    this.localButtons = [];
    this.refresh();

    ctx.save();
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, DESIGN_W, this.viewH);

    this.renderHeader(ctx);
    this.renderTabs(ctx);

    const top = 118;
    if (this.tab === 'funnel') this.renderFunnel(ctx, top);
    else if (this.tab === 'district') this.renderDistrict(ctx, top);
    else if (this.tab === 'loss') this.renderLoss(ctx, top);
    else this.renderOverview(ctx, top);

    ctx.restore();
  }

  handleTap(x, y) {
    for (let i = this.localButtons.length - 1; i >= 0; i--) {
      const b = this.localButtons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (b.id.indexOf('tab:') === 0) {
          this.tab = b.id.split(':')[1];
          return true;
        }
      }
    }
    return false;
  }
}

module.exports = new TrafficDataScene();
