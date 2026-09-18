'use strict';

const runtime =
  globalThis.GameRuntime;

if (!runtime) {
  throw new Error(
    'EquipmentScene：GameRuntime 未初始化'
  );
}

const api =
  runtime.api || {};

const gameState =
  require('../core/gameState.js');

const sceneManager =
  require('../ui/managers/sceneManager.js');

const openingPrepSystem =
  require('../opening/openingPrepSystem.js');

const visualAssetSystem =
  require('../ui/visualAssetSystem.js');

const DESIGN_W =
  390;

const COLORS = {
  navy: '#0A2A3B',
  paper: '#F4EBDD',
  panel: '#FFF9EF',
  text: '#24323A',
  muted: '#718087',
  gold: '#E4AA48',
  orange: '#D9853E',
  red: '#BF584A',
  green: '#4B9567',
  blue: '#4C86A6',
  line: '#DED1C1',
  white: '#FFFFFF'
};

function money(value) {
  return (
    '¥' +
    Math.round(
      Number(value) || 0
    ).toLocaleString()
  );
}

class EquipmentScene {
  constructor() {
    this.id =
      'equipment';

    this.shopId =
      null;

    this.buttons =
      [];

    this.viewH =
      780;

    this.navH =
      64;

    this.contentBottom =
      716;
  }

  enter(payload) {
    const business =
      gameState
        .getBusiness();

    this.shopId =
      (
        payload &&
        payload.shopId
      ) ||
      business.currentShopId;

    if (this.shopId) {
      openingPrepSystem
        .ensureEquipment(
          this.shopId
        );

      visualAssetSystem
        .loadGroup(
          'renovation'
        );
    }
  }

  update() {
    if (this.shopId) {
      openingPrepSystem
        .updateEquipment(
          this.shopId
        );
    }
  }

  exit() {
    this.buttons =
      [];
  }

  layout() {
    let h = 780;

    if (
      api &&
      typeof api
        .getSystemInfoSync ===
        'function'
    ) {
      const info =
        api
          .getSystemInfoSync();

      h =
        (
          Number(
            info.windowHeight
          ) ||
          780
        ) /
        (
          (
            Number(
              info.windowWidth
            ) ||
            390
          ) /
          390
        );
    }

    this.viewH =
      h;

    this.navH =
      h < 740
        ? 60
        : 64;

    this.contentBottom =
      h -
      this.navH;
  }

  rounded(
    ctx,
    x,
    y,
    w,
    h,
    r,
    fill,
    stroke
  ) {
    const radius =
      Math.min(
        r,
        w / 2,
        h / 2
      );

    ctx.beginPath();
    ctx.moveTo(
      x + radius,
      y
    );
    ctx.arcTo(
      x + w,
      y,
      x + w,
      y + h,
      radius
    );
    ctx.arcTo(
      x + w,
      y + h,
      x,
      y + h,
      radius
    );
    ctx.arcTo(
      x,
      y + h,
      x,
      y,
      radius
    );
    ctx.arcTo(
      x,
      y,
      x + w,
      y,
      radius
    );
    ctx.closePath();

    if (fill) {
      ctx.fillStyle =
        fill;
      ctx.fill();
    }

    if (stroke) {
      ctx.strokeStyle =
        stroke;
      ctx.stroke();
    }
  }

  text(
    ctx,
    value,
    x,
    y,
    size,
    color,
    weight,
    align
  ) {
    ctx.fillStyle =
      color ||
      COLORS.text;

    const readableSize =
      Math.max(
        7.3,
        Number(
          size
        ) ||
        7.3
      );

    ctx.font =
      (
        weight ||
        '500'
      ) +
      ' ' +
      readableSize +
      'px sans-serif';

    ctx.textAlign =
      align ||
      'left';

    ctx.textBaseline =
      'middle';

    ctx.fillText(
      String(value),
      x,
      y
    );
  }

