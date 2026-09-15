'use strict';

const DataSceneBase = require('./dataSceneBase.js');
const sceneManager = require('../core/sceneManager.js');
const gameState = require('../core/gameState.js');
const ui = require('../ui/dataWidgets.js');

class MoreScene extends DataSceneBase {
  constructor() {
    super('more');
  }

  currentShop() {
    const business = typeof gameState.getBusiness === 'function'
      ? gameState.getBusiness()
      : null;
    if (!business || !Array.isArray(business.shops) || !business.shops.length) return null;
    return business.shops.find(item => item && item.id === business.currentShopId) || business.shops[0] || null;
  }

  drawEntry(ctx, id, x, y, w, title, detail, tone) {
    const fills = {
      blue: ui.COLORS.paleBlue,
      gold: ui.COLORS.paleGold,
      green: ui.COLORS.paleGreen,
      neutral: ui.COLORS.panel
    };
    const strokes = {
      blue: '#BBD5E2',
      gold: '#E4C98D',
      green: '#B8D7C2',
      neutral: ui.COLORS.line
    };
    ui.rect(ctx, x, y, w, 82, {
      radius: 12,
      fill: fills[tone] || fills.neutral,
      stroke: strokes[tone] || strokes.neutral
    });
    ui.text(ctx, title, x + 13, y + 23, 9, ui.COLORS.text, '700');
    ui.text(ctx, detail, x + 13, y + 50, 6.2, ui.COLORS.muted, '500');
    ui.text(ctx, '›', x + w - 15, y + 41, 15, ui.COLORS.navy, '700', 'center');
    this.addButton(id, x, y, w, 82);
  }

  render(ctx) {
    if (!ctx) return;
    this.begin(ctx);

    const player = typeof gameState.getPlayer === 'function' ? gameState.getPlayer() : {};
    const shop = this.currentShop();

    ui.header(
      ctx,
      '更多管理',
      '低频功能与扩展系统集中在这里，不再挤占一级导航',
      390,
      ui.money(player && player.cash)
    );

    ui.sectionTitle(ctx, '经营扩展', 94, shop ? ('当前门店：' + (shop.name || '门店')) : '开店后解锁更多经营能力', 390);
    this.drawEntry(ctx, 'go:advancedManagement', 10, 110, 180, '经营中心', '营销 · 会员 · 主动采购 · 成长', 'gold');
    this.drawEntry(ctx, 'go:license', 200, 110, 180, '证照许可', '营业 · 食品 · 消防等低频手续', 'neutral');

    ui.sectionTitle(ctx, '市场与扩张', 218, '', 390);
    this.drawEntry(ctx, 'go:dynamicWorld', 10, 234, 180, '城市动态', '事件 · 政策 · 人物 · 市场变化', 'blue');
    this.drawEntry(ctx, 'go:propertyMarket', 200, 234, 180, '扩店找铺', '房源市场 · 看铺 · 谈判 · 签约', 'green');

    ui.sectionTitle(ctx, '系统与管理', 342, '', 390);
    this.drawEntry(ctx, 'go:system', 10, 358, 180, '系统设置', '存档 · 新游戏 · 模拟设置', 'neutral');
    this.drawEntry(ctx, 'go:financeCenter', 200, 358, 180, '金融中心', '授信 · 贷款 · 还款 · 信用', 'gold');

    ui.rect(ctx, 10, 470, 370, 112, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    ui.text(ctx, '分流规则', 24, 491, 8.5, ui.COLORS.text, '700');
    ui.text(ctx, '门店：员工 / 排班 / 装修 / 设备 / 财务', 24, 520, 7, ui.COLORS.text, '600');
    ui.text(ctx, '菜单：菜品研发与菜品经营数据', 24, 544, 7, ui.COLORS.text, '600');
    ui.text(ctx, '供应链：采购 / 库存 / 损耗 / 供应商', 24, 568, 7, ui.COLORS.text, '600');

    this.end(ctx);
  }

  go(scene, payload) {
    const ok = sceneManager.switchTo(scene, payload || {});
    if (!ok) this.showToast('该功能当前还不能进入');
    return true;
  }

  handleTap(x, y) {
    const hit = this.handleBaseTap(x, y);
    if (hit === true) return true;
    if (!hit || !hit.id) return false;
    if (hit.id.indexOf('go:') !== 0) return false;

    const route = hit.id.slice(3);
    const shop = this.currentShop();
    const payload = shop ? { shopId: shop.id } : {};
    return this.go(route, payload);
  }
}

module.exports = new MoreScene();
