'use strict';

const DataSceneBase = require('./dataSceneBase.js');
const sceneManager = require('../core/sceneManager.js');
const gameState = require('../core/gameState.js');
const citySystem = require('../city/citySystem.js');
const demandSystem = require('../city/demandSystem.js');
const analytics = require('../analytics/businessDataHub.js');
const ui = require('../ui/dataWidgets.js');
const ratingSystem = require('../rating/ratingSystemV104.js');
const ratingUi = require('../ui/ratingWidgetsV104.js'); // V104_RATING_VISUALIZATION

class StoreDetailScene extends DataSceneBase {
  constructor() {
    super('storeDetail');
  }

  context() {
    return { gameState, citySystem, demandSystem };
  }

  drawKpis(ctx, d) {
    const cmp = d.compareDay || {};
    ui.metricCompareCard(ctx, 10, 116, 116, 76, '营业额', ui.money(d.today.revenue), cmp.revenue && cmp.revenue.delta, '较昨日');
    ui.metricCompareCard(ctx, 137, 116, 116, 76, '订单', ui.number(d.today.orders) + '单', cmp.orders && cmp.orders.delta, '较昨日');
    ui.metricCompareCard(ctx, 264, 116, 116, 76, '经营利润', ui.money(d.today.profit), cmp.profit && cmp.profit.delta, '较昨日', { valueColor: d.today.profit < 0 ? ui.COLORS.red : ui.COLORS.text });

    ui.metricCompareCard(ctx, 10, 200, 116, 76, '客单价', ui.money(d.today.avgTicket), cmp.avgTicket && cmp.avgTicket.delta, '较昨日');
    ui.metricCard(ctx, 137, 200, 116, 76, '毛利率', ui.percent(d.today.grossMargin), d.today.grossMargin < 0.45 ? '偏低，检查菜品成本' : '售价与食材成本');
    ui.metricCard(ctx, 264, 200, 116, 76, '净利率', ui.percent(d.today.profitMargin), d.today.profitMargin < 0.08 ? '利润空间偏薄' : '经营效率');
  }

