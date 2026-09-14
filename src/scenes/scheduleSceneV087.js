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

const scheduleSystem =
  require('../operations/operationsScheduleV087.js');

const staffWorkloadSystem =
  require('../operations/staffWorkloadV089.js');
// V089_SCHEDULE_WORKLOAD_UI

const ui =
  require('../ui/premiumUi.js');

const opUi =
  require('../ui/operationsUiV080.js');

const ROLE_NAMES = {
  manager:'店长',
  chef:'厨师',
  server:'服务员',
  cashier:'收银'
};

class ScheduleScene {
  constructor() {
    this.id =
      'schedule';

    this.shopId =
      null;

    this.buttons =
      [];

    this.page =
      0;
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

    if (this.shopId) {
      scheduleSystem
        .ensureShop(
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
        'gold'
        ? '#F2BC49'
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
            ? '#D7E0E3'
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
      7.6,
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

  render(ctx) {
    if (
      !ctx ||
      !this.shopId
    ) {
      return;
    }

    const snapshot =
      scheduleSystem
        .getSnapshot(
          this.shopId
        );

    if (!snapshot) {
      return;
    }

    const workload =
      staffWorkloadSystem
        .getSnapshot(
          this.shopId,
          gameState
            .getTime()
        );

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
      '营业时间与排班',
      '高峰、疲劳、加班与班次缺口实时联动'
    );

    this.addButton(
      'back',
      8,
      92,
      42,
      36
    );

    ui.text(
      ctx,
      '‹ 返回',
      16,
      110,
      7.8,
      '#173D54',
      '800'
    );

    ui.card(
      ctx,
      14,
      136,
      362,
      124,
      {
        radius:14,
        fill:'#FFFDF8',
        stroke:'#DDD4C7',
        shadow:false
      }
    );

    ui.text(
      ctx,
      '营业时间',
      28,
      158,
      10,
      '#173D54',
      '800'
    );

    ui.text(
      ctx,
      String(
        snapshot
          .businessHours
          .openHour
      ).padStart(
        2,
        '0'
      ) +
        ':00',
      86,
      197,
      15,
      '#173D54',
      '800',
      'center'
    );

    ui.text(
      ctx,
      '—',
      195,
      197,
      12,
      '#75858D',
      '700',
      'center'
    );

    ui.text(
      ctx,
      String(
        snapshot
          .businessHours
          .closeHour
      ).padStart(
        2,
        '0'
      ) +
        ':00',
      304,
      197,
      15,
      '#173D54',
      '800',
      'center'
    );

    this.drawButton(
      ctx,
      'open:-1',
      '开门 -1h',
      28,
      217,
      78,
      'soft'
    );

    this.drawButton(
      ctx,
      'open:1',
      '开门 +1h',
      112,
      217,
      78,
      'soft'
    );

    this.drawButton(
      ctx,
      'close:-1',
      '打烊 -1h',
      202,
      217,
      78,
      'soft'
    );

    this.drawButton(
      ctx,
      'close:1',
      '打烊 +1h',
      286,
      217,
      78,
      'soft'
    );

    ui.card(
      ctx,
      14,
      274,
      362,
      88,
      {
        radius:14,
        fill:
          snapshot.coverage >=
            0.8
            ? '#F1F8F2'
            : '#FFF5E8',
        stroke:
          snapshot.coverage >=
            0.8
            ? '#C9DFC9'
            : '#E8CFA8',
        shadow:false
      }
    );

    ui.text(
      ctx,
      '当前星期' +
        snapshot.weekDayName +
        ' · 在岗 ' +
        snapshot.active +
        '/' +
        snapshot.required,
      28,
      298,
      8,
      '#173D54',
      '800'
    );

    ui.text(
      ctx,
      '实时排班承载 ' +
        Math.round(
          snapshot.coverage *
          100
        ) +
        '%',
      28,
      325,
      9,
      snapshot.coverage >=
        0.8
        ? '#40865A'
        : '#C37A35',
      '800'
    );

    ui.text(
      ctx,
      workload.peak.label +
        ' · ' +
        workload.pressure +
        ' · 疲劳' +
        workload.avgFatigue +
        ' · 冲突' +
        workload.conflictCount +
        ' · 加班¥' +
        Math.round(
          workload
            .todayOvertimePay
        ),
      28,
      347,
      6.6,
      workload.conflictCount >
        0 ||
      workload.avgFatigue >=
        65
        ? '#C85242'
        : '#617A86',
      '700'
    );

    ui.text(
      ctx,
      '员工排班',
      20,
      370,
      10,
      '#173D54',
      '800'
    );

    const rowsPerPage =
      4;

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          snapshot.employees.length /
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
      snapshot.employees
        .slice(
          this.page *
            rowsPerPage,
          this.page *
            rowsPerPage +
            rowsPerPage
        );

    let y =
      390;

    for (
      const row
      of rows
    ) {
      ui.card(
        ctx,
        14,
        y,
        362,
        70,
        {
          radius:12,
          fill:'#FFFDF8',
          stroke:'#E0D7CB',
          shadow:false
        }
      );

      ui.text(
        ctx,
        row.name ||
          row.id,
        28,
        y +
          18,
        8.4,
        '#173D54',
        '800'
      );

      ui.text(
        ctx,
        (
          ROLE_NAMES[
            row.roleId
          ] ||
          row.roleId
        ) +
          ' · ' +
          (
            row.start ==
            null
              ? '今日不排'
              : (
                  String(
                    row.start
                  ).padStart(
                    2,
                    '0'
                  ) +
                  ':00-' +
                  String(
                    row.end
                  ).padStart(
                    2,
                    '0'
                  ) +
                  ':00'
                )
          ),
        28,
        y +
          43,
        6.8,
        row.workingNow
          ? '#40865A'
          : '#77878F',
        '700'
      );

      this.drawButton(
        ctx,
        'shift:' +
          row.id,
        scheduleSystem
          .presetName(
            row.preset
          ),
        238,
        y +
          18,
        58,
        'blue'
      );

      this.drawButton(
        ctx,
        'off:' +
          row.id,
        '休周' +
          row.offDayName,
        302,
        y +
          18,
        60,
        'soft'
      );

      y +=
        78;
    }

    const navY =
      Math.min(
        h -
          92,
        706
      );

    this.drawButton(
      ctx,
      'page:prev',
      '上一页',
      86,
      navY,
      86,
      'soft'
    );

    ui.text(
      ctx,
      (
        this.page +
        1
      ) +
        '/' +
        totalPages,
      195,
      navY +
        17,
      7.4,
      '#677A84',
      '700',
      'center'
    );

    this.drawButton(
      ctx,
      'page:next',
      '下一页',
      218,
      navY,
      86,
      'soft'
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
        'open:'
      ) ===
      0
    ) {
      const delta =
        Number(
          button.id
            .split(':')[1]
        );

      const result =
        scheduleSystem
          .adjustOpenHour(
            this.shopId,
            delta
          );

      if (!result.ok) {
        this.toast(
          result.message
        );
      }

      saveSystem
        .autoSave(
          true
        );

      return true;
    }

    if (
      button.id.indexOf(
        'close:'
      ) ===
      0
    ) {
      const delta =
        Number(
          button.id
            .split(':')[1]
        );

      const result =
        scheduleSystem
          .adjustCloseHour(
            this.shopId,
            delta
          );

      if (!result.ok) {
        this.toast(
          result.message
        );
      }

      saveSystem
        .autoSave(
          true
        );

      return true;
    }

    if (
      button.id.indexOf(
        'shift:'
      ) ===
      0
    ) {
      scheduleSystem
        .cycleEmployeeShift(
          this.shopId,
          button.id.slice(
            6
          )
        );

      saveSystem
        .autoSave(
          true
        );

      return true;
    }

    if (
      button.id.indexOf(
        'off:'
      ) ===
      0
    ) {
      scheduleSystem
        .cycleEmployeeOffDay(
          this.shopId,
          button.id.slice(
            4
          )
        );

      saveSystem
        .autoSave(
          true
        );

      return true;
    }

    const snapshot =
      scheduleSystem
        .getSnapshot(
          this.shopId
        );

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          snapshot.employees.length /
          4
        )
      );

    if (
      button.id ===
      'page:prev'
    ) {
      this.page =
        (
          this.page -
          1 +
          totalPages
        ) %
        totalPages;

      return true;
    }

    if (
      button.id ===
      'page:next'
    ) {
      this.page =
        (
          this.page +
          1
        ) %
        totalPages;

      return true;
    }

    return false;
  }
}

module.exports =
  new ScheduleScene();
