'use strict';

const operations =
  require('../operations/operationsStoreV080.js');

const ui =
  require('../ui/premiumUi.js');

const opUi =
  require('../ui/operationsUiV080.js');

class BusinessScene {
  constructor() {
    this.id =
      'business';

    this.buttons =
      [];
  }

  enter() {
  }

  exit() {
    this.buttons =
      [];
  }

  update() {
  }

  renderMetric(
    ctx,
    label,
    value,
    x,
    y,
    tone
  ) {
    ui.card(
      ctx,
      x,
      y,
      170,
      74,
      {
        radius: 14,
        fill: '#FFFDF8',
        stroke: '#DDD4C7',
        shadow: false
      }
    );

    ui.text(
      ctx,
      label,
      x +
        14,
      y +
        20,
      7.2,
      '#748791',
      '700'
    );

    ui.text(
      ctx,
      value,
      x +
        14,
      y +
        49,
      13,
      tone ||
        '#173D54',
      '800'
    );
  }

  render(
    ctx
  ) {
    const h =
      opUi.viewHeight();

    ctx.save();

    opUi.background(
      ctx,
      h
    );

    opUi.header(
      ctx,
      '数据',
      '这里开始只显示真实经营数据'
    );

    const shop =
      operations
        .getCurrentShop();

    if (!shop) {
      ui.text(
        ctx,
        '开店后生成真实经营数据',
        195,
        180,
        12,
        '#6F838E',
        '800',
        'center'
      );

      ctx.restore();
      return;
    }

    const data =
      operations
        .dashboard(
          shop.id
        );

    this.renderMetric(
      ctx,
      '本期营业额',
      opUi.money(
        data
          .finance
          .revenue
      ),
      14,
      104,
      '#D29A18'
    );

    this.renderMetric(
      ctx,
      '本期利润',
      opUi.money(
        data
          .finance
          .profit
      ),
      206,
      104,
      data
        .finance
        .profit >=
        0
        ? '#248B63'
        : '#C85242'
    );

    this.renderMetric(
      ctx,
      '真实订单',
      String(
        data
          .finance
          .orders
      ),
      14,
      190
    );

    this.renderMetric(
      ctx,
      '真实顾客',
      String(
        data
          .finance
          .customers
      ),
      206,
      190
    );

    ui.card(
      ctx,
      14,
      278,
      362,
      174,
      {
        radius: 15,
        fill: '#FFFDF8',
        stroke: '#DDD4C7',
        shadow: false
      }
    );

    ui.text(
      ctx,
      '经营结构',
      28,
      300,
      9.5,
      '#173D54',
      '800'
    );

    const lines = [
      [
        '食材成本率',
        data
          .finance
          .foodCostRate +
          '%'
      ],
      [
        '利润率',
        data
          .finance
          .profitRate +
          '%'
      ],
      [
        '平均客单',
        opUi.money(
          data
            .finance
            .avgTicket
        )
      ],
      [
        '库存总量',
        Number(
          data
            .stock
            .totalKg
        ).toFixed(
          1
        ) +
          'kg'
      ],
      [
        '菜单',
        data
          .activeMenuCount +
          '/' +
          data
            .menuCount +
          ' 上架'
      ]
    ];

    let y =
      330;

    for (
      const line
      of lines
    ) {
      ui.text(
        ctx,
        line[0],
        30,
        y,
        7.4,
        '#738691',
        '600'
      );

      ui.text(
        ctx,
        line[1],
        352,
        y,
        7.7,
        '#173D54',
        '800',
        'right'
      );

      y +=
        25;
    }

    ui.card(
      ctx,
      14,
      468,
      362,
      112,
      {
        radius: 15,
        fill: '#FFFDF8',
        stroke: '#DDD4C7',
        shadow: false
      }
    );

    ui.text(
      ctx,
      '经营状态',
      28,
      490,
      9.5,
      '#173D54',
      '800'
    );

    ui.text(
      ctx,
      '门店评分',
      28,
      520,
      7.3,
      '#728792',
      '600'
    );

    ui.text(
      ctx,
      Number(
        data.shopRating
      ).toFixed(
        1
      ) +
        ' / 5.0',
      352,
      520,
      7.8,
      '#D29A18',
      '800',
      'right'
    );

    ui.text(
      ctx,
      '招牌菜',
      28,
      546,
      7.3,
      '#728792',
      '600'
    );

    ui.text(
      ctx,
      data.featured,
      352,
      546,
      7.8,
      '#173D54',
      '800',
      'right'
    );

    ui.text(
      ctx,
      '采购单',
      28,
      572,
      7.3,
      '#728792',
      '600'
    );

    ui.text(
      ctx,
      data.purchaseOrderCount +
        ' 笔',
      352,
      572,
      7.8,
      '#173D54',
      '800',
      'right'
    );

    ctx.restore();
  }

  handleTap() {
    return false;
  }
}

module.exports =
  new BusinessScene();
