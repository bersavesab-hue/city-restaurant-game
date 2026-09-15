'use strict';

const DataSceneBase = require('./dataSceneBase.js');
const sceneManager = require('../core/sceneManager.js');
const gameState = require('../core/gameState.js');
const citySystem = require('../city/citySystem.js');
const demandSystem = require('../city/demandSystem.js');
const analytics = require('../analytics/businessDataHub.js');
const ui = require('../ui/dataWidgets.js');

class BusinessDataScene extends DataSceneBase {
  constructor() {
    super('business');
  }

  context() { return { gameState, citySystem, demandSystem }; }

  drawOverview(ctx, d) {
    const c7 = d.compare7 || {};
    ui.metricCompareCard(ctx, 10, 116, 116, 76, '近7日营业额', ui.money(d.last7.revenue), c7.revenue && c7.revenue.delta, '对比前7日');
    ui.metricCompareCard(ctx, 137, 116, 116, 76, '近7日订单', ui.number(d.last7.orders), c7.orders && c7.orders.delta, '对比前7日');
    ui.metricCompareCard(ctx, 264, 116, 116, 76, '近7日利润', ui.money(d.last7.profit), c7.profit && c7.profit.delta, '对比前7日', { valueColor: d.last7.profit < 0 ? ui.COLORS.red : ui.COLORS.text });

    ui.metricCompareCard(ctx, 10, 200, 116, 76, '7日客单', ui.money(d.last7.avgTicket), c7.avgTicket && c7.avgTicket.delta, '收入 / 订单');
    ui.metricCompareCard(ctx, 137, 200, 116, 76, '毛利率', ui.percent(d.last7.grossMargin), c7.grossMargin && c7.grossMargin.delta, '菜品盈利底盘');
    ui.metricCompareCard(ctx, 264, 200, 116, 76, '净利率', ui.percent(d.last7.profitMargin), c7.profitMargin && c7.profitMargin.delta, '最终经营效率');

    ui.sectionTitle(ctx, '经营趋势', 302, '最近14个经营日', 390);
    ui.rect(ctx, 10, 316, 370, 118, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    ui.sparkline(ctx, 22, 338, 220, 62, d.trend || [], 'revenue', ui.COLORS.blue);
    ui.text(ctx, '营业额', 22, 417, 6.5, ui.COLORS.muted, '600');
    ui.text(ctx, '今日 ' + ui.money(d.today.revenue), 365, 344, 7.3, ui.COLORS.text, '700', 'right');
    ui.text(ctx, '今日利润 ' + ui.money(d.today.profit), 365, 371, 7.3, d.today.profit >= 0 ? ui.COLORS.green : ui.COLORS.red, '700', 'right');
    ui.text(ctx, '转化 ' + ui.percent(d.funnel.conversionRate), 365, 398, 7.3, ui.COLORS.text, '700', 'right');
    ui.text(ctx, '流失 ' + ui.number(d.funnel.lost) + '单', 365, 420, 6.8, d.funnel.lost > 0 ? ui.COLORS.red : ui.COLORS.muted, '700', 'right');

    ui.sectionTitle(ctx, '最值得处理的问题', 461, '', 390);
    const alerts = d.alerts || [];
    if (!alerts.length) {
      ui.alertBox(ctx, 10, 475, 370, { level:'info', title:'经营暂时稳定', detail:'没有高优先级异常；继续看趋势与同周期对比。' });
    } else {
      alerts.slice(0, 2).forEach((a, i) => ui.alertBox(ctx, 10, 475 + i * 62, 370, a));
    }
  }

  drawPnl(ctx, d) {
    const p = d.pnl;
    ui.sectionTitle(ctx, '今日损益表', 116, '营业额不等于赚到的钱', 390);
    ui.rect(ctx, 10, 130, 370, 275, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    const rows = [
      ['营业收入', p.revenue, null],
      ['食材成本', -p.cogs, p.revenue ? p.cogs / p.revenue : 0],
      ['毛利润', p.grossProfit, p.grossMargin],
      ['人工', -p.wages, p.revenue ? p.wages / p.revenue : 0],
      ['水电燃气', -p.utilities, p.revenue ? p.utilities / p.revenue : 0],
      ['房租摊销', -p.rent, p.revenue ? p.rent / p.revenue : 0],
      ['营销', -p.marketing, p.revenue ? p.marketing / p.revenue : 0],
      ['损耗', -p.wastage, p.revenue ? p.wastage / p.revenue : 0],
      ['维护/其他', -(p.maintenance + p.other), p.revenue ? (p.maintenance + p.other) / p.revenue : 0],
      ['经营利润', p.profit, p.profitMargin]
    ];
    rows.forEach((r, i) => {
      const y = 154 + i * 24;
      ui.text(ctx, r[0], 24, y, 7.1, i === rows.length - 1 ? ui.COLORS.text : ui.COLORS.muted, i === 2 || i === rows.length - 1 ? '700' : '600');
      if (r[2] != null) ui.text(ctx, ui.percent(r[2]), 285, y, 6.5, ui.COLORS.muted, '600', 'right');
      const valueColor = r[0] === '经营利润' ? (r[1] >= 0 ? ui.COLORS.green : ui.COLORS.red) : r[0] === '毛利润' ? ui.COLORS.green : ui.COLORS.text;
      ui.text(ctx, (r[1] < 0 ? '-' : '') + ui.money(Math.abs(r[1])), 360, y, 7.5, valueColor, '700', 'right');
      if (i === 1 || i === 8) ui.divider(ctx, 22, y + 12, 340);
    });

    ui.sectionTitle(ctx, '近7日经营结果', 432, '', 390);
    ui.metricCard(ctx, 10, 446, 116, 73, '7日收入', ui.money(d.last7.revenue), ui.number(d.last7.orders) + '单');
    ui.metricCard(ctx, 137, 446, 116, 73, '7日毛利率', ui.percent(d.last7.grossMargin), '食材成本后的空间');
    ui.metricCard(ctx, 264, 446, 116, 73, '7日净利润', ui.money(d.last7.profit), ui.percent(d.last7.profitMargin) + '净利率', { valueColor: d.last7.profit >= 0 ? ui.COLORS.green : ui.COLORS.red });

    ui.rect(ctx, 10, 535, 370, 84, { fill: ui.COLORS.paleGold, stroke: '#E5C98D' });
    ui.text(ctx, '利润阅读规则', 24, 554, 8, ui.COLORS.text, '700');
    ui.text(ctx, '毛利看菜品和采购；净利看人工、房租、损耗和运营效率。', 24, 578, 6.6, ui.COLORS.text, '600');
    ui.text(ctx, '现金变化还会受采购、装修、设备、押金等时点影响，不能和利润混为一谈。', 24, 600, 6.3, ui.COLORS.muted, '500');
  }

  drawDishes(ctx, d) {
    ui.sectionTitle(ctx, '菜品贡献', 116, '销量冠军不一定是利润冠军', 390);
    ui.rect(ctx, 10, 130, 370, 42, { fill:'#EEE7DC' });
    ui.text(ctx, '菜品', 20, 151, 6.6, ui.COLORS.muted, '700');
    ui.text(ctx, '售价/成本', 196, 151, 6.6, ui.COLORS.muted, '700', 'right');
    ui.text(ctx, '毛利率', 260, 151, 6.6, ui.COLORS.muted, '700', 'right');
    ui.text(ctx, '销量', 309, 151, 6.6, ui.COLORS.muted, '700', 'right');
    ui.text(ctx, '利润贡献', 370, 151, 6.6, ui.COLORS.muted, '700', 'right');

    const rows = (d.dishes || []).slice(0, 7);
    if (!rows.length) {
      ui.rect(ctx, 10, 180, 370, 120, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
      ui.text(ctx, '当前菜单没有可统计的菜品经营数据', 195, 240, 8, ui.COLORS.muted, '600', 'center');
    } else {
      rows.forEach((x, i) => {
        const y = 193 + i * 47;
        ui.rect(ctx, 10, y - 16, 370, 41, { radius:8, fill: i % 2 ? '#FAF7F1' : ui.COLORS.panel, stroke:'#E6DED2' });
        ui.text(ctx, String(x.name).slice(0, 11), 20, y - 3, 7.1, ui.COLORS.text, '700');
        ui.text(ctx, x.lifecycle || ('评分 ' + ui.number(x.rating, 1)), 20, y + 13, 5.8, ui.COLORS.muted, '500');
        ui.text(ctx, ui.money(x.price) + '/' + ui.money(x.cost), 196, y, 6.5, ui.COLORS.text, '600', 'right');
        ui.text(ctx, ui.percent(x.grossMargin), 260, y, 6.6, x.grossMargin < 0.45 ? ui.COLORS.red : ui.COLORS.green, '700', 'right');
        ui.text(ctx, ui.number(x.sales), 309, y, 6.6, ui.COLORS.text, '700', 'right');
        ui.text(ctx, ui.money(x.grossProfitContribution), 370, y, 6.6, ui.COLORS.green, '700', 'right');
      });
    }

    const bottomY = Math.min(this.contentBottom - 82, 535);
    if (bottomY > 470) {
      const lowMargin = rows.filter(x => x.grossMargin > 0 && x.grossMargin < 0.45).length;
      ui.alertBox(ctx, 10, bottomY, 370, lowMargin ? { level:'warn', title:'低毛利菜品 ' + lowMargin + ' 个', detail:'优先检查售价、份量和采购成本，不要只盯销量。' } : { level:'info', title:'菜品数据读取规则', detail:'按单份售价、单份成本、销量计算利润贡献，避免“爆款但不赚钱”。' });
    }
  }

  drawSupplyStaff(ctx, d) {
    const s = d.supply;
    const st = d.staff;
    ui.sectionTitle(ctx, '库存与供应链', 116, '库存金额和可支撑天数比“还有几斤”更重要', 390);
    ui.metricCard(ctx, 10, 130, 116, 73, '库存金额', ui.money(s.inventoryValue), '占用的现金');
    ui.metricCard(ctx, 137, 130, 116, 73, '临期风险', ui.money(s.atRiskValue), s.staleCount + '项新鲜度偏低', { valueColor: s.staleCount ? ui.COLORS.red : ui.COLORS.green });
    ui.metricCard(ctx, 264, 130, 116, 73, '低库存', ui.number(s.lowStockCount) + '项', '预计不足1.5天', { valueColor: s.lowStockCount ? ui.COLORS.orange : ui.COLORS.green });

    const items = (s.items || []).slice(0, 4);
    ui.rect(ctx, 10, 219, 370, 133, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    if (!items.length) ui.text(ctx, '还没有可统计库存', 195, 285, 8, ui.COLORS.muted, '600', 'center');
    items.forEach((x, i) => {
      const y = 244 + i * 29;
      ui.text(ctx, String(x.name).slice(0, 9), 24, y, 6.8, ui.COLORS.text, '700');
      ui.text(ctx, ui.number(x.qty, 1) + '｜' + ui.money(x.value), 205, y, 6.4, ui.COLORS.text, '600', 'right');
      ui.text(ctx, x.daysCover == null ? '周转—' : ui.number(x.daysCover, 1) + '天', 278, y, 6.2, x.daysCover != null && x.daysCover < 1.5 ? ui.COLORS.red : ui.COLORS.muted, '700', 'right');
      ui.text(ctx, '鲜' + ui.number(x.freshness), 362, y, 6.2, x.freshness < 35 ? ui.COLORS.red : ui.COLORS.green, '700', 'right');
    });

    ui.sectionTitle(ctx, '员工效率', 379, '人工不能只看人数，要看产出', 390);
    ui.metricCard(ctx, 10, 393, 116, 73, '在岗人数', ui.number(st.headcount) + '人', ui.number(st.laborHours, 1) + '工时');
    ui.metricCard(ctx, 137, 393, 116, 73, '人工成本率', ui.percent(st.laborCostRate), '工资 / 营业额', { valueColor: st.laborCostRate > 0.25 ? ui.COLORS.red : ui.COLORS.text });
    ui.metricCard(ctx, 264, 393, 116, 73, '每工时营收', ui.money(st.revenuePerLaborHour), ui.number(st.ordersPerLaborHour, 1) + '单/工时');

    ui.rect(ctx, 10, 482, 370, 117, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    ui.row(ctx, 24, 507, 334, '今日人工', ui.money(st.wages));
    ui.divider(ctx, 24, 522, 334);
    ui.row(ctx, 24, 542, 334, '平均技能', ui.number(st.averageSkill, 1));
    ui.divider(ctx, 24, 557, 334);
    ui.row(ctx, 24, 577, 334, '平均士气/满意', ui.number(st.averageMorale, 1));
  }

  drawCapacityCash(ctx, d) {
    const c = d.capacity;
    const cf = d.cashflow;
    ui.sectionTitle(ctx, '门店产能', 116, '面积、餐位、后厨、动线最后都要变成订单能力', 390);
    ui.metricCard(ctx, 10, 130, 116, 73, '餐位', ui.number(c.seats) + '席', c.area ? ui.number(c.seatAreaEfficiency, 2) + '席/㎡' : '');
    ui.metricCard(ctx, 137, 130, 116, 73, '翻台率', ui.number(c.turnoverRate, 2) + '次', '顾客 / 餐位');
    ui.metricCard(ctx, 264, 130, 116, 73, '厨房负荷', ui.percent(c.kitchenUtilization), c.kitchenUtilization > 0.92 ? '接近瓶颈' : '仍有余量', { valueColor: c.kitchenUtilization > 0.92 ? ui.COLORS.red : ui.COLORS.text });

    ui.rect(ctx, 10, 219, 370, 143, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    ui.row(ctx, 24, 244, 334, '厨房理论能力', ui.number(c.kitchenCapacity) + '单');
    ui.divider(ctx, 24, 259, 334);
    ui.row(ctx, 24, 279, 334, '今日接待', ui.number(c.covers));
    ui.divider(ctx, 24, 294, 334);
    ui.row(ctx, 24, 314, 334, '等待时间', ui.number(c.queueMinutes, 1) + '分钟', c.queueMinutes > 12 ? ui.COLORS.red : ui.COLORS.text);
    ui.divider(ctx, 24, 329, 334);
    ui.row(ctx, 24, 349, 334, '产能导致流失', ui.number(c.lostByCapacity) + '单', c.lostByCapacity > 0 ? ui.COLORS.red : ui.COLORS.green);

    ui.sectionTitle(ctx, '现金流与生存能力', 389, '利润与现金必须分开看', 390);
    ui.metricCard(ctx, 10, 403, 116, 73, '可用现金', ui.money(cf.cash), '当前资金');
    ui.metricCard(ctx, 137, 403, 116, 73, '7日净现金', ui.money(cf.sevenDayNet), '经营流入-流出', { valueColor: cf.sevenDayNet >= 0 ? ui.COLORS.green : ui.COLORS.red });
    ui.metricCard(ctx, 264, 403, 116, 73, '现金可撑', cf.runwayDays == null ? '—' : ui.number(cf.runwayDays, 1) + '天', '按当前日均支出');

    ui.rect(ctx, 10, 492, 370, 114, { fill: ui.COLORS.paleBlue, stroke: '#BCD3DE' });
    ui.row(ctx, 24, 517, 334, '近7日经营流入', ui.money(cf.sevenDayInflow));
    ui.row(ctx, 24, 543, 334, '近7日经营流出', ui.money(cf.sevenDayOperatingOutflow));
    ui.row(ctx, 24, 569, 334, '月租', ui.money(cf.monthlyRent));
    ui.text(ctx, '装修、设备、押金、贷款等大额现金动作应记录到现金流，而不是混进单日经营利润。', 24, 593, 6.2, ui.COLORS.muted, '500');
  }

  drawActions(ctx) {
    const y = this.contentBottom - 48;
    ui.rect(ctx, 10, y, 92, 38, { radius:10, fill:'#EDE6DC', stroke:'#D1C5B7' });
    ui.text(ctx, '‹ 门店', 56, y + 19, 8, ui.COLORS.navy, '700', 'center');
    this.addButton('action:store', 10, y, 92, 38);
    ui.rect(ctx, 110, y, 122, 38, { radius:10, fill:ui.COLORS.navy, stroke:'#244A60' });
    ui.text(ctx, '商圈对标', 171, y + 19, 8, ui.COLORS.white, '700', 'center');
    this.addButton('action:district', 110, y, 122, 38);
    ui.rect(ctx, 240, y, 140, 38, { radius:10, fill:ui.COLORS.gold, stroke:'#D49434' });
    ui.text(ctx, '返回城市', 310, y + 19, 8, '#26343B', '700', 'center');
    this.addButton('action:city', 240, y, 140, 38);
  }

  render(ctx) {
    if (!ctx) return;
    this.begin(ctx);
    analytics.syncFromGame(this.context());
    const d = analytics.getDashboard(this.context());
    const player = typeof gameState.getPlayer === 'function' ? gameState.getPlayer() : {};
    ui.header(ctx, '经营数据中枢', d.store ? d.store.name + ' · 所有页面共用同一套数据口径' : '尚未开店 · 市场数据仍可查看', 390, ui.money(player && player.cash));
    ui.tabBar(ctx, [{label:'总览'}, {label:'损益'}, {label:'菜品'}, {label:'库存人效'}, {label:'产能现金'}], this.tab, 75, this.addButton.bind(this), 390);
    if (!d.store) {
      ui.rect(ctx, 12, 130, 366, 170, { fill:ui.COLORS.panel, stroke:ui.COLORS.line });
      ui.text(ctx, '开店后这里会自动形成日 / 7日 / 30日经营账。', 195, 185, 9, ui.COLORS.text, '700', 'center');
      ui.text(ctx, '当前可先从城市与商圈详情查看人口、需求、客群、租金和竞争。', 195, 221, 7, ui.COLORS.muted, '500', 'center');
    } else if (this.tab === 0) this.drawOverview(ctx, d);
    else if (this.tab === 1) this.drawPnl(ctx, d);
    else if (this.tab === 2) this.drawDishes(ctx, d);
    else if (this.tab === 3) this.drawSupplyStaff(ctx, d);
    else this.drawCapacityCash(ctx, d);
    this.drawActions(ctx);
    this.end(ctx);
  }

  handleTap(x, y) {
    const hit = this.handleBaseTap(x, y);
    if (hit === true) return true;
    if (!hit || !hit.id) return false;
    const d = analytics.getDashboard(this.context());
    const districtId = d.store && d.store.districtId || d.district && d.district.id;
    if (hit.id === 'action:store') return sceneManager.switchTo('storeDetail', { districtId });
    if (hit.id === 'action:district') return sceneManager.switchTo('districtDetail', { districtId });
    if (hit.id === 'action:city') return sceneManager.switchTo('city');
    return false;
  }
}

module.exports = new BusinessDataScene();
