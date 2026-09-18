'use strict';

const runtime =
  globalThis.GameRuntime;

const api =
  runtime && runtime.api || {};

const gameState =
  require('../core/gameState.js');

const newGameFlow =
  require('../core/newGameFlowV0814.js');

const sceneManager =
  require('../ui/managers/sceneManager.js');

const textInput =
  require('../ui/textInput.js');

const ui =
  require('../ui/premiumUi.js');

const opUi =
  require('../ui/operationsUiV080.js');

class NewGameScene {
  constructor() {
    this.id = 'newGame';
    this.buttons = [];
    this.draftCityName = '云州市';
  }

  enter() {
    gameState
      .setTimePaused(
        true
      );

    const raw =
      gameState
        .getWorld()
        .cityName;

    this.draftCityName =
      raw && String(raw).trim()
        ? String(raw).trim()
        : '云州市';
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
    for (
      let i = this.buttons.length - 1;
      i >= 0;
      i--
    ) {
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
    const h =
      opUi.viewHeight();

    this.buttons = [];

    ctx.save();
    opUi.background(ctx, h);
    opUi.header(
      ctx,
      '创业开局',
      '从第一家小餐馆起步，靠选址和经营判断把生意做起来'
    );

    ui.card(
      ctx,
      14,
      100,
      362,
      126,
      {
        radius:16,
        fill:'#FFFDF8',
        stroke:'#DDD4C7',
        shadow:false
      }
    );

    ui.text(
      ctx,
      '城市',
      28,
      126,
      8,
      '#6F8189',
      '700'
    );

    ui.text(
      ctx,
      this.draftCityName,
      28,
      160,
      18,
      '#173D54',
      '800'
    );

    ui.text(
      ctx,
      '开局资金 ¥' +
        Number(
          gameState
            .getPlayer()
            .cash ||
          0
        ).toLocaleString(),
      28,
      195,
      7.4,
      '#4D7A62',
      '700'
    );

    ui.card(
      ctx,
      268,
      143,
      88,
      36,
      {
        radius:12,
        fill:'#2C90BA',
        stroke:false,
        shadow:false
      }
    );

    ui.text(
      ctx,
      '修改名称',
      312,
      161,
      8,
      '#FFFFFF',
      '800',
      'center'
    );

    this.addButton(
      'city-name',
      260,
      136,
      104,
      50
    );

    ui.card(
      ctx,
      14,
      242,
      362,
      270,
      {
        radius:16,
        fill:'#FFFDF8',
        stroke:'#DDD4C7',
        shadow:false
      }
    );

    ui.text(
      ctx,
      '首店主线',
      28,
      270,
      11,
      '#173D54',
      '800'
    );

    const steps = [
      ['1','选址落脚','比较租金、客群和经营方向，签下第一家店'],
      ['2','基础筹备','装修、设备、证照和班组按目标逐步完成'],
      ['3','开始试营业','准备完成即可接待真实顾客，马上看到营业额和成本'],
      ['4','连续3天复盘','用真实经营数据调整菜单、备货和服务'],
      ['5','正式开业','确认经营方向后进入长期经营循环']
    ];

    for (
      let i = 0;
      i < steps.length;
      i++
    ) {
      const y =
        310 +
        i * 39;

      ui.card(
        ctx,
        28,
        y - 12,
        28,
        28,
        {
          radius:14,
          fill:'#F4BE3C',
          stroke:false,
          shadow:false
        }
      );

      ui.text(
        ctx,
        steps[i][0],
        42,
        y + 2,
        8,
        '#173D54',
        '800',
        'center'
      );

      ui.text(
        ctx,
        steps[i][1],
        70,
        y - 3,
        8.2,
        '#173D54',
        '800'
      );

      ui.text(
        ctx,
        steps[i][2],
        70,
        y + 14,
        5.8,
        '#728792',
        '600'
      );
    }

    const actionY =
      Math.min(
        h - 100,
        548
      );

    ui.card(
      ctx,
      14,
      actionY,
      362,
      54,
      {
        radius:16,
        fill:'#F4BE3C',
        stroke:'#D89B27',
        shadow:false
      }
    );

    ui.text(
      ctx,
      '进入城市 · 开始选址  ›',
      195,
      actionY + 27,
      10,
      '#173D54',
      '800',
      'center'
    );

    this.addButton(
      'start',
      14,
      actionY,
      362,
      54
    );

    ctx.restore();
  }

  handleTap(x, y) {
    const button =
      this.hitButton(
        x,
        y
      );

    if (!button) {
      return false;
    }

    if (
      button.id === 'city-name'
    ) {
      textInput
        .requestText({
          title:'城市命名',
          value:this.draftCityName,
          placeholder:'请输入城市名称',
          maxLength:8
        })
        .then(
          value => {
            if (
              value &&
              String(value).trim()
            ) {
              this.draftCityName =
                String(value)
                  .trim()
                  .slice(0, 8);

              textInput
                .requestRender();
            }
          }
        );

      return true;
    }

    if (
      button.id === 'start'
    ) {
      const result =
        newGameFlow
          .confirmCityName(
            this.draftCityName
          );

      if (!result.ok) {
        if (
          api &&
          typeof api.showToast ===
            'function'
        ) {
          api.showToast({
            title:
              result.message ||
              '开局失败',
            icon:'none'
          });
        }

        return true;
      }

      gameState
        .setTimePaused(
          false
        );

      sceneManager
        .switchTo(
          result.next.routeId,
          result.next.params
        );

      return true;
    }

    return false;
  }
}

module.exports =
  new NewGameScene();
