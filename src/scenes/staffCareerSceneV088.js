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

const sceneManager =
  require('../core/sceneManager.js');

const staffCareer =
  require('../operations/staffCareerV088.js');

const ratingSystem =
  require('../rating/ratingSystemV104.js');

const ratingUi =
  require('../ui/ratingWidgetsV104.js'); // V104_RATING_VISUALIZATION

const ui =
  require('../ui/premiumUi.js');

const opUi =
  require('../ui/operationsUiV080.js');

function money(value) {
  return (
    '¥' +
    Math.round(
      Number(value) ||
      0
    ).toLocaleString()
  );
}

class StaffCareerScene {
  constructor() {
    this.id =
      'staffCareer';

    this.shopId =
      null;

    this.selectedId =
      null;

    this.page =
      0;

    this.buttons =
      [];
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

    this.page =
      0;

    const snapshot =
      this.shopId
        ? staffCareer
            .getTeamSnapshot(
              this.shopId
            )
        : null;

    this.selectedId =
      snapshot &&
      snapshot.employees[0]
        ? snapshot
            .employees[0]
            .id
        : null;
  }

  update() {
  }

  exit() {
    this.buttons =
      [];
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
          b.x +
          b.w &&
        y >=
          b.y &&
        y <=
          b.y +
          b.h
      ) {
        return b;
      }
    }

    return null;
  }

  button(
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
        'gold'
        ? '#F1BC49'
        : tone ===
            'green'
          ? '#4C9768'
          : tone ===
              'soft'
            ? '#EEF3F4'
            : '#2F91B8';

    ui.card(
      ctx,
      x,
      y,
      w,
      34,
      {
        radius:10,
        fill,
        stroke:
          tone ===
            'soft'
            ? '#D6E0E3'
            : false,
        shadow:false
      }
    );

    ui.text(
      ctx,
      label,
      x +
        w /
        2,
      y +
        17,
      7.3,
      tone ===
        'soft'
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
      34
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

  selected(
    snapshot
  ) {
    return (
      snapshot
        .employees
        .find(
          row =>
            row.id ===
            this.selectedId
        ) ||
      snapshot
        .employees[0] ||
      null
    );
  }

  render(ctx) {
    if (
      !ctx ||
      !this.shopId
    ) {
      return;
    }

    const snapshot =
      staffCareer
        .getTeamSnapshot(
          this.shopId
        );

    if (!snapshot) {
      return;
    }

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
      '团队管理',
      '成长、培训、薪资与离职风险'
    );

    this.addButton(
      'back',
      8,
      92,
      48,
      34
    );

    ui.text(
      ctx,
      '‹ 返回',
      16,
      109,
      7.8,
      '#173D54',
      '800'
    );

    ui.card(
      ctx,
      14,
      132,
      362,
      74,
      {
        radius:14,
        fill:'#FFFDF8',
        stroke:'#DDD4C7',
        shadow:false
      }
    );

    ui.text(
      ctx,
      snapshot.shopName ||
        '门店团队',
      28,
      153,
      9.6,
      '#173D54',
      '800'
    );

    ui.text(
      ctx,
      '员工 ' +
        snapshot.count +
        ' · 情绪 ' +
        snapshot.avgMood +
        ' · 压力 ' +
        snapshot.avgStress +
        ' · 忠诚 ' +
        snapshot.avgLoyalty,
      28,
      178,
      7,
      '#71838C',
      '700'
    );

    ui.text(
      ctx,
      '高离职风险 ' +
        snapshot.highRisk +
        ' · 当前离岗 ' +
        snapshot.unavailable,
      28,
      197,
      6.8,
      snapshot.highRisk
        ? '#C65D4F'
        : '#4C9768',
      '700'
    );

    const rowsPerPage =
      3;

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          snapshot
            .employees
            .length /
          rowsPerPage
        )
      );

    this.page =
      Math.min(
        this.page,
        totalPages -
        1
      );

    const rows =
      snapshot
        .employees
        .slice(
          this.page *
            rowsPerPage,
          this.page *
            rowsPerPage +
            rowsPerPage
        );

    let y =
      220;

    for (
      const row
      of rows
    ) {
      const selected =
        row.id ===
        this.selectedId;

      const rowRating =
        ratingSystem
          .evaluateEmployee(
            row
          );

      ui.card(
        ctx,
        14,
        y,
        362,
        58,
        {
          radius:12,
          fill:
            selected
              ? '#FFF5D9'
              : '#FFFDF8',
          stroke:
            selected
              ? '#E4BC64'
              : '#E0D7CB',
          shadow:false
        }
      );

      ui.text(
        ctx,
        row.name +
          ' · ' +
          row.title,
        28,
        y +
          17,
        8.1,
        '#173D54',
        '800'
      );

      ui.text(
        ctx,
        '能力 Lv.' +
          rowRating.growthLevel +
          ' ' +
          rowRating.tier +
          ' · 绩效 ' +
          row.performance +
          ' · ' +
          row.statusLabel,
        28,
        y +
          41,
        6.7,
        row.unavailable
          ? '#C27B36'
          : '#71838C',
        '700'
      );

      ui.text(
        ctx,
        money(
          row.wage
        ) +
          '/月',
        352,
        y +
          18,
        6.8,
        '#5B7580',
        '700',
        'right'
      );

      this.addButton(
        'select:' +
          row.id,
        14,
        y,
        362,
        58
      );

      y +=
        65;
    }

    if (
      totalPages >
      1
    ) {
      this.button(
        ctx,
        'page:prev',
        '上一页',
        240,
        414,
        58,
        'soft'
      );

      this.button(
        ctx,
        'page:next',
        '下一页',
        304,
        414,
        58,
        'soft'
      );
    }

    const selected =
      this.selected(
        snapshot
      );

    if (selected) {
      const selectedRating =
        ratingSystem
          .evaluateEmployee(
            selected
          );

      const detailY =
        424;

      ui.card(
        ctx,
        14,
        detailY,
        362,
        142,
        {
          radius:14,
          fill:'#FFFDF8',
          stroke:'#DDD4C7',
          shadow:false
        }
      );

      ui.text(
        ctx,
        selected.name +
          ' · ' +
          selected.title +
          ' · 能力Lv.' +
          selectedRating.growthLevel,
        28,
        detailY +
          22,
        9.1,
        '#173D54',
        '800'
      );

      ratingUi.badge(
        ctx,
        302,
        detailY + 10,
        58,
        22,
        selectedRating.grade,
        selectedRating.score
      );

      ui.text(
        ctx,
        '技能 ' +
          selected.skill +
          '  绩效 ' +
          selected.performance +
          '  工资 ' +
          money(
            selected.wage
          ),
        28,
        detailY +
          50,
        7.1,
        '#5F737D',
        '700'
      );

      ui.text(
        ctx,
        '情绪 ' +
          selected.mood +
          '  精力 ' +
          selected.energy +
          '  压力 ' +
          selected.stress,
        28,
        detailY +
          76,
        7.1,
        '#5F737D',
        '700'
      );

      ui.text(
        ctx,
        '满意 ' +
          selected.satisfaction +
          '  忠诚 ' +
          selected.loyalty +
          '  离职风险 ' +
          selected.turnoverRisk,
        28,
        detailY +
          102,
        7.1,
        selected.turnoverRisk >=
          68
          ? '#C65D4F'
          : '#5F737D',
        '700'
      );

      ui.text(
        ctx,
        selected.promotion
          .eligible
          ? '已满足下一职级晋升条件'
          : (
              '下一职级：技能' +
              selected
                .promotion
                .skillRequired +
              ' / 任职' +
              selected
                .promotion
                .tenureRequired +
              '天'
            ),
        28,
        detailY +
          126,
        6.5,
        selected.promotion
          .eligible
          ? '#4C9768'
          : '#8A7A68',
        '700'
      );

      const y1 =
        582;

      const y2 =
        624;

      this.button(
        ctx,
        'train',
        '培训',
        14,
        y1,
        108,
        'blue'
      );

      this.button(
        ctx,
        'raise',
        '加薪',
        140,
        y1,
        108,
        'gold'
      );

      this.button(
        ctx,
        'promote',
        '晋升',
        266,
        y1,
        108,
        selected
          .promotion
          .eligible
          ? 'green'
          : 'soft'
      );

      this.button(
        ctx,
        'leave',
        '请假1天',
        76,
        y2,
        108,
        'soft'
      );

      this.button(
        ctx,
        'coach',
        '沟通关怀',
        206,
        y2,
        108,
        'blue'
      );
    }

    ctx.restore();
  }

  handleTap(
    x,
    y
  ) {
    const button =
      this.hit(
        x,
        y
      );

    if (!button) {
      return false;
    }

    if (
      button.id ===
      'back'
    ) {
      sceneManager
        .switchTo(
          'staff',
          {
            shopId:
              this.shopId
          }
        );

      return true;
    }

    if (
      button.id.indexOf(
        'select:'
      ) ===
      0
    ) {
      this.selectedId =
        button.id.slice(
          7
        );

      return true;
    }

    const snapshot =
      staffCareer
        .getTeamSnapshot(
          this.shopId
        );

    const selected =
      this.selected(
        snapshot
      );

    if (!selected) {
      return false;
    }

    let result =
      null;

    if (
      button.id ===
      'train'
    ) {
      result =
        staffCareer
          .startTraining(
            this.shopId,
            selected.id
          );

      this.toast(
        result.ok
          ? (
              '培训开始，费用' +
              money(
                result.cost
              )
            )
          : result.message
      );
    } else if (
      button.id ===
      'raise'
    ) {
      result =
        staffCareer
          .giveRaise(
            this.shopId,
            selected.id
          );

      this.toast(
        result.ok
          ? (
              '加薪成功，现月薪' +
              money(
                result.wage
              )
            )
          : result.message
      );
    } else if (
      button.id ===
      'promote'
    ) {
      result =
        staffCareer
          .promote(
            this.shopId,
            selected.id
          );

      this.toast(
        result.ok
          ? (
              '晋升为' +
              result.title
            )
          : result.message
      );
    } else if (
      button.id ===
      'leave'
    ) {
      result =
        staffCareer
          .approveLeave(
            this.shopId,
            selected.id,
            1
          );

      this.toast(
        result.ok
          ? '已批准请假1天'
          : result.message
      );
    } else if (
      button.id ===
      'coach'
    ) {
      result =
        staffCareer
          .coach(
            this.shopId,
            selected.id
          );

      this.toast(
        result.ok
          ? '沟通完成'
          : result.message
      );
    } else if (
      button.id ===
      'page:prev'
    ) {
      const totalPages =
        Math.max(
          1,
          Math.ceil(
            snapshot
              .employees
              .length /
            3
          )
        );

      this.page =
        (
          this.page -
          1 +
          totalPages
        ) %
        totalPages;

      return true;
    } else if (
      button.id ===
      'page:next'
    ) {
      const totalPages =
        Math.max(
          1,
          Math.ceil(
            snapshot
              .employees
              .length /
            3
          )
        );

      this.page =
        (
          this.page +
          1
        ) %
        totalPages;

      return true;
    }

    if (
      result &&
      result.ok
    ) {
      saveSystem
        .autoSave(
          true
        );
    }

    return true;
  }
}

module.exports =
  new StaffCareerScene();
