'use strict';

const runtime =
  globalThis.GameRuntime;

if (!runtime) {
  throw new Error(
    'StaffScene：GameRuntime 未初始化'
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

const openingConfig =
  require('../opening/openingConfig.js');

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

class StaffScene {
  constructor() {
    this.id =
      'staff';

    this.shopId =
      null;

    this.roleId =
      'manager';

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

    this.roleId =
      'manager';

    if (this.shopId) {
      openingPrepSystem
        .refreshCandidates(
          this.shopId
        );
    }
  }

  update() {
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

  render(ctx) {
    if (
      !ctx ||
      !this.shopId
    ) {
      return;
    }

    this.getLayout();

    const shop =
      openingPrepSystem
        .getShop(
          this.shopId
        );

    const overview =
      openingPrepSystem
        .getStaffOverview(
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
      '招聘团队',
      58,
      22,
      17,
      COLORS.white,
      '700'
    );

    this.text(
      ctx,
      shop.name +
        ' · 候选人每日刷新，薪资随能力变化',
      58,
      47,
      7,
      '#D5E4EA',
      '500'
    );

    this.text(
      ctx,
      money(
        overview.payroll
      ) +
        '/月',
      374,
      25,
      10,
      '#FFE8AE',
      '700',
      'right'
    );

    this.rounded(
      ctx,
      10,
      80,
      370,
      82,
      13,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '人员覆盖率',
      22,
      99,
      7,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      Math.round(
        overview.coverage *
        100
      ) +
        '%',
      22,
      126,
      17,
      overview.coverage >=
        0.9
        ? COLORS.green
        : COLORS.orange,
      '700'
    );

    let summaryX =
      112;

    for (
      const role of
      openingConfig.roles
    ) {
      this.text(
        ctx,
        role.name,
        summaryX,
        101,
        6.5,
        COLORS.muted,
        '600',
        'center'
      );

      this.text(
        ctx,
        (
          overview.current[
            role.id
          ] ||
          0
        ) +
          '/' +
          overview.required[
            role.id
          ],
        summaryX,
        128,
        9,
        (
          overview.current[
            role.id
          ] ||
          0
        ) >=
          overview.required[
            role.id
          ]
          ? COLORS.green
          : COLORS.text,
        '700',
        'center'
      );

      summaryX +=
        65;
    }

    const tabsY =
      176;

    const gap =
      5;

    const tabW =
      (
        DESIGN_W -
        20 -
        gap * 3
      ) /
      4;

    for (
      let i = 0;
      i <
      openingConfig
        .roles
        .length;
      i++
    ) {
      const role =
        openingConfig.roles[i];

      const active =
        role.id ===
        this.roleId;

      const x =
        10 +
        i *
        (
          tabW +
          gap
        );

      this.rounded(
        ctx,
        x,
        tabsY,
        tabW,
        33,
        9,
        active
          ? COLORS.gold
          : '#EAE1D5',
        '#D5C8B9'
      );

      this.text(
        ctx,
        role.name,
        x +
          tabW / 2,
        tabsY +
          16.5,
        7.2,
        active
          ? COLORS.text
          : COLORS.muted,
        '700',
        'center'
      );

      this.addButton(
        'role:' +
          role.id,
        x,
        tabsY,
        tabW,
        33
      );
    }

    const candidates =
      overview
        .candidates
        .filter(
          item =>
            item.roleId ===
            this.roleId
        )
        .sort(
          (
            a,
            b
          ) =>
            b.score -
            a.score
        );

    let y =
      224;

    for (
      let i = 0;
      i <
      candidates.length;
      i++
    ) {
      const candidate =
        candidates[i];

      this.rounded(
        ctx,
        10,
        y,
        370,
        105,
        12,
        COLORS.panel,
        COLORS.line
      );

      this.rounded(
        ctx,
        22,
        y + 14,
        49,
        49,
        25,
        i ===
          0
          ? '#FFE4A4'
          : '#E5EEF1'
      );

      this.text(
        ctx,
        candidate.name
          .slice(
            -1
          ),
        46.5,
        y + 38.5,
        15,
        COLORS.navy,
        '700',
        'center'
      );

      this.text(
        ctx,
        candidate.name +
          ' · ' +
          candidate.age +
          '岁',
        84,
        y + 20,
        9.5,
        COLORS.text,
        '700'
      );

      this.text(
        ctx,
        candidate.experience +
          '年经验 · 月薪' +
          money(
            candidate.wage
          ),
        84,
        y + 43,
        7,
        COLORS.muted,
        '600'
      );

      this.text(
        ctx,
        '技能 ' +
          candidate.skill +
          ' · 稳定 ' +
          candidate.stability +
          ' · 综合 ' +
          candidate.score,
        22,
        y + 76,
        7,
        i ===
          0
          ? COLORS.orange
          : COLORS.blue,
        '700'
      );

      this.rounded(
        ctx,
        286,
        y + 63,
        78,
        29,
        8,
        COLORS.gold
      );

      this.text(
        ctx,
        '录用',
        325,
        y + 77.5,
        7.5,
        COLORS.text,
        '700',
        'center'
      );

      this.addButton(
        'hire:' +
          candidate.id,
        282,
        y + 59,
        86,
        37
      );

      y +=
        114;
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
      11,
      overview.coverage >=
        0.9
        ? COLORS.green
        : COLORS.navy
    );

    this.text(
      ctx,
      overview.coverage >=
        0.9
        ? '基本班组已齐备'
        : '候选人次日会自动更新',
      195,
      actionY + 20,
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
        'role:'
      ) ===
      0
    ) {
      this.roleId =
        item.id.slice(
          5
        );

      return true;
    }

    if (
      item.id.indexOf(
        'hire:'
      ) ===
      0
    ) {
      const result =
        openingPrepSystem
          .hireCandidate(
            this.shopId,
            item.id.slice(
              5
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
              ? result.staff.name +
                ' 已入职'
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
  new StaffScene();