  button(
    id,
    x,
    y,
    w,
    h
  ) {
    const hitW =
      Math.max(
        40,
        w
      );

    const hitH =
      Math.max(
        36,
        h
      );

    this.buttons.push({
      id,
      x:
        x -
        (
          hitW -
          w
        ) /
        2,
      y:
        y -
        (
          hitH -
          h
        ) /
        2,
      w:
        hitW,
      h:
        hitH
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

  drawVisual(
    ctx,
    key,
    x,
    y,
    w,
    h
  ) {
    const image =
      visualAssetSystem
        .get(
          key
        );

    if (!image) {
      return;
    }

    const iw =
      image.naturalWidth ||
      image.width ||
      1;

    const ih =
      image.naturalHeight ||
      image.height ||
      1;

    const scale =
      Math.min(
        w / iw,
        h / ih
      );

    const dw =
      iw *
      scale;

    const dh =
      ih *
      scale;

    ctx.drawImage(
      image,
      x +
        (
          w -
          dw
        ) /
        2,
      y +
        (
          h -
          dh
        ) /
        2,
      dw,
      dh
    );
  }

  render(ctx) {
    if (
      !ctx ||
      !this.shopId
    ) {
      return;
    }

    this.layout();

    openingPrepSystem
      .updateEquipment(
        this.shopId
      );

    const shop =
      openingPrepSystem
        .getShop(
          this.shopId
        );

    const state =
      openingPrepSystem
        .getEquipmentState(
          this.shopId
        );

    const quote =
      openingPrepSystem
        .getEquipmentQuote(
          this.shopId
        );

    this.buttons =
      [];

    ctx.save();

    ctx.fillStyle =
      COLORS.paper;

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      this.viewH
    );

    ctx.fillStyle =
      COLORS.navy;

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      68
    );

    this.text(
      ctx,
      '‹',
      25,
      33,
      24,
      COLORS.white,
      '700',
      'center'
    );

    this.button(
      'back',
      4,
      8,
      44,
      48
    );

    this.text(
      ctx,
      '设备采购',
      58,
      22,
      17,
      COLORS.white,
      '700'
    );

    this.text(
      ctx,
      shop.name +
        ' · 数量、档次、价格和承载实时联动',
      58,
      47,
      7,
      '#D5E4EA',
      '500'
    );

    this.text(
      ctx,
      money(
        gameState
          .getPlayer()
          .cash
      ),
      374,
      23,
      12,
      '#FFE8AE',
      '700',
      'right'
    );

    this.rounded(
      ctx,
      10,
      80,
      370,
      72,
      13,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '采购预算',
      22,
      98,
      7,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      money(
        quote.total
      ),
      22,
      124,
      16,
      COLORS.red,
      '700'
    );

    this.text(
      ctx,
      '承载 ' +
        quote.capacity +
        ' / ' +
        quote.seats +
        '席',
      188,
      103,
      8,
      quote.capacityRatio >=
        0.9
        ? COLORS.green
        : COLORS.red,
      '700'
    );

    this.text(
      ctx,
      '功率 ' +
        quote.totalPowerKw +
        'kW · 预计' +
        quote.installDays +
        '天到货安装' +
        (
          quote
            .infrastructureUpgradeCost >
          0
            ? ' · 含电力增容' +
              money(
                quote
                  .infrastructureUpgradeCost
              )
            : ''
        ),
      188,
      128,
      7,
      COLORS.muted,
      '600'
    );

    let y =
      164;

    for (
      const line of
      quote.lines
    ) {
      this.rounded(
        ctx,
        10,
        y,
        370,
        78,
        12,
        COLORS.panel,
        COLORS.line
      );

      this.drawVisual(
        ctx,
        line.iconKey,
        18,
        y + 9,
        58,
        58
      );

      this.text(
        ctx,
        line.name,
        84,
        y + 20,
        9,
        COLORS.text,
        '700'
      );

      this.text(
        ctx,
        line.gradeName +
          ' · ' +
          money(
            line.price
          ) +
          ' · 承载' +
          line.capacity,
        84,
        y + 43,
        6.8,
        COLORS.muted,
        '600'
      );

      if (
        state.status ===
        'planning'
      ) {
        this.rounded(
          ctx,
          266,
          y + 12,
          29,
          29,
          8,
          '#EEE6DC'
        );

        this.text(
          ctx,
          '−',
          280.5,
          y + 26.5,
          13,
          COLORS.navy,
          '700',
          'center'
        );

        this.button(
          'minus:' +
            line.id,
          262,
          y + 8,
          37,
          37
        );

        this.text(
          ctx,
          line.quantity,
          316,
          y + 27,
          9,
          COLORS.text,
          '700',
          'center'
        );

        this.rounded(
          ctx,
          340,
          y + 12,
          29,
          29,
          8,
          COLORS.gold
        );

        this.text(
          ctx,
          '+',
          354.5,
          y + 26.5,
          12,
          COLORS.text,
          '700',
          'center'
        );

        this.button(
          'plus:' +
            line.id,
          336,
          y + 8,
          37,
          37
        );

        this.rounded(
          ctx,
          265,
          y + 48,
          104,
          23,
          7,
          '#E8F0F2'
        );

        this.text(
          ctx,
          '切换档次 ›',
          317,
          y + 59.5,
          6.5,
          COLORS.blue,
          '700',
          'center'
        );

        this.button(
          'grade:' +
            line.id,
          261,
          y + 45,
          112,
          29
        );
      } else {
        this.text(
          ctx,
          state.status ===
            'installed'
            ? '已安装'
            : '已下单',
          358,
          y + 28,
          8,
          state.status ===
            'installed'
            ? COLORS.green
            : COLORS.orange,
          '700',
          'right'
        );
      }

      y +=
        86;
    }

    const actionY =
      this.contentBottom -
      50;

    this.rounded(
      ctx,
      10,
      actionY,
      370,
      40,
      12,
      state.status ===
        'planning'
        ? (
            quote.valid
              ? COLORS.gold
              : '#DCD5CC'
          )
        : COLORS.navy
    );

    let actionText =
      '确认采购 ' +
      money(
        quote.total
      );

    if (
      state.status ===
      'ordered'
    ) {
      actionText =
        '设备运输安装中 · 第' +
        state.deliveryDay +
        '天完成';
    } else if (
      state.status ===
      'installed'
    ) {
      actionText =
        '设备已全部安装';
    } else if (
      !quote.valid
    ) {
      actionText =
        quote.issues[0] ||
        '设备配置不足';
    }

    this.text(
      ctx,
      actionText,
      195,
      actionY + 20,
      8.5,
      state.status ===
        'planning'
        ? COLORS.text
        : COLORS.white,
      '700',
      'center'
    );

    this.button(
      'order',
      10,
      actionY,
      370,
      40
    );

    ctx.restore();
  }

  handleTap(
    x,
    y
  ) {
    const item =
      this.hit(
        x,
        y
      );

    if (!item) {
      return false;
    }

    if (
      item.id ===
      'back'
    ) {
      sceneManager
        .switchTo(
          'shop'
        );

      return true;
    }

    if (
      item.id.indexOf(
        'minus:'
      ) ===
      0
    ) {
      openingPrepSystem
        .adjustEquipment(
          this.shopId,
          item.id.slice(
            6
          ),
          -1
        );

      return true;
    }

    if (
      item.id.indexOf(
        'plus:'
      ) ===
      0
    ) {
      openingPrepSystem
        .adjustEquipment(
          this.shopId,
          item.id.slice(
            5
          ),
          1
        );

      return true;
    }

    if (
      item.id.indexOf(
        'grade:'
      ) ===
      0
    ) {
      openingPrepSystem
        .cycleEquipmentGrade(
          this.shopId,
          item.id.slice(
            6
          )
        );

      return true;
    }

    if (
      item.id ===
      'order'
    ) {
      const state =
        openingPrepSystem
          .getEquipmentState(
            this.shopId
          );

      if (
        state.status !==
        'planning'
      ) {
        return true;
      }

      const result =
        openingPrepSystem
          .orderEquipment(
            this.shopId
          );

      if (
        api &&
        typeof api
          .showToast ===
          'function'
      ) {
        api.showToast({
          title:
            result.ok
              ? '设备订单已提交'
              : result.message,
          icon:
            'none'
        });
      }

      return true;
    }

    return false;
  }
}

module.exports =
  new EquipmentScene();
