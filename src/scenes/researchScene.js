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

class ResearchScene {
  constructor() {
    this.id =
      'research';

    this.buttons =
      [];

    this.page =
      0;

    this.selectedId =
      null;
  }

  enter() {
    const shop =
      operations
        .getCurrentShop();

    if (shop) {
      const runtime =
        operations
          .getRuntime(
            shop.id
          );

      if (
        runtime &&
        runtime.menu &&
        runtime
          .menu
          .length &&
        !this.selectedId
      ) {
        this.selectedId =
          runtime
            .menu[0]
            .id;
      }
    }
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

  renderEmpty(
    ctx,
    h
  ) {
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
      '签约门店后即可配置真实菜单',
      195,
      198,
      8,
      '#748791',
      '600',
      'center'
    );
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
      '菜单',
      '菜品、定价、成本与售罄状态'
    );

    const shop =
      operations
        .getCurrentShop();

    if (!shop) {
      this.renderEmpty(
        ctx,
        h
      );

      ctx.restore();
      return;
    }

    const runtime =
      operations
        .getRuntime(
          shop.id
        );

    const menu =
      runtime.menu ||
      [];

    const activeCount =
      menu.filter(
        item =>
          item.active !==
          false
      ).length;

    ui.card(
      ctx,
      14,
      96,
      362,
      58,
      {
        radius: 14,
        fill: '#FFFDF8',
        stroke: '#DDD4C7',
        shadow: false
      }
    );

    ui.text(
      ctx,
      shop.name ||
        '当前门店',
      28,
      116,
      10,
      '#163D55',
      '800'
    );

    ui.text(
      ctx,
      '菜单 ' +
        menu.length +
        ' 道｜上架 ' +
        activeCount +
        ' 道',
      28,
      140,
      7.4,
      '#728792',
      '600'
    );

    const pageSize =
      5;

    const pageCount =
      Math.max(
        1,
        Math.ceil(
          menu.length /
          pageSize
        )
      );

    this.page =
      Math.max(
        0,
        Math.min(
          this.page,
          pageCount -
            1
        )
      );

    const start =
      this.page *
      pageSize;

    const rows =
      menu.slice(
        start,
        start +
          pageSize
      );

    let y =
      166;

    for (
      const item
      of rows
    ) {
      const selected =
        item.id ===
        this.selectedId;

      const cost =
        operations
          .estimateMenuItemCost(
            shop.id,
            item
          );

      const margin =
        item.listPrice >
          0
          ? Math.round(
              (
                (
                  item.listPrice -
                  cost
                ) /
                item.listPrice
              ) *
              100
            )
          : 0;

      const craftable =
        operations
          .menuItemAvailability(
            shop.id,
            item
          );

      ui.card(
        ctx,
        14,
        y,
        362,
        70,
        {
          radius: 13,
          fill:
            selected
              ? '#FFF7D7'
              : '#FFFDF8',
          stroke:
            selected
              ? '#E4B838'
              : '#DDD4C7',
          shadow: false
        }
      );

      ui.text(
        ctx,
        item.name,
        28,
        y +
          19,
        9.2,
        '#173D54',
        '800'
      );

      if (
        item.featured
      ) {
        ui.text(
          ctx,
          '招牌',
          128,
          y +
            19,
          7.3,
          '#D99C15',
          '800'
        );
      }

      ui.text(
        ctx,
        opUi.money(
          item.listPrice
        ),
        352,
        y +
          19,
        9.6,
        '#D29A18',
        '800',
        'right'
      );

      ui.text(
        ctx,
        '成本 ' +
          opUi.money(
            cost
          ) +
          '｜毛利 ' +
          margin +
          '%',
        28,
        y +
          44,
        7.2,
        '#718590',
        '600'
      );

      ui.text(
        ctx,
        item.active ===
          false
          ? '停售'
          : craftable >
              0
            ? '可售 ' +
              craftable +
              '份'
            : '缺货',
        352,
        y +
          45,
        7.2,
        item.active ===
          false
          ? '#A36C61'
          : craftable >
              0
            ? '#258B64'
            : '#D0604B',
        '800',
        'right'
      );

      this.addButton(
        'select:' +
          item.id,
        14,
        y,
        362,
        70
      );

      y +=
        78;
    }

    const controlsY =
      Math.min(
        h -
          128,
        566
      );

    const selected =
      menu.find(
        item =>
          item.id ===
          this.selectedId
      ) ||
      menu[0];

    if (selected) {
      opUi.button(
        ctx,
        selected.active ===
          false
          ? '重新上架'
          : '暂停销售',
        14,
        controlsY,
        82,
        36
      );

      opUi.button(
        ctx,
        selected.featured
          ? '已是招牌'
          : '设为招牌',
        103,
        controlsY,
        82,
        36,
        selected.featured
          ? 'gold'
          : null
      );

      opUi.button(
        ctx,
        '降1元',
        192,
        controlsY,
        82,
        36
      );

      opUi.button(
        ctx,
        '涨1元',
        281,
        controlsY,
        95,
        36
      );

      this.addButton(
        'toggle',
        14,
        controlsY,
        82,
        36
      );

      this.addButton(
        'feature',
        103,
        controlsY,
        82,
        36
      );

      this.addButton(
        'price:-1',
        192,
        controlsY,
        82,
        36
      );

      this.addButton(
        'price:1',
        281,
        controlsY,
        95,
        36
      );
    }

    const pagingY =
      controlsY +
      46;

    opUi.button(
      ctx,
      '上一页',
      94,
      pagingY,
      82,
      32
    );

    ui.text(
      ctx,
      (
        this.page +
        1
      ) +
        '/' +
        pageCount,
      195,
      pagingY +
        16,
      7.5,
      '#657C89',
      '700',
      'center'
    );

    opUi.button(
      ctx,
      '下一页',
      214,
      pagingY,
      82,
      32
    );

    this.addButton(
      'prev',
      94,
      pagingY,
      82,
      32
    );

    this.addButton(
      'next',
      214,
      pagingY,
      82,
      32
    );

    ctx.restore();
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
        'select:'
      ) ===
      0
    ) {
      this.selectedId =
        target.id.slice(
          7
        );

      return true;
    }

    const shop =
      operations
        .getCurrentShop();

    if (!shop) {
      return false;
    }

    const runtime =
      operations
        .getRuntime(
          shop.id
        );

    const selected =
      runtime.menu.find(
        item =>
          item.id ===
          this.selectedId
      ) ||
      runtime.menu[0];

    if (
      target.id ===
      'toggle' &&
      selected
    ) {
      operations
        .setMenuActive(
          shop.id,
          selected.id,
          selected.active ===
            false
        );

      saveSystem.save();

      return true;
    }

    if (
      target.id ===
      'feature' &&
      selected
    ) {
      operations
        .setMenuFeatured(
          shop.id,
          selected.id
        );

      saveSystem.save();

      return true;
    }

    if (
      target.id.indexOf(
        'price:'
      ) ===
        0 &&
      selected
    ) {
      const delta =
        Number(
          target.id.split(
            ':'
          )[1]
        ) ||
        0;

      operations
        .adjustMenuPrice(
          shop.id,
          selected.id,
          delta
        );

      saveSystem.save();

      return true;
    }

    if (
      target.id ===
      'prev'
    ) {
      this.page =
        Math.max(
          0,
          this.page -
            1
        );

      return true;
    }

    if (
      target.id ===
      'next'
    ) {
      this.page +=
        1;

      return true;
    }

    return false;
  }
}

module.exports =
  new ResearchScene();