  drawToday(ctx, d) {
    this.drawKpis(ctx, d);
    ui.sectionTitle(ctx, '今天为什么赚 / 亏', 302, '把结果拆成玩家能行动的数据', 390);
    ui.rect(ctx, 10, 316, 370, 174, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    const p = d.pnl;
    const rows = [
      ['营业收入', p.revenue, ui.COLORS.text],
      ['食材成本', -p.cogs, p.cogs / Math.max(1, p.revenue) > 0.38 ? ui.COLORS.red : ui.COLORS.text],
      ['毛利润', p.grossProfit, p.grossProfit >= 0 ? ui.COLORS.green : ui.COLORS.red],
      ['人工 + 水电', -(p.wages + p.utilities), ui.COLORS.text],
      ['房租 + 营销 + 损耗', -(p.rent + p.marketing + p.wastage), ui.COLORS.text],
      ['经营利润', p.profit, p.profit >= 0 ? ui.COLORS.green : ui.COLORS.red]
    ];
    rows.forEach((r, i) => {
      const y = 339 + i * 25;
      ui.row(ctx, 24, y, 334, r[0], (r[1] >= 0 ? '' : '-') + ui.money(Math.abs(r[1])), r[2]);
      if (i < rows.length - 1) ui.divider(ctx, 24, y + 12, 334);
    });

    ui.sectionTitle(ctx, '近7日趋势', 516, '看趋势，不被单日随机波动误导', 390);
    ui.rect(ctx, 10, 530, 370, 90, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    ui.sparkline(ctx, 22, 548, 225, 45, d.trend || [], 'revenue', ui.COLORS.blue);
    ui.text(ctx, '营业额', 22, 606, 6.5, ui.COLORS.muted, '600');
    ui.text(ctx, '7日 ' + ui.money(d.last7.revenue), 365, 557, 8, ui.COLORS.text, '700', 'right');
    ui.text(ctx, '7日利润 ' + ui.money(d.last7.profit), 365, 581, 7, d.last7.profit >= 0 ? ui.COLORS.green : ui.COLORS.red, '700', 'right');
    ui.text(ctx, '7日客单 ' + ui.money(d.last7.avgTicket), 365, 604, 7, ui.COLORS.muted, '600', 'right');
  }

  drawFunnel(ctx, d) {
    const f = d.funnel;
    ui.sectionTitle(ctx, '顾客转化漏斗', 116, '看清客人在哪一步丢掉', 390);
    ui.rect(ctx, 10, 130, 370, 236, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    const max = Math.max(1, f.totalDemand, f.potential, f.capacity, f.inventoryCapacity, f.actual);
    const rows = [
      ['商圈当期需求', f.totalDemand, ui.COLORS.blue],
      ['进入本店潜在订单', f.potential, ui.COLORS.gold],
      ['接待/厨房能力', f.capacity, ui.COLORS.orange],
      ['库存可支撑订单', f.inventoryCapacity, ui.COLORS.orange],
      ['实际完成订单', f.actual, ui.COLORS.green]
    ];
    rows.forEach((r, i) => {
      const y = 160 + i * 39;
      ui.text(ctx, r[0], 24, y, 7.2, ui.COLORS.text, '700');
      ui.progress(ctx, 139, y - 5, 157, r[1] / max, { fill: r[2], height: 9 });
      ui.text(ctx, ui.number(r[1]) + '单', 355, y, 7, ui.COLORS.text, '700', 'right');
    });

    ui.metricCard(ctx, 10, 382, 116, 73, '转化率', ui.percent(f.conversionRate), '实际 / 潜在');
    ui.metricCard(ctx, 137, 382, 116, 73, '流失订单', ui.number(f.lost) + '单', f.lost > 0 ? '这是最值得优化的钱' : '当前无明显流失', { valueColor: f.lost > 0 ? ui.COLORS.red : ui.COLORS.green });
    ui.metricCard(ctx, 264, 382, 116, 73, '评分', ui.number(d.today.rating, 2), '影响口碑与复购');

    ui.sectionTitle(ctx, '流失原因', 482, '只显示能归因的数据，不虚构', 390);
    ui.rect(ctx, 10, 496, 370, 123, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    const defs = [
      ['缺货', 'stock'], ['厨房产能', 'kitchen'], ['餐位', 'seats'], ['等待', 'wait'], ['价格', 'price'], ['品质', 'quality'], ['其他', 'other']
    ];
    const reasonMax = Math.max(1, ...defs.map(x => Number(f.reasons[x[1]]) || 0));
    defs.slice(0, 6).forEach((x, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const px = 24 + col * 176;
      const py = 522 + row * 31;
      const value = Number(f.reasons[x[1]]) || 0;
      ui.text(ctx, x[0], px, py, 6.8, ui.COLORS.muted, '600');
      ui.progress(ctx, px + 47, py - 4, 83, value / reasonMax, { fill: value > 0 ? ui.COLORS.red : '#D8D2CA', height: 7 });
      ui.text(ctx, ui.number(value), px + 145, py, 6.8, ui.COLORS.text, '700', 'right');
    });
  }

  drawCapacity(ctx, d) {
    const c = d.capacity;
    ui.sectionTitle(ctx, '空间与产能', 116, '装修不是装饰，它决定可接多少生意', 390);
    ui.metricCard(ctx, 10, 130, 116, 72, '餐位', ui.number(c.seats) + '席', c.area ? ui.number(c.seatAreaEfficiency, 2) + '席/㎡' : '当前配置');
    ui.metricCard(ctx, 137, 130, 116, 72, '翻台', ui.number(c.turnoverRate, 2) + '次', '今日顾客 / 餐位');
    ui.metricCard(ctx, 264, 130, 116, 72, '厨房负荷', ui.percent(c.kitchenUtilization), c.kitchenUtilization > 0.92 ? '已接近瓶颈' : '仍有余量', { valueColor: c.kitchenUtilization > 0.92 ? ui.COLORS.red : ui.COLORS.text });

    ui.sectionTitle(ctx, '产能诊断', 229, '', 390);
    ui.rect(ctx, 10, 243, 370, 177, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    ui.row(ctx, 24, 268, 334, '今日接待顾客/订单', ui.number(c.covers));
    ui.divider(ctx, 24, 282, 334);
    ui.row(ctx, 24, 302, 334, '厨房理论能力', ui.number(c.kitchenCapacity) + '单');
    ui.divider(ctx, 24, 316, 334);
    ui.row(ctx, 24, 336, 334, '平均排队/等待', ui.number(c.queueMinutes, 1) + '分钟', c.queueMinutes > 12 ? ui.COLORS.red : ui.COLORS.text);
    ui.divider(ctx, 24, 350, 334);
    ui.row(ctx, 24, 370, 334, '因产能流失', ui.number(c.lostByCapacity) + '单', c.lostByCapacity > 0 ? ui.COLORS.red : ui.COLORS.green);
    ui.divider(ctx, 24, 384, 334);
    ui.row(ctx, 24, 404, 334, '经营面积', c.area ? ui.number(c.area, 1) + '㎡' : '未记录');

    ui.sectionTitle(ctx, '数据应该怎么指导装修', 447, '', 390);
    ui.rect(ctx, 10, 461, 370, 158, { fill: ui.COLORS.paleBlue, stroke: '#BCD3DE' });
    const suggestions = [];
    if (c.kitchenUtilization > 0.92) suggestions.push('后厨已接近满负荷：优先增灶台/备餐/出餐位，而不是继续买流量。');
    if (d.funnel.reasons.seats > 0) suggestions.push('餐位不足正在直接丢单：检查空置区域、桌型和动线。');
    if (c.turnoverRate < 1.2 && c.seats > 0) suggestions.push('餐位不一定少，但翻台偏低：重点查等待、结账和桌型匹配。');
    if (!suggestions.length) suggestions.push('当前没有明显空间瓶颈，装修投资应优先看回报而不是盲目扩容。');
    suggestions.slice(0, 3).forEach((s, i) => ui.text(ctx, '• ' + s, 24, 489 + i * 35, 6.6, ui.COLORS.text, i === 0 ? '700' : '500'));
  }

  drawRisks(ctx, d) {
    ui.sectionTitle(ctx, '经营预警', 116, '只提示真正会影响经营结果的问题', 390);
    const alerts = d.alerts || [];
    if (!alerts.length) {
      ui.rect(ctx, 10, 130, 370, 92, { fill: ui.COLORS.paleGreen, stroke: '#A9D0B7' });
      ui.text(ctx, '当前没有高优先级经营异常', 24, 160, 10, ui.COLORS.green, '700');
      ui.text(ctx, '继续观察趋势，不代表所有指标都已经最优。', 24, 190, 7, ui.COLORS.muted, '500');
    } else {
      alerts.slice(0, 5).forEach((a, i) => ui.alertBox(ctx, 10, 130 + i * 62, 370, a));
    }

    const cashY = alerts.length ? Math.min(this.contentBottom - 150, 130 + Math.min(5, alerts.length) * 62 + 15) : 250;
    if (cashY < this.contentBottom - 85) {
      ui.sectionTitle(ctx, '现金安全', cashY, '', 390);
      ui.rect(ctx, 10, cashY + 14, 370, 88, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
      ui.row(ctx, 24, cashY + 39, 334, '当前现金', ui.money(d.cashflow.cash));
      ui.row(ctx, 24, cashY + 64, 334, '近7日经营净流入', ui.money(d.cashflow.sevenDayNet), d.cashflow.sevenDayNet >= 0 ? ui.COLORS.green : ui.COLORS.red);
      ui.row(ctx, 24, cashY + 89, 334, '按当前支出可维持', d.cashflow.runwayDays == null ? '—' : ui.number(d.cashflow.runwayDays, 1) + '天');
    }
  }


  drawRating(ctx, d) {
    const rating = ratingSystem.evaluateStoreFromDashboard(d);
    const dishes = Array.isArray(d.dishes)
      ? d.dishes.map(item => ratingSystem.evaluateDish(item)).sort((a, b) => b.score - a.score)
      : [];
    const employees = d.staff && Array.isArray(d.staff.staff)
      ? d.staff.staff.map(item => ratingSystem.evaluateEmployee(item)).sort((a, b) => b.score - a.score)
      : [];

    ui.sectionTitle(ctx, '门店经营评级', 116, '经营能力与消费者口碑分开看', 390);
    ui.metricCard(ctx, 10, 130, 116, 72, '经营评级', rating.grade + ' · ' + Math.round(rating.score), rating.gradeLabel, { valueColor: ratingUi.colorForGrade(rating.grade) });
    ui.metricCard(ctx, 137, 130, 116, 72, '消费者口碑', rating.consumerStars.toFixed(2) + ' / 5', '顾客评分，不等于经营评级');
    ui.metricCard(ctx, 264, 130, 116, 72, '较上期', rating.delta == null ? '—' : ((rating.delta > 0 ? '+' : '') + rating.delta.toFixed(1)), rating.trendLabel, { valueColor: rating.delta > 0 ? ui.COLORS.green : rating.delta < 0 ? ui.COLORS.red : ui.COLORS.muted });

    ui.sectionTitle(ctx, '六维结构', 229, '一眼看出真正的短板', 390);
    ui.rect(ctx, 10, 243, 370, 174, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    ratingUi.dimensionRows(ctx, 24, 265, 334, rating, { limit: 6, rowHeight: 24 });

    ui.sectionTitle(ctx, '诊断', 444, '', 390);
    ui.rect(ctx, 10, 458, 370, 72, { fill: ui.COLORS.paleBlue, stroke: '#BCD3DE' });
    ui.text(ctx, ratingUi.insightLine(rating) || '数据积累后会给出优势与短板。', 24, 480, 6.8, ui.COLORS.text, '700');
    const weak = rating.weaknesses && rating.weaknesses[0];
    ui.text(ctx, weak ? ('优先改善：' + weak.label + '，当前 ' + Math.round(weak.score) + ' 分') : '当前没有明显短板', 24, 507, 6.6, weak && weak.score < 70 ? ui.COLORS.red : ui.COLORS.muted, '600');

    ui.sectionTitle(ctx, '菜品与团队', 556, '评级来自现有经营数据', 390);
    ui.rect(ctx, 10, 570, 370, 68, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    const topDish = dishes[0];
    const weakDish = dishes.length ? dishes[dishes.length - 1] : null;
    const topEmployee = employees[0];
    ui.row(ctx, 24, 590, 334, '最高菜品', topDish ? (topDish.name + ' · ' + topDish.grade + ' ' + Math.round(topDish.score)) : '暂无菜品数据', topDish ? ratingUi.colorForGrade(topDish.grade) : ui.COLORS.muted);
    ui.row(ctx, 24, 612, 334, '团队代表', topEmployee ? (topEmployee.name + ' · Lv.' + topEmployee.growthLevel + ' ' + topEmployee.tier) : '暂无员工数据');
    if (weakDish && topDish && weakDish.id !== topDish.id) {
      ui.text(ctx, '菜品短板：' + weakDish.name + ' ' + weakDish.grade + ' ' + Math.round(weakDish.score), 24, 632, 6.2, ui.COLORS.muted, '600');
    }
  }

  drawActions(ctx) {
    const y = this.contentBottom - 48;
    const buttons = [
      ['action:city', '‹ 城市', 10, 72, '#EDE6DC', ui.COLORS.navy],
      ['action:district', '商圈', 90, 82, '#E7EDF0', ui.COLORS.navy],
      ['action:property', '房源', 180, 82, ui.COLORS.navy, ui.COLORS.white],
      ['action:data', '完整数据', 270, 110, ui.COLORS.gold, '#26343B']
    ];
    buttons.forEach(b => {
      ui.rect(ctx, b[2], y, b[3], 38, { radius: 10, fill: b[4], stroke: '#D1C5B7' });
      ui.text(ctx, b[1], b[2] + b[3] / 2, y + 19, 7.5, b[5], '700', 'center');
      this.addButton(b[0], b[2], y, b[3], 38);
    });
  }

  render(ctx) {
    if (!ctx) return;
    this.begin(ctx);
    analytics.syncFromGame(this.context());
    const d = analytics.getDashboard(this.context());
    const store = d.store;
    const player = typeof gameState.getPlayer === 'function' ? gameState.getPlayer() : {};
    if (!store) {
      ui.header(ctx, '我的门店', '你还没有正式经营中的门店', 390, ui.money(player && player.cash));
      ui.rect(ctx, 14, 120, 362, 180, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
      ui.text(ctx, '先找到适合的铺面，签约后这里才显示真实经营数据。', 195, 190, 8.5, ui.COLORS.muted, '600', 'center');
      ui.rect(ctx, 95, 235, 200, 42, { radius: 11, fill: ui.COLORS.gold });
      ui.text(ctx, '去商圈找铺', 195, 256, 9, '#26343B', '700', 'center');
      this.addButton('action:property', 95, 235, 200, 42);
      this.drawActions(ctx);
      this.end(ctx);
      return;
    }

    ui.header(ctx, store.name + ' · 门店详情', (store.address || '当前门店') + ' · 数据用于解释今天为什么赚/亏', 390, ui.money(player && player.cash));
    ui.tabBar(ctx, [{label:'今日'}, {label:'顾客漏斗'}, {label:'产能装修'}, {label:'预警现金'}, {label:'评级'}], this.tab, 75, this.addButton.bind(this), 390);
    if (this.tab === 0) this.drawToday(ctx, d);
    else if (this.tab === 1) this.drawFunnel(ctx, d);
    else if (this.tab === 2) this.drawCapacity(ctx, d);
    else if (this.tab === 3) this.drawRisks(ctx, d);
    else this.drawRating(ctx, d);
    this.drawActions(ctx);
    this.end(ctx);
  }

  handleTap(x, y) {
    const hit = this.handleBaseTap(x, y);
    if (hit === true) return true;
    if (!hit || !hit.id) return false;
    const d = analytics.getDashboard(this.context());
    const districtId = d.store && d.store.districtId || d.district && d.district.id;
    if (hit.id === 'action:city') return sceneManager.switchTo('city');
    if (hit.id === 'action:district') return sceneManager.switchTo('districtDetail', { districtId });
    if (hit.id === 'action:property') return sceneManager.switchTo('property', { districtId });
    if (hit.id === 'action:data') return sceneManager.switchTo('business');
    return false;
  }
}

module.exports = new StoreDetailScene();
