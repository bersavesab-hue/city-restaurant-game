'use strict';

const runtime =
  globalThis.GameRuntime;

const api =
  runtime &&
  runtime.api ||
  {};

const gameState =
  require('../core/gameState.js');

const saveSystem =
  require('../core/saveSystem.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const newGameFlow =
  require('../core/newGameFlowV0814.js');

const sceneManager =
  require('../ui/managers/sceneManager.js');

const lifecycle =
  require('../core/businessLifecycleV086.js');

const ui =
  require('../ui/premiumUi.js');

const opUi =
  require('../ui/operationsUiV080.js');

function money(value) {
  return (
    '¥' +
    Math.round(
      Number(value) || 0
    ).toLocaleString()
  );
}

class SystemScene {
  constructor() {
    this.id =
      'system';

    this.buttons =
      [];
  }

  enter() {
    lifecycle
      .ensureSettings();
  }

  exit() {
    this.buttons =
      [];
  }

  update() {
  }

  addButton(
    id,
    x,
    y,
    w,
    h
  ) {
    this.buttons.push({
      id,
      x,
      y,
      w,
      h
    });
  }

  hitButton(
    x,
    y
  ) {
    for (
      let i =
        this.buttons.length -
        1;
      i >=
        0;
      i--
    ) {
      const b =
        this.buttons[i];

      if (
        x >=
          b.x &&
        x <=
          b.x + b.w &&
        y >=
          b.y &&
        y <=
          b.y + b.h
      ) {
        return b;
      }
    }

    return null;
  }

  drawButton(
    ctx,
    id,
    label,
    x,
    y,
    w,
    tone='blue'
  ) {
    const fill =
      tone ===
        'danger'
        ? '#D65B4C'
        : tone ===
            'gold'
          ? '#F4BE3C'
          : '#2C90BA';

    ui.card(
      ctx,
      x,
      y,
      w,
      38,
      {
        radius:12,
        fill,
        stroke:false,
        shadow:false
      }
    );

    ui.text(
      ctx,
      label,
      x + w / 2,
      y + 19,
      8.2,
      tone ===
        'gold'
        ? '#173D54'
        : '#FFFFFF',
      '800',
      'center'
    );

    this.addButton(
      id,
      x,
      y,
      w,
      38
    );
  }

  currentShop() {
    const business =
      gameState
        .getBusiness();

    return (
      (
        business.shops ||
        []
      ).find(
        item =>
          item.id ===
          business.currentShopId
      ) ||
      (
        business.shops ||
        []
      ).find(
        item =>
          item.status !==
          'closed'
      ) ||
      null
    );
  }

  toast(title) {
    if (
      api &&
      typeof api.showToast ===
        'function'
    ) {
      api.showToast({
        title,
        icon:'none'
      });
    }
  }

  render(ctx) {
    const h =
      opUi.viewHeight();

    this.buttons =
      [];

    ctx.save();

    opUi.background(
      ctx,
      h
    );

    opUi.header(
      ctx,
      '系统',
      '存档、显示、贷款与租约'
    );

    const settings =
      lifecycle
        .getSettings();

    ui.card(
      ctx,
      14,
      96,
      362,
      106,
      {
        radius:14,
        fill:'#FFFDF8',
        stroke:'#DDD4C7',
        shadow:false
      }
    );

    ui.text(
      ctx,
      '存档',
      28,
      120,
      10,
      '#173D54',
      '800'
    );

    ui.text(
      ctx,
      '自动保存已开启',
      28,
      146,
      7.2,
      '#728792',
      '700'
    );

    this.drawButton(
      ctx,
      'save',
      '立即保存',
      250,
      151,
      108
    );

    this.drawButton(
      ctx,
      'feature:hub',
      '功能中心',
      28,
      151,
      108,
      'gold'
    );

    ui.card(
      ctx,
      14,
      216,
      362,
      112,
      {
        radius:14,
        fill:'#FFFDF8',
        stroke:'#DDD4C7',
        shadow:false
      }
    );

    ui.text(
      ctx,
      '显示',
      28,
      240,
      10,
      '#173D54',
      '800'
    );

    ui.text(
      ctx,
      settings.fontScale >
        1.01
        ? '大字模式'
        : '标准字号',
      28,
      268,
      7.3,
      '#728792',
      '700'
    );

    this.drawButton(
      ctx,
      'font:normal',
      '标准',
      214,
      270,
      68,
      settings.fontScale <=
        1.01
        ? 'gold'
        : 'blue'
    );

    this.drawButton(
      ctx,
      'font:large',
      '大字',
      290,
      270,
      68,
      settings.fontScale >
        1.01
        ? 'gold'
        : 'blue'
    );

    const shop =
      this.currentShop();

    ui.card(
      ctx,
      14,
      342,
      362,
      196,
      {
        radius:14,
        fill:'#FFFDF8',
        stroke:'#DDD4C7',
        shadow:false
      }
    );

    ui.text(
      ctx,
      '当前门店合同',
      28,
      366,
      10,
      '#173D54',
      '800'
    );

    if (!shop) {
      ui.text(
        ctx,
        '暂无门店',
        28,
        400,
        8,
        '#728792',
        '700'
      );
    } else {
      const overview =
        lifecycle
          .getShopOverview(
            shop.id
          );

      const lease =
        overview &&
        overview.lease;

      const loan =
        overview &&
        overview.loan;

      ui.text(
        ctx,
        shop.name ||
          '未命名门店',
        28,
        397,
        8.4,
        '#173D54',
        '800'
      );

      ui.text(
        ctx,
        lease
          ? (
              '租约 ' +
              lease.status +
              ' · 月租 ' +
              money(
                lease
                  .currentMonthlyRent
              )
            )
          : '未找到租约记录',
        28,
        425,
        7.1,
        lease &&
        lease.arrears >
          0
          ? '#C85242'
          : '#728792',
        '700'
      );

      ui.text(
        ctx,
        loan
          ? (
              '贷款 ' +
              loan.status +
              ' · 剩余 ' +
              money(
                loan.outstanding
              )
            )
          : '无开店贷款',
        28,
        451,
        7.1,
        loan &&
        (
          loan.status ===
            'overdue' ||
          loan.status ===
            'defaulted'
        )
          ? '#C85242'
          : '#728792',
        '700'
      );

      if (
        loan &&
        loan.outstanding >
          0
      ) {
        this.drawButton(
          ctx,
          'loan:prepay',
          '提前还款',
          28,
          486,
          96
        );
      }

      if (
        lease &&
        ![
          'terminated',
          'defaulted',
          'expired'
        ].includes(
          lease.status
        )
      ) {
        this.drawButton(
          ctx,
          'lease:renew',
          '续租3年',
          134,
          486,
          96,
          'gold'
        );

        this.drawButton(
          ctx,
          'lease:terminate',
          '退租',
          240,
          486,
          96,
          'danger'
        );
      }
    }

    ui.card(
      ctx,
      14,
      552,
      362,
      104,
      {
        radius:14,
        fill:'#FFF6F3',
        stroke:'#E7C7C1',
        shadow:false
      }
    );

    ui.text(
      ctx,
      '重新开局',
      28,
      576,
      10,
      '#B54B40',
      '800'
    );

    ui.text(
      ctx,
      '删除当前存档并重新生成城市。',
      28,
      602,
      7,
      '#8B706C',
      '600'
    );

    this.drawButton(
      ctx,
      'new-game',
      '重新开始',
      250,
      606,
      108,
      'danger'
    );

    ctx.restore();
  }

  handleTap(
    x,
    y
  ) {
    const button =
      this.hitButton(
        x,
        y
      );

    if (!button) {
      return false;
    }

    if (
      button.id ===
      'save'
    ) {
      this.toast(
        saveSystem.save()
          ? '保存成功'
          : '保存失败'
      );

      return true;
    }

    if (
      button.id ===
      'feature:hub'
    ) {
      sceneManager
        .switchTo(
          'featureHub'
        );

      return true;
    }

    if (
      button.id ===
      'font:normal'
    ) {
      lifecycle
        .setFontScale(
          1
        );

      saveSystem
        .autoSave(
          true
        );

      return true;
    }

    if (
      button.id ===
      'font:large'
    ) {
      lifecycle
        .setFontScale(
          1.12
        );

      saveSystem
        .autoSave(
          true
        );

      return true;
    }

    const shop =
      this.currentShop();

    if (
      button.id ===
        'loan:prepay' &&
      shop
    ) {
      const result =
        lifecycle
          .prepayLoan(
            shop.id
          );

      this.toast(
        result.ok
          ? (
              '已还 ' +
              money(
                result.paid
              )
            )
          : result.message
      );

      saveSystem
        .autoSave(
          true
        );

      return true;
    }

    if (
      button.id ===
        'lease:renew' &&
      shop
    ) {
      const run =
        () => {
          const result =
            lifecycle
              .renewLease(
                shop.id,
                3
              );

          this.toast(
            result.ok
              ? '续租成功'
              : result.message
          );

          saveSystem
            .autoSave(
              true
            );
        };

      if (
        api &&
        typeof api.showModal ===
          'function'
      ) {
        api.showModal({
          title:'续租确认',
          content:
            '按现有合同规则续租3年，租金递增条款继续生效。',
          confirmText:'续租',
          cancelText:'取消',
          success:result => {
            if (
              result &&
              result.confirm
            ) {
              run();
            }
          }
        });
      } else {
        run();
      }

      return true;
    }

    if (
      button.id ===
        'lease:terminate' &&
      shop
    ) {
      const run =
        () => {
          const result =
            lifecycle
              .terminateLease(
                shop.id
              );

          this.toast(
            result.ok
              ? (
                  '退租完成，退回 ' +
                  money(
                    result.refund
                  )
                )
              : result.message
          );

          saveSystem
            .autoSave(
              true
            );
        };

      if (
        api &&
        typeof api.showModal ===
          'function'
      ) {
        api.showModal({
          title:'确认退租',
          content:
            '退租会关闭门店，并按1个月当前租金计违约成本。',
          confirmText:'确认退租',
          cancelText:'取消',
          success:result => {
            if (
              result &&
              result.confirm
            ) {
              run();
            }
          }
        });
      } else {
        run();
      }

      return true;
    }

    if (
      button.id ===
      'new-game'
    ) {
      const run =
        () => {
          newGameFlow
            .restart();

          sceneManager
            .switchTo(
              'newGame'
            );

          this.toast(
            '已建立全新存档'
          );
        };

      if (
        api &&
        typeof api.showModal ===
          'function'
      ) {
        api.showModal({
          title:'重新开局',
          content:
            '当前主存档和备份都会被清除，然后进入完整开局流程。',
          confirmText:'重新开始',
          cancelText:'取消',
          success:result => {
            if (
              result &&
              result.confirm
            ) {
              run();
            }
          }
        });
      } else {
        run();
      }

      return true;
    }

    return false;
  }
}

module.exports =
  new SystemScene();
