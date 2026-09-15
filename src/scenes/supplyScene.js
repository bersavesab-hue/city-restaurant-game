'use strict';

const gameState =
  require('../core/gameState.js');

const saveSystem =
  require('../core/saveSystem.js');

const operations =
  require('../operations/operationsStoreV080.js');

const ui =
  require('../ui/premiumUi.js');

const opUi =
  require('../ui/operationsUiV080.js');

class SupplyScene {
  constructor() {
    this.id =
      'supply';

    this.buttons =
      [];

    this.tab =
      'stock';
  }

  enter() {
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

  hit(
    x,
    y
  ) {
    for (
      let i =
        this.buttons.length -
        1;
      i >= 0;
      i--
    ) {
      const b =
        this.buttons[i];

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

  render(
    ctx
  ) {
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
      '供应链',
      '真实库存、采购单和供应商网络'
    );

    const shop =
      operations
        .getCurrentShop();

    if (!shop) {
      ui.card(
        ctx,
        18,
        112,
        354,
        150,
        {
          radius: 16,
          fill: '#FFFDF8',
          stroke: '#DDD4C7'
        }
      );

      ui.text(
        ctx,
        '还没有门店',
        195,
        160,
        16,
        '#153A51',
        '800',
        'center'
      );

      ui.text(
        ctx,
        '签约门店后供应链才会开始运行',
        195,
        198,
        8,
        '#748791',
        '600',
        'center'
      );

      ctx.restore();
      return;
    }

    const runtime =
      operations
        .getRuntime(
          shop.id
        );

    const tabs = [
      ['stock', '库存'],
      ['orders', '采购单'],
      ['suppliers', '供应商']
    ];

    let tabX =
      14;

    for (
      const item
      of tabs
    ) {
      opUi.pill(
        ctx,
        item[1],
        tabX,
        96,
        112,
        this.tab ===
          item[0]
      );

      this.addButton(
        'tab:' +
          item[0],
        tabX,
        91,
        112,
        40
      );

      tabX +=
        120;
    }

    if (
      this.tab ===
      'stock'
    ) {
      this.renderStock(
        ctx,
        runtime,
        shop,
        h
      );
    } else if (
      this.tab ===
      'orders'
    ) {
      this.renderOrders(
        ctx,
        runtime
      );
    } else {
      this.renderSuppliers(
        ctx,
        runtime
      );
    }

    ctx.restore();
  }

  renderStock(
    ctx,
    runtime,
    shop,
    h
  ) {
    const rows =
      operations
        .inventoryRows(
          shop.id
        )
        .slice(
          0,
          7
        );

    const stock =
      runtime
        .inventory;

    ui.card(
      ctx,
      14,
      138,
      362,
      62,
      {
        radius: 13,
        fill: '#FFFDF8',
        stroke: '#DDD4C7',
        shadow: false
      }
    );

    ui.text(
      ctx,
      '库存总量',
      28,
      158,
      7.3,
      '#758894',
      '700'
    );

    const summary =
      require('../inventory/inventoryEngineV10.js')
        .stockSummary(
          stock
        );

    ui.text(
      ctx,
      summary.totalKg
        .toFixed(
          1
        ) +
        'kg',
      28,
      181,
      13,
      '#173D54',
      '800'
    );

    ui.text(
      ctx,
      '损耗 ' +
        opUi.money(
          summary
            .waste
            .value
        ),
      352,
      178,
      7.4,
      '#B76853',
      '700',
      'right'
    );

    let y =
      212;

    for (
      const row
      of rows
    ) {
      ui.card(
        ctx,
        14,
        y,
        362,
        48,
        {
          radius: 11,
          fill: '#FFFDF8',
          stroke: '#E2DBD1',
          shadow: false
        }
      );

      ui.text(
        ctx,
        row.name,
        28,
        y +
          16,
        8.2,
        '#173D54',
        '800'
      );

      ui.text(
        ctx,
        '库存 ' +
          opUi.kg(
            row.haveGrams
          ) +
          ' / 目标 ' +
          opUi.kg(
            row.targetGrams
          ),
        28,
        y +
          34,
        7.0,
        '#718590',
        '600'
      );

      ui.text(
        ctx,
        row.status ===
          'critical'
          ? '紧缺'
          : row.status ===
              'low'
            ? '偏低'
            : '正常',
        352,
        y +
          24,
        7.4,
        row.status ===
          'critical'
          ? '#D15142'
          : row.status ===
              'low'
            ? '#D59722'
            : '#268E65',
        '800',
        'right'
      );

      y +=
        56;
    }

    const actionY =
      Math.min(
        h -
          116,
        612
      );

    opUi.button(
      ctx,
      '智能补货',
      238,
      actionY,
      138,
      38,
      'gold'
    );

    ui.text(
      ctx,
      '按菜单需求自动比价，并执行可负担采购',
      20,
      actionY +
        19,
      7.1,
      '#6F838E',
      '600'
    );

    this.addButton(
      'restock',
      238,
      actionY,
      138,
      38
    );
  }

  renderOrders(
    ctx,
    runtime
  ) {
    const rows =
      (
        runtime
          .procurement
          .purchaseOrders ||
        []
      )
        .slice()
        .reverse()
        .slice(
          0,
          8
        );

    let y =
      142;

    if (!rows.length) {
      ui.text(
        ctx,
        '还没有采购单',
        195,
        210,
        12,
        '#6E828E',
        '800',
        'center'
      );

      return;
    }

    for (
      const po
      of rows
    ) {
      ui.card(
        ctx,
        14,
        y,
        362,
        54,
        {
          radius: 11,
          fill: '#FFFDF8',
          stroke: '#DDD4C7',
          shadow: false
        }
      );

      ui.text(
        ctx,
        po.ingredientName,
        28,
        y +
          17,
        8.2,
        '#173D54',
        '800'
      );

      ui.text(
        ctx,
        Number(
          po.qtyKg
        ).toFixed(
          1
        ) +
          'kg｜' +
          opUi.money(
            po.total
          ),
        28,
        y +
          37,
        7.0,
        '#70848F',
        '600'
      );

      ui.text(
        ctx,
        po.status ===
          'received'
          ? '已收货'
          : po.status,
        352,
        y +
          27,
        7.3,
        po.status ===
          'received'
          ? '#248B63'
          : '#C08824',
        '800',
        'right'
      );

      y +=
        62;
    }
  }

  renderSuppliers(
    ctx,
    runtime
  ) {
    const rows =
      (
        runtime
          .supplierNetwork ||
        []
      )
        .slice()
        .sort(
          (
            a,
            b
          ) =>
            (
              Number(
                b.relationship
              ) ||
              0
            ) -
              (
                Number(
                  a.relationship
                ) ||
                0
              ) ||
            (
              Number(
                b.reliability
              ) ||
              0
            ) -
              (
                Number(
                  a.reliability
                ) ||
                0
              )
        )
        .slice(
          0,
          8
        );

    let y =
      142;

    for (
      const supplier
      of rows
    ) {
      ui.card(
        ctx,
        14,
        y,
        362,
        54,
        {
          radius: 11,
          fill: '#FFFDF8',
          stroke: '#DDD4C7',
          shadow: false
        }
      );

      ui.text(
        ctx,
        supplier.name,
        28,
        y +
          17,
        8.0,
        '#173D54',
        '800'
      );

      ui.text(
        ctx,
        '品质 ' +
          Math.round(
            supplier.quality
          ) +
          '｜准时 ' +
          Math.round(
            supplier.reliability
          ) +
          '｜关系 ' +
          Math.round(
            supplier.relationship
          ),
        28,
        y +
          37,
        7.0,
        '#718590',
        '600'
      );

      y +=
        62;
    }
  }

  handleTap(
    x,
    y
  ) {
    const target =
      this.hit(
        x,
        y
      );

    if (!target) {
      return false;
    }

    if (
      target.id.indexOf(
        'tab:'
      ) ===
      0
    ) {
      this.tab =
        target.id.slice(
          4
        );

      return true;
    }

    if (
      target.id ===
      'restock'
    ) {
      const shop =
        operations
          .getCurrentShop();

      if (!shop) {
        return false;
      }

      const result =
        operations
          .autoRestock(
            shop.id
          );

      saveSystem.save();

      opUi.toast(
        result.orders >
          0
          ? (
              '补货' +
              result.orders +
              '笔，支出' +
              opUi.money(
                result.spent
              )
            )
          : result.message
      );

      return true;
    }

    return false;
  }
}

module.exports =
  new SupplyScene();
