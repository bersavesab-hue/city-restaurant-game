'use strict';

const runtime =
  globalThis.GameRuntime;

const api =
  runtime && runtime.api || {};

const sceneManager =
  require('../core/sceneManager.js');

const entryRouter =
  require('../core/entryRouterV0810.js');

const ui =
  require('../ui/premiumUi.js');

const opUi =
  require('../ui/operationsUiV080.js');

const ITEMS = [
  ['city', '城市'],
  ['shop', '门店'],
  ['propertyMarket', '找铺'],
  ['renovation', '装修'],
  ['equipment', '设备'],
  ['license', '证照'],
  ['research', '菜单研发'],
  ['supply', '供应链'],
  ['staff', '员工'],
  ['schedule', '营业排班'],
  ['staffCareer', '团队成长'],
  ['business', '经营数据'],
  ['advancedManagement', '经营中心'],
  ['dynamicWorld', '城市动态'],
  ['system', '系统']
];

class FeatureHubScene {
  constructor() {
    this.id = 'featureHub';
    this.buttons = [];
  }

  enter() {
    this.buttons = [];
  }

  exit() {
    this.buttons = [];
  }

  update() {
  }

  addButton(id, x, y, w, h) {
    this.buttons.push({ id, x, y, w, h });
  }

  hitButton(x, y) {
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const b = this.buttons[i];
      if (
        x >= b.x &&
        x <= b.x + b.w &&
        y >= b.y &&
        y <= b.y + b.h
      ) {
        return b;
      }
    }

    return null;
  }

  render(ctx) {
    const h = opUi.viewHeight();
    this.buttons = [];

    ctx.save();
    opUi.background(ctx, h);
    opUi.header(ctx, '功能中心', '按经营阶段逐步开放 · 当前只突出真正需要的功能');

    const status = entryRouter.diagnose();

    const accessRows =
      ITEMS.map(
        item => ({
          item,
          access:
            entryRouter
              .getGuardStatus(
                item[0],
                {}
              )
        })
      );

    const availableCount =
      accessRows.filter(
        row =>
          row.access &&
          row.access.allowed
      ).length;

    const lockedCount =
      accessRows.length -
      availableCount;

    ui.card(
      ctx,
      14,
      92,
      362,
      62,
      {
        radius: 14,
        fill: '#FFFDF8',
        stroke: '#DDD4C7',
        shadow: false
      }
    );

    ui.text(
      ctx,
      '可用 ' + availableCount + ' 项 · 待解锁 ' + lockedCount + ' 项',
      28,
      113,
      8,
      '#173D54',
      '800'
    );

    ui.text(
      ctx,
      status.missing.length
        ? '有 ' + status.missing.length + ' 个入口尚未注册'
        : '锁定入口会随首店经营进度自动开放',
      28,
      137,
      7,
      status.missing.length ? '#C85242' : '#4B9567',
      '700'
    );

    const startY = 170;
    const cellW = 171;
    const cellH = 58;
    const gapX = 10;
    const gapY = 9;

    ITEMS.forEach((item, index) => {
      const access =
        entryRouter
          .getGuardStatus(
            item[0],
            {}
          );

      const locked =
        !access ||
        !access.allowed;

      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 14 + col * (cellW + gapX);
      const y = startY + row * (cellH + gapY);

      ui.card(
        ctx,
        x,
        y,
        cellW,
        cellH,
        {
          radius: 12,
          fill:
            locked
              ? '#F0F1ED'
              : '#FFFDF8',
          stroke:
            locked
              ? '#D4D7D2'
              : '#D9D0C4',
          shadow: false
        }
      );

      ui.text(
        ctx,
        item[1],
        x + 14,
        y + 21,
        8.3,
        locked
          ? '#7D8588'
          : '#173D54',
        '800'
      );

      ui.text(
        ctx,
        locked
          ? '待解锁'
          : item[0],
        x + 14,
        y + 41,
        5.8,
        locked
          ? '#9A9F9F'
          : '#7A8A92',
        '600'
      );

      ui.text(
        ctx,
        locked
          ? '锁'
          : '›',
        x + cellW - 16,
        y + cellH / 2,
        locked
          ? 7
          : 13,
        locked
          ? '#929999'
          : '#D99D2D',
        '800',
        'center'
      );

      this.addButton('route:' + item[0], x, y, cellW, cellH);
    });

    ctx.restore();
  }

  handleTap(x, y) {
    const button = this.hitButton(x, y);

    if (!button) {
      return false;
    }

    if (button.id.indexOf('route:') === 0) {
      const routeId = button.id.slice('route:'.length);
      const ok = sceneManager.switchTo(routeId);

      if (!ok && api && typeof api.showToast === 'function') {
        const error =
          entryRouter
            .getLastError();

        api.showToast({
          title:
            error &&
            error.reason ||
            '入口暂不可用',
          icon: 'none'
        });
      }

      return true;
    }

    return false;
  }
}

module.exports =
  new FeatureHubScene();
