'use strict';

const DataSceneBase = require('./dataSceneBase.js');
const sceneManager = require('../core/sceneManager.js');
const gameState = require('../core/gameState.js');
const citySystem = require('../city/citySystem.js');
const demandSystem = require('../city/demandSystem.js');
const analytics = require('../analytics/businessDataHub.js');
const ui = require('../ui/dataWidgets.js');

class DistrictDetailScene extends DataSceneBase {
  constructor() {
    super('districtDetail');
    this.districtId = null;
  }

  enter(payload) {
    super.enter(payload);
    const world = typeof gameState.getWorld === 'function' ? gameState.getWorld() : {};
    this.districtId = payload && payload.districtId || world.currentDistrictId || 'university';
    if (citySystem && typeof citySystem.setCurrentDistrict === 'function') {
      citySystem.setCurrentDistrict(this.districtId);
    }
  }

  context() {
    return { gameState, citySystem, demandSystem, districtId: this.districtId };
  }

  drawOverview(ctx, d, dashboard) {
    const demand = d.demand || 0;
    const opportunity = Math.max(0, Math.min(100,
      55 + (d.avgSpend > 25 ? 8 : 0) + (d.saturation < 70 ? 16 : d.saturation < 85 ? 5 : -12) - Math.max(0, (d.rentIndex - 1) * 14)
    ));

    ui.metricCard(ctx, 10, 116, 116, 69, '当前餐饮需求', ui.number(demand) + '单', '随时段/天气变化');
    ui.metricCard(ctx, 137, 116, 116, 69, '平均客单', ui.money(d.avgSpend), '商圈消费能力');
    ui.metricCard(ctx, 264, 116, 116, 69, '市场饱和', ui.number(d.saturation) + '%', d.saturation >= 85 ? '竞争已经很挤' : '仍有进入空间', { valueColor: d.saturation >= 85 ? ui.COLORS.red : ui.COLORS.text });

    ui.sectionTitle(ctx, '商圈机会判断', 207, '不是单看人流', 390);
    ui.rect(ctx, 10, 221, 370, 94, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    ui.text(ctx, Math.round(opportunity) + '分', 28, 249, 22, opportunity >= 65 ? ui.COLORS.green : opportunity >= 48 ? ui.COLORS.orange : ui.COLORS.red, '700');
    ui.text(ctx, opportunity >= 65 ? '值得重点考察' : opportunity >= 48 ? '需要控制成本' : '进入风险偏高', 95, 242, 10, ui.COLORS.text, '700');
    ui.text(ctx, '需求×客单×竞争×租金综合判断', 95, 261, 6.5, ui.COLORS.muted, '500');
    ui.progress(ctx, 95, 279, 250, opportunity / 100, { fill: opportunity >= 65 ? ui.COLORS.green : opportunity >= 48 ? ui.COLORS.orange : ui.COLORS.red });

    ui.sectionTitle(ctx, '关键市场数据', 339, '', 390);
    ui.rect(ctx, 10, 353, 370, 140, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    ui.row(ctx, 24, 374, 334, '常住/活动人口', ui.number(d.population) + '人');
    ui.divider(ctx, 24, 389, 334);
    ui.row(ctx, 24, 407, 334, '餐饮门店', ui.number(d.restaurantCount) + '家', d.restaurantCount > 150 ? ui.COLORS.orange : ui.COLORS.text);
    ui.divider(ctx, 24, 422, 334);
    ui.row(ctx, 24, 440, 334, '租金指数', ui.number(d.rentIndex, 2), d.rentIndex > 1.35 ? ui.COLORS.red : ui.COLORS.text);
    ui.divider(ctx, 24, 455, 334);
    ui.row(ctx, 24, 473, 334, '竞争等级', d.competition || '—', d.saturation >= 85 ? ui.COLORS.red : ui.COLORS.text);

    ui.sectionTitle(ctx, '我的店在这个商圈', 519, '', 390);
    ui.rect(ctx, 10, 533, 370, 83, { fill: dashboard.store && dashboard.store.districtId === d.id ? ui.COLORS.paleGreen : ui.COLORS.panel, stroke: ui.COLORS.line });
    if (dashboard.store && dashboard.store.districtId === d.id) {
      ui.text(ctx, dashboard.store.name, 24, 555, 10, ui.COLORS.text, '700');
      ui.text(ctx, '今日 ' + ui.number(dashboard.today.orders) + '单 · ' + ui.money(dashboard.today.revenue) + ' · 评分 ' + ui.number(dashboard.today.rating, 2), 24, 578, 7, ui.COLORS.muted, '600');
      ui.text(ctx, '潜在客流转化 ' + ui.percent(dashboard.funnel.conversionRate), 24, 599, 7, ui.COLORS.green, '700');
    } else {
      ui.text(ctx, '当前没有门店落在该商圈', 24, 558, 9, ui.COLORS.muted, '700');
      ui.text(ctx, '先看需求结构和租金，再决定是否找铺', 24, 585, 7, ui.COLORS.muted, '500');
    }
  }

  drawDemand(ctx, d) {
    ui.sectionTitle(ctx, '客群结构', 116, '谁在这里吃饭', 390);
    ui.rect(ctx, 10, 130, 370, 205, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    const mix = d.customerMix || {};
    const rows = Object.keys(mix).map(k => ({ key: k, value: Number(mix[k]) || 0 })).sort((a, b) => b.value - a.value).slice(0, 7);
    if (!rows.length) {
      ui.text(ctx, '当前客群结构暂无详细数据', 195, 225, 9, ui.COLORS.muted, '600', 'center');
    } else {
      rows.forEach((r, i) => {
        const y = 156 + i * 24;
        ui.text(ctx, r.key, 24, y, 7.3, ui.COLORS.text, '700');
        ui.progress(ctx, 82, y - 4, 215, r.value, { fill: i === 0 ? ui.COLORS.gold : ui.COLORS.blue, height: 8 });
        ui.text(ctx, ui.percent(r.value, 0), 353, y, 7.2, ui.COLORS.text, '700', 'right');
      });
    }

    ui.sectionTitle(ctx, '分时段需求', 363, '决定营业时间与人员排班', 390);
    ui.rect(ctx, 10, 377, 370, 169, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    const meal = d.mealDemand || {};
    const defs = [
      ['breakfast', '早餐'], ['lunch', '午餐'], ['afternoon', '下午'], ['dinner', '晚餐'], ['night', '夜宵']
    ];
    const vals = defs.map(x => Number(meal[x[0]]) || 0);
    const max = Math.max(1, ...vals);
    defs.forEach((item, i) => {
      const y = 404 + i * 27;
      const value = vals[i];
      ui.text(ctx, item[1], 24, y, 7, ui.COLORS.text, '700');
      ui.progress(ctx, 75, y - 4, 216, value / max, { fill: ui.COLORS.orange, height: 8 });
      const estimated = value <= 1 ? Math.round(d.demand * value) : Math.round(value);
      ui.text(ctx, ui.number(estimated) + '单', 354, y, 7, ui.COLORS.muted, '700', 'right');
    });

    ui.rect(ctx, 10, 565, 370, 54, { fill: ui.COLORS.paleBlue, stroke: '#BDD7E3' });
    ui.text(ctx, '经营提示', 24, 582, 8, ui.COLORS.text, '700');
    ui.text(ctx, '菜品定价、出餐速度和营业时段应该跟主力客群匹配，而不是只追求高客单。', 24, 603, 6.4, ui.COLORS.muted, '500');
  }

  drawCompetition(ctx, d, dashboard) {
    ui.sectionTitle(ctx, '竞争与成本压力', 116, '', 390);
    ui.metricCard(ctx, 10, 130, 116, 69, '餐饮店数量', ui.number(d.restaurantCount) + '家', '供给规模');
    ui.metricCard(ctx, 137, 130, 116, 69, '市场饱和度', ui.number(d.saturation) + '%', d.saturation >= 85 ? '高压竞争' : '竞争可控', { valueColor: d.saturation >= 85 ? ui.COLORS.red : ui.COLORS.text });
    ui.metricCard(ctx, 264, 130, 116, 69, '租金指数', ui.number(d.rentIndex, 2), d.rentIndex > 1.35 ? '租金偏贵' : '租金正常', { valueColor: d.rentIndex > 1.35 ? ui.COLORS.red : ui.COLORS.text });

    ui.sectionTitle(ctx, '进入商圈要看什么', 225, '', 390);
    ui.rect(ctx, 10, 239, 370, 178, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    const checks = [
      ['需求强度', d.demand > 9000 ? '高' : d.demand > 5000 ? '中' : '低', d.demand > 5000],
      ['客单支撑', d.avgSpend >= 28 ? '强' : d.avgSpend >= 18 ? '中' : '弱', d.avgSpend >= 18],
      ['竞争压力', d.saturation >= 85 ? '高' : d.saturation >= 65 ? '中' : '低', d.saturation < 85],
      ['租金压力', d.rentIndex >= 1.4 ? '高' : d.rentIndex >= 1 ? '中' : '低', d.rentIndex < 1.4]
    ];
    checks.forEach((c, i) => {
      const y = 267 + i * 34;
      ui.text(ctx, c[0], 25, y, 7.5, ui.COLORS.muted, '600');
      ui.text(ctx, c[1], 350, y, 8, c[2] ? ui.COLORS.green : ui.COLORS.red, '700', 'right');
      ui.progress(ctx, 110, y - 4, 190, c[1] === '高' || c[1] === '强' ? 0.85 : c[1] === '中' ? 0.58 : 0.32, { fill: c[2] ? ui.COLORS.green : ui.COLORS.red, height: 8 });
    });

    ui.sectionTitle(ctx, '本店对标', 446, '有店后这里显示你和商圈差距', 390);
    ui.rect(ctx, 10, 460, 370, 125, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    if (dashboard.store && dashboard.store.districtId === d.id) {
      const spendGap = d.avgSpend > 0 ? dashboard.today.avgTicket / d.avgSpend - 1 : null;
      ui.row(ctx, 24, 484, 334, '本店客单 / 商圈客单', ui.money(dashboard.today.avgTicket) + ' / ' + ui.money(d.avgSpend), ui.trendColor(spendGap));
      ui.divider(ctx, 24, 500, 334);
      ui.row(ctx, 24, 520, 334, '本店评分', ui.number(dashboard.today.rating, 2));
      ui.divider(ctx, 24, 536, 334);
      ui.row(ctx, 24, 556, 334, '本店订单转化率', ui.percent(dashboard.funnel.conversionRate));
    } else {
      ui.text(ctx, '当前商圈没有你的门店，开店后自动显示对标。', 195, 523, 8, ui.COLORS.muted, '600', 'center');
    }
  }

  drawActions(ctx) {
    const y = this.contentBottom - 48;
    const buttons = [
      ['action:city', '‹ 城市', 10, 78, '#EDE6DC', ui.COLORS.navy],
      ['action:property', '找铺', 96, 132, ui.COLORS.navy, ui.COLORS.white],
      ['action:store', '我的门店', 236, 144, ui.COLORS.gold, '#26343B']
    ];
    buttons.forEach(b => {
      ui.rect(ctx, b[2], y, b[3], 38, { radius: 10, fill: b[4], stroke: '#D1C5B7' });
      ui.text(ctx, b[1], b[2] + b[3] / 2, y + 19, 8, b[5], '700', 'center');
      this.addButton(b[0], b[2], y, b[3], 38);
    });
  }

  render(ctx) {
    if (!ctx) return;
    this.begin(ctx);
    analytics.syncFromGame(this.context());
    const dashboard = analytics.getDashboard(this.context());
    const d = analytics.getDistrictSnapshot(this.context());
    const player = typeof gameState.getPlayer === 'function' ? gameState.getPlayer() : {};
    ui.header(ctx, d.name + ' · 商圈详情', '先看市场，再决定找铺、定价和经营方式', 390, ui.money(player && player.cash));
    ui.tabBar(ctx, [{label:'概览'}, {label:'客群需求'}, {label:'竞争成本'}], this.tab, 75, this.addButton.bind(this), 390);
    if (this.tab === 0) this.drawOverview(ctx, d, dashboard);
    else if (this.tab === 1) this.drawDemand(ctx, d);
    else this.drawCompetition(ctx, d, dashboard);
    this.drawActions(ctx);
    this.end(ctx);
  }

  handleTap(x, y) {
    const hit = this.handleBaseTap(x, y);
    if (hit === true) return true;
    if (!hit || !hit.id) return false;
    if (hit.id === 'action:city') return sceneManager.switchTo('city');
    if (hit.id === 'action:property') return sceneManager.switchTo('property', { districtId: this.districtId });
    if (hit.id === 'action:store') {
      if (analytics.hasStore(this.context())) return sceneManager.switchTo('storeDetail', { districtId: this.districtId });
      this.showToast('你还没有门店，先去找铺');
      return sceneManager.switchTo('property', { districtId: this.districtId });
    }
    return false;
  }
}

module.exports = new DistrictDetailScene();
