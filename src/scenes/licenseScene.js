'use strict';

const runtime =
  globalThis.GameRuntime;

if (!runtime) {
  throw new Error(
    'LicenseScene：GameRuntime 未初始化'
  );
}

const api =
  runtime.api || {};

const gameState =
  require('../core/gameState.js');

const sceneManager =
  require('../core/sceneManager.js');

const openingPrepSystem =
  require('../opening/openingPrepSystem.js');

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

class LicenseScene {
  constructor() {
    this.id =
      'license';

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
        .getPermitState(
          this.shopId
        );
    }
  }

  update() {
    if (this.shopId) {
      openingPrepSystem
        .updatePermits(
          this.shopId
        );
    }
  }

  exit() {
    this.buttons =
      [];
  }

  getLayout() {
    let height =
      780;

    if (
      api &&
      typeof api
        .getSystemInfoSync ===
        'function'
    ) {
      const info =
        api
          .getSystemInfoSync();

      const screenW =
        Math.max(
          1,
          Number(
            info.windowWidth
          ) ||
          390
        );

      height =
        Math.max(
          1,
          Number(
            info.windowHeight
          ) ||
          780
        ) /
        (
          screenW /
          390
        );
    }

    this.viewH =
      height;

    this.navH =
      height <
        740
        ? 60
        : 64;

    this.contentBottom =
      height -
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

  addButton(
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
      const item =
        this.buttons[i];

      if (
        x >= item.x &&
        x <= item.x + item.w &&
        y >= item.y &&
        y <= item.y + item.h
      ) {
        return item;
      }
    }

    return null;
  }

  statusText(item) {
    if (
      item.status ===
      'approved'
    ) {
      return '已通过';
    }

    if (
      item.status ===
      'applying'
    ) {
      return '审核中';
    }

    if (
      item.status ===
      'needs_fix'
    ) {
      return '需整改';
    }

    return item.ready
      ? '可办理'
      : '条件不足';
  }

  statusColor(item) {
    if (
      item.status ===
      'approved'
    ) {
      return COLORS.green;
    }

    if (
      item.status ===
      'applying'
    ) {
      return COLORS.orange;
    }

    if (
      item.status ===
      'needs_fix'
    ) {
      return COLORS.red;
    }

    return item.ready
      ? COLORS.blue
      : COLORS.muted;
  }

  render(ctx) {
    if (
      !ctx ||
      !this.shopId
    ) {
      return;
    }

    this.getLayout();

    openingPrepSystem
      .updatePermits(
        this.shopId
      );

    const shop =
      openingPrepSystem
        .getShop(
          this.shopId
        );

    const overview =
      openingPrepSystem
        .getPermitOverview(
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
      24,
      33,
      24,
      COLORS.white,
      '700',
      'center'
    );

    this.addButton(
      'back',
      4,
      8,
      44,
      48
    );

    this.text(
      ctx,
      '证照办理',
      58,
      22,
      17,
      COLORS.white,
      '700'
    );

    this.text(
      ctx,
      shop.name +
        ' · 条件不足会直接阻止提交',
      58,
      47,
      7,
      '#D5E4EA',
      '500'
    );

    this.text(
      ctx,
      overview.approved +
        '/' +
        overview.total +
        ' 已完成',
      374,
      25,
      9,
      '#FFE8AE',
      '700',
      'right'
    );

    this.rounded(
      ctx,
      10,
      80,
      370,
      67,
      13,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '办理原则',
      22,
      99,
      8,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      '装修、设备、消防与卫生条件会实时影响是否可提交。',
      22,
      123,
      7,
      COLORS.muted,
      '500'
    );

    let y =
      160;

    for (
      const row of
      overview.rows
    ) {
      this.rounded(
        ctx,
        10,
        y,
        370,
        88,
        12,
        COLORS.panel,
        COLORS.line
      );

      this.text(
        ctx,
        row.name,
        22,
        y + 20,
        9,
        COLORS.text,
        '700'
      );

      this.text(
        ctx,
        this.statusText(
          row
        ),
        360,
        y + 20,
        7.5,
        this.statusColor(
          row
        ),
        '700',
        'right'
      );

      let detail =
        money(
          row.fee
        ) +
        ' · 预计' +
        row.days +
        '天';

      if (
        row.status ===
        'applying'
      ) {
        detail =
          '审核中 · 第' +
          row.finishDay +
          '天出结果';
      } else if (
        row.status ===
        'needs_fix'
      ) {
        detail =
          row.issue ||
          '需要整改';
      } else if (
        !row.ready &&
        row.reasons.length
      ) {
        detail =
          row.reasons[0];
      }

      this.text(
        ctx,
        detail,
        22,
        y + 45,
        7,
        row.status ===
          'needs_fix'
          ? COLORS.red
          : COLORS.muted,
        '600'
      );

      if (
        row.status ===
          'not_applied' &&
        row.ready
      ) {
        this.rounded(
          ctx,
          270,
          y + 55,
          92,
          25,
          8,
          COLORS.gold
        );

        this.text(
          ctx,
          '提交办理',
          316,
          y + 67.5,
          7,
          COLORS.text,
          '700',
          'center'
        );

        this.addButton(
          'apply:' +
            row.id,
          266,
          y + 51,
          100,
          33
        );
      } else if (
        row.remediable &&
        (
          row.status ===
            'needs_fix' ||
          !row.ready
        )
      ) {
        this.rounded(
          ctx,
          258,
          y + 55,
          104,
          25,
          8,
          '#F7E4DF',
          '#D8B1A8'
        );

        this.text(
          ctx,
          '整改 ' +
            money(
              row.remediationCost
            ),
          310,
          y + 67.5,
          6.5,
          COLORS.red,
          '700',
          'center'
        );

        this.addButton(
          'fix:' +
            row.id,
          254,
          y + 51,
          112,
          33
        );
      }

      y +=
        96;
    }

    const actionY =
      this.contentBottom -
      49;

    this.rounded(
      ctx,
      10,
      actionY,
      370,
      39,
      11,
      overview.approved ===
        overview.total
        ? COLORS.green
        : COLORS.navy
    );

    this.text(
      ctx,
      overview.approved ===
        overview.total
        ? '证照已全部完成'
        : '返回门店继续筹备',
      195,
      actionY + 19.5,
      8.5,
      COLORS.white,
      '700',
      'center'
    );

    this.addButton(
      'back',
      10,
      actionY,
      370,
      39
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
        'fix:'
      ) ===
      0
    ) {
      const result =
        openingPrepSystem
          .remediatePermit(
            this.shopId,
            item.id.slice(
              4
            )
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
              ? '整改已完成，可重新办理'
              : result.message,
          icon:
            'none'
        });
      }

      return true;
    }

    if (
      item.id.indexOf(
        'apply:'
      ) ===
      0
    ) {
      const result =
        openingPrepSystem
          .applyPermit(
            this.shopId,
            item.id.slice(
              6
            )
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
              ? '申请已提交'
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
  new LicenseScene();
