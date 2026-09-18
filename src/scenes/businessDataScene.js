'use strict';

const DataSceneBase = require('./dataSceneBase.js');
const sceneManager = require('../ui/managers/sceneManager.js');
const gameState = require('../core/gameState.js');
const citySystem = require('../city/citySystem.js');
const demandSystem = require('../city/demandSystem.js');
const analytics = require('../analytics/businessDataHub.js');
const operatingReports = require('../analytics/operatingReportSystemV122.js');
const dailyCycle = require('../operations/dailyOperatingCycleV0840.js');
const ui = require('../ui/dataWidgets.js');

class BusinessDataScene extends DataSceneBase {
  constructor() {
    super('business');
  }

  context() { return { gameState, citySystem, demandSystem }; }

  drawOverview(ctx, d) {
    const c7 = d.compare7 || {};
    const p = d.pnl || {};
    const f = d.funnel || {};
    const today = d.today || {};
    const avgTicket = Math.max(0, Number(today.avgTicket) || 0);
    const grossMargin = Math.max(0, Number(p.grossMargin) || 0);
    const potentialLoss = Math.round((Number(f.lost) || 0) * avgTicket * grossMargin);
    const variableRate = Number(p.revenue) > 0 ? Math.max(0, Math.min(0.95, Number(p.cogs) / Number(p.revenue))) : 0.35;
    const contributionRate = Math.max(0.05, 1 - variableRate);
    const fixedCost = Math.max(0, (Number(p.wages)||0) + (Number(p.utilities)||0) + (Number(p.rent)||0) + (Number(p.marketing)||0) + (Number(p.maintenance)||0) + (Number(p.other)||0));
    const breakEvenRevenue = Math.round(fixedCost / contributionRate);
    const breakEvenOrders = avgTicket > 0 ? Math.ceil(breakEvenRevenue / avgTicket) : 0;

    ui.metricCompareCard(ctx, 10, 116, 116, 76, '近7日营业额', ui.money(d.last7.revenue), c7.revenue && c7.revenue.delta, '对比前7日');
    ui.metricCompareCard(ctx, 137, 116, 116, 76, '近7日利润', ui.money(d.last7.profit), c7.profit && c7.profit.delta, '对比前7日', { valueColor: d.last7.profit < 0 ? ui.COLORS.red : ui.COLORS.green });
    ui.metricCard(ctx, 264, 116, 116, 76, '今日流失', ui.number(f.lost) + '单', '潜在毛利 -' + ui.money(potentialLoss), { valueColor: f.lost > 0 ? ui.COLORS.red : ui.COLORS.green });

    ui.sectionTitle(ctx, '今天真正要看什么', 220, '只保留能指导决策的数据', 390);
    ui.rect(ctx, 10, 234, 370, 150, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    ui.row(ctx, 24, 260, 334, '今日营业额', ui.money(today.revenue));
    ui.divider(ctx, 24, 276, 334);
    ui.row(ctx, 24, 300, 334, '保本营业额', ui.money(breakEvenRevenue), today.revenue >= breakEvenRevenue ? ui.COLORS.green : ui.COLORS.red);
    ui.divider(ctx, 24, 316, 334);
    ui.row(ctx, 24, 340, 334, '保本订单', ui.number(breakEvenOrders) + '单');
    ui.divider(ctx, 24, 356, 334);
    ui.row(ctx, 24, 376, 334, '潜在毛利损失', ui.money(potentialLoss), potentialLoss > 0 ? ui.COLORS.red : ui.COLORS.green);

    ui.sectionTitle(ctx, '最值得处理的问题', 414, '', 390);
    const alerts = d.alerts || [];
    if (!alerts.length) {
      ui.alertBox(ctx, 10, 428, 370, { level:'info', title:'经营暂时稳定', detail:'没有高优先级异常；继续观察趋势，不需要为了数据而调整。' });
    } else {
      alerts.slice(0, 2).forEach((a, i) => ui.alertBox(ctx, 10, 428 + i * 62, 370, a));
    }
  }

  drawDailyReport(ctx, d) {
    const shopId = gameState.getBusiness().currentShopId || d.store && d.store.id;
    let report = shopId ? operatingReports.latest(shopId) : null;

    if (!report && shopId) {
      const cycleState = dailyCycle.brief(shopId);
      if (cycleState && cycleState.latestClosed) {
        const backfill = operatingReports.capture(shopId, cycleState.latestClosed);
        report = backfill && backfill.ok ? backfill.report : null;
      }
    }

    ui.sectionTitle(ctx, '营业日报', 116, '普通门店按营业日结束生成；24小时门店按04:00切换营业日', 390);

    if (!report) {
      ui.rect(ctx, 10, 132, 370, 170, { fill:ui.COLORS.panel, stroke:ui.COLORS.line });
      ui.text(ctx, '还没有完整营业日报', 195, 181, 10, ui.COLORS.text, '700', 'center');
      ui.text(ctx, '完成第一个营业日后，这里会自动生成收入、利润、菜品、员工与异常复盘。', 195, 218, 6.4, ui.COLORS.muted, '500', 'center');
      ui.text(ctx, '24小时门店不会停业，只在04:00完成上一营业日结算。', 195, 247, 6.4, ui.COLORS.muted, '500', 'center');
      return;
    }

    const s = report.summary || {};
    const c = report.comparison || {};
    const dish = report.dish || {};
    const staff = report.staff || {};

    ui.metricCard(ctx, 10, 132, 116, 73, '营业额', ui.money(s.revenue), c.revenue && c.revenue.delta != null ? '较前日 ' + (c.revenue.delta >= 0 ? '+' : '') + ui.money(c.revenue.delta) : '首日暂无对比');
    ui.metricCard(ctx, 137, 132, 116, 73, '经营利润', ui.money(s.profit), report.costs && report.costs.profitRate ? ui.percent(report.costs.profitRate) + '利润率' : '营业日结果', { valueColor:s.profit >= 0 ? ui.COLORS.green : ui.COLORS.red });
    ui.metricCard(ctx, 264, 132, 116, 73, '订单/顾客', ui.number(s.orders) + '单', ui.number(s.customers) + '人 · 客单' + ui.money(s.avgTicket));

    ui.sectionTitle(ctx, '对比', 224, '昨日变化 + 近7日平均', 390);
    ui.rect(ctx, 10, 238, 370, 92, { fill:ui.COLORS.panel, stroke:ui.COLORS.line });
    ui.row(ctx, 24, 260, 334, '近7日日均营业额', ui.money(report.avg7 && report.avg7.revenue));
    ui.divider(ctx, 24, 276, 334);
    ui.row(ctx, 24, 298, 334, '近7日日均利润', ui.money(report.avg7 && report.avg7.profit), Number(report.avg7 && report.avg7.profit) >= 0 ? ui.COLORS.green : ui.COLORS.red);
    ui.divider(ctx, 24, 314, 334);
    ui.row(ctx, 24, 326, 334, '评分变化', (Number(s.ratingDelta) >= 0 ? '+' : '') + ui.number(s.ratingDelta, 2), Number(s.ratingDelta) >= 0 ? ui.COLORS.green : ui.COLORS.red);

    ui.sectionTitle(ctx, '菜品与员工', 350, '销量、利润贡献和人员覆盖一起看', 390);
    ui.rect(ctx, 10, 364, 370, 74, { fill:ui.COLORS.paleGold, stroke:'#E5C98D' });
    const hot = dish.hotDish;
    const profit = dish.profitChampion;
    ui.text(ctx, '热销', 24, 384, 6.3, ui.COLORS.muted, '700');
    ui.text(ctx, hot ? String(hot.name).slice(0, 14) + ' · ' + ui.number(hot.qty) + '份' : '暂无有效销量', 80, 384, 7.2, ui.COLORS.text, '700');
    ui.text(ctx, '利润贡献', 24, 414, 6.3, ui.COLORS.muted, '700');
    ui.text(ctx, profit ? String(profit.name).slice(0, 12) + ' · ' + ui.money(profit.grossProfit) : '暂无有效数据', 80, 414, 7.2, ui.COLORS.text, '700');
    ui.text(ctx, '员工 ' + ui.number(staff.headcount) + '人' + (staff.coverageFactor > 0 ? ' · 覆盖' + ui.percent(staff.coverageFactor) : ''), 360, 414, 6.2, ui.COLORS.muted, '600', 'right');

    ui.sectionTitle(ctx, '重点问题', 461, '', 390);
    const issues = report.issues || [];
    ui.rect(ctx, 10, 475, 370, 66, { fill: issues.length ? '#FFF6EA' : ui.COLORS.paleBlue, stroke: issues.length ? '#E8C797' : '#BCD3DE' });
    if (!issues.length) {
      ui.text(ctx, '今天没有高优先级异常', 24, 496, 7.2, ui.COLORS.text, '700');
      ui.text(ctx, '保持当前策略，并观察下一营业日是否仍然稳定。', 24, 521, 6.2, ui.COLORS.muted, '500');
    } else {
      issues.slice(0, 2).forEach((item, i) => {
        ui.text(ctx, '• ' + String(item.title || item.detail || '经营异常').slice(0, 24), 24, 495 + i * 27, 6.6, item.level === 'danger' ? ui.COLORS.red : ui.COLORS.text, '700');
      });
    }

    const actionY = 554;
    ui.sectionTitle(ctx, '明日待办', actionY, '系统只保留最值得先处理的3项', 390);
    (report.actions || []).slice(0, 3).forEach((action, i) => {
      const y = actionY + 16 + i * 29;
      ui.rect(ctx, 10, y, 370, 25, { radius:8, fill: action.priority === 'high' ? '#FFF0E4' : '#F6F1E9', stroke: action.priority === 'high' ? '#E8B183' : '#DDD2C4' });
      ui.text(ctx, (i + 1) + '. ' + String(action.title || action.detail || '经营任务').slice(0, 18), 22, y + 12.5, 6.7, ui.COLORS.text, '700');
      ui.text(ctx, '去处理 ›', 364, y + 12.5, 6.4, ui.COLORS.navy, '700', 'right');
      this.addButton('report:action:' + i, 10, y, 370, 25);
    });
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

  drawTrafficReport(ctx, d) {
    const f = d.funnel || {};
    const today = d.today || {};
    const p = d.pnl || {};
    const potentialLoss = Math.round((Number(f.lost)||0) * (Number(today.avgTicket)||0) * Math.max(0, Number(p.grossMargin)||0));

    ui.sectionTitle(ctx, '客流转化', 116, '只看客人在哪一步真正流失', 390);
    ui.metricCard(ctx, 10, 130, 116, 73, '潜在订单', ui.number(f.potential) + '单', '被门店吸引');
    ui.metricCard(ctx, 137, 130, 116, 73, '实际订单', ui.number(f.actual) + '单', ui.percent(f.conversionRate) + '转化');
    ui.metricCard(ctx, 264, 130, 116, 73, '流失订单', ui.number(f.lost) + '单', '约损失' + ui.money(potentialLoss), { valueColor: f.lost > 0 ? ui.COLORS.red : ui.COLORS.green });

    ui.sectionTitle(ctx, '流失原因', 230, '先处理最大的那一项', 390);
    ui.rect(ctx, 10, 244, 370, 214, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    const reasons = f.reasons || {};
    const rows = [
      ['缺货', Number(reasons.stock)||0],
      ['厨房产能', Number(reasons.kitchen)||0],
      ['餐位不足', Number(reasons.seats)||0],
      ['等待过久', Number(reasons.wait)||0],
      ['价格不匹配', Number(reasons.price)||0],
      ['品质/口碑', Number(reasons.quality)||0]
    ].sort((a,b)=>b[1]-a[1]);
    const max = Math.max(1, ...rows.map(x=>x[1]));
    rows.forEach((r, i) => {
      const y = 273 + i * 30;
      ui.text(ctx, r[0], 24, y, 7.1, ui.COLORS.text, '600');
      ui.progress(ctx, 126, y - 4, 170, r[1] / max, { fill: r[1] > 0 ? ui.COLORS.red : '#D8D2CA', height: 8 });
      ui.text(ctx, ui.number(r[1]) + '单', 354, y, 7, r[1] > 0 ? ui.COLORS.red : ui.COLORS.muted, '700', 'right');
    });

    ui.rect(ctx, 10, 482, 370, 94, { fill: ui.COLORS.paleBlue, stroke: '#BCD3DE' });
    ui.text(ctx, '阅读方式', 24, 502, 8, ui.COLORS.text, '700');
    ui.text(ctx, '商圈总需求只作背景；玩家真正要处理的是潜在订单到实际订单之间的流失。', 24, 529, 6.4, ui.COLORS.text, '600');
    ui.text(ctx, '菜品、库存、员工和装修的详细原因回各自页面处理。', 24, 554, 6.4, ui.COLORS.muted, '500');
  }

  drawTrendReport(ctx, d) {
    const c7 = d.compare7 || {};
    ui.sectionTitle(ctx, '经营趋势', 116, '跨期变化放在报表，门店首页只看今天', 390);
    ui.metricCompareCard(ctx, 10, 130, 116, 76, '7日营业额', ui.money(d.last7.revenue), c7.revenue && c7.revenue.delta, '对比前7日');
    ui.metricCompareCard(ctx, 137, 130, 116, 76, '7日订单', ui.number(d.last7.orders), c7.orders && c7.orders.delta, '对比前7日');
    ui.metricCompareCard(ctx, 264, 130, 116, 76, '7日利润', ui.money(d.last7.profit), c7.profit && c7.profit.delta, '对比前7日', { valueColor: d.last7.profit >= 0 ? ui.COLORS.green : ui.COLORS.red });

    ui.rect(ctx, 10, 230, 370, 180, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    ui.text(ctx, '营业额趋势', 24, 252, 7, ui.COLORS.muted, '600');
    ui.sparkline(ctx, 24, 272, 342, 48, d.trend || [], 'revenue', ui.COLORS.blue);
    ui.text(ctx, '利润趋势', 24, 344, 7, ui.COLORS.muted, '600');
    ui.sparkline(ctx, 24, 364, 342, 34, d.trend || [], 'profit', ui.COLORS.green);

    ui.rect(ctx, 10, 436, 370, 116, { fill: ui.COLORS.paleGold, stroke: '#E5C98D' });
    ui.text(ctx, '为什么趋势单独放二级报表', 24, 458, 8, ui.COLORS.text, '700');
    ui.text(ctx, '单日波动适合门店现场决策；7日与更长周期适合判断经营方向。', 24, 486, 6.5, ui.COLORS.text, '600');
    ui.text(ctx, '以后30日、同星期对比、门店间对标都继续扩在这里，不再占一级页面。', 24, 516, 6.2, ui.COLORS.muted, '500');
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
    ui.header(ctx, '经营报表', d.store ? d.store.name + ' · 深度复盘，不占门店首页' : '尚未开店 · 报表将在营业后形成', 390, ui.money(player && player.cash));
    ui.tabBar(ctx, [{label:'总览'}, {label:'日报'}, {label:'财务'}, {label:'客流'}, {label:'趋势'}], this.tab, 75, this.addButton.bind(this), 390);
    if (!d.store) {
      ui.rect(ctx, 12, 130, 366, 170, { fill:ui.COLORS.panel, stroke:ui.COLORS.line });
      ui.text(ctx, '开店后这里形成跨期经营报表。', 195, 185, 9, ui.COLORS.text, '700', 'center');
      ui.text(ctx, '菜品、库存、员工、装修等详细数据回各自模块查看。', 195, 221, 7, ui.COLORS.muted, '500', 'center');
    } else if (this.tab === 0) this.drawOverview(ctx, d);
    else if (this.tab === 1) this.drawDailyReport(ctx, d);
    else if (this.tab === 2) this.drawPnl(ctx, d);
    else if (this.tab === 3) this.drawTrafficReport(ctx, d);
    else this.drawTrendReport(ctx, d);
    this.drawActions(ctx);
    this.end(ctx);
  }

  handleTap(x, y) {
    const hit = this.handleBaseTap(x, y);
    if (hit === true) return true;
    if (!hit || !hit.id) return false;
    const d = analytics.getDashboard(this.context());
    const districtId = d.store && d.store.districtId || d.district && d.district.id;
    const shopId = gameState.getBusiness().currentShopId || d.store && d.store.id;
    if (hit.id.indexOf('report:action:') === 0 && shopId) {
      const report = operatingReports.latest(shopId);
      const index = Number(hit.id.split(':')[2]) || 0;
      const action = report && report.actions && report.actions[index];
      if (action) {
        operatingReports.markActionViewed(shopId, action.id);
        return sceneManager.switchTo(action.routeId || 'shop', { shopId, districtId, source:'operating-report' });
      }
    }
    if (hit.id === 'action:store') return sceneManager.switchTo('shop', { districtId });
    if (hit.id === 'action:district') return sceneManager.switchTo('districtDetail', { districtId });
    if (hit.id === 'action:city') return sceneManager.switchTo('city');
    return false;
  }
}

module.exports = new BusinessDataScene();
