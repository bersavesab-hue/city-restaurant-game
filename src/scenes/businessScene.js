'use strict';

const runtime =
  globalThis.GameRuntime;

if (!runtime) {
  throw new Error(
    'BusinessScene：GameRuntime 未初始化'
  );
}

const gameState =
  require('../core/gameState.js');

const operations =
  require('../operations/operationsStoreV080.js');

const liveWorldSystem =
  require('../world/liveWorldSystemV084.js');

const managementSystem =
  require('../world/managementWorldSystemV085.js');

const ui =
  require('../ui/premiumUi.js');

const opUi =
  require('../ui/operationsUiV080.js');

const TABS = [
  {
    id:'overview',
    name:'经营'
  },
  {
    id:'staff',
    name:'员工'
  },
  {
    id:'competitor',
    name:'竞品'
  },
  {
    id:'rank',
    name:'排行'
  }
];

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function riskTone(
  value
) {
  if (
    value >=
    75
  ) {
    return '#C85242';
  }

  if (
    value >=
    50
  ) {
    return '#D78A22';
  }

  return '#248B63';
}

class BusinessScene {
  constructor() {
    this.id =
      'business';

    this.buttons =
      [];

    this.tab =
      'overview';

    this.staffPage =
      0;

    this.competitorPage =
      0;

    this.selectedStaffId =
      null;
  }

  enter(
    payload
  ) {
    if (
      payload &&
      payload.tab &&
      TABS.some(
        row =>
          row.id ===
          payload.tab
      )
    ) {
      this.tab =
        payload.tab;
    }

    this.buttons =
      [];
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
      const row =
        this.buttons[i];

      if (
        x >= row.x &&
        x <=
          row.x +
          row.w &&
        y >= row.y &&
        y <=
          row.y +
          row.h
      ) {
        return row;
      }
    }

    return null;
  }

  renderTabs(
    ctx
  ) {
    const gap =
      6;

    const w =
      (
        390 -
        28 -
        gap *
        (
          TABS.length -
          1
        )
      ) /
      TABS.length;

    for (
      let i = 0;
      i <
      TABS.length;
      i++
    ) {
      const tab =
        TABS[i];

      const x =
        14 +
        i *
        (
          w +
          gap
        );

      opUi.pill(
        ctx,
        tab.name,
        x,
        94,
        w,
        this.tab ===
          tab.id
      );

      this.addButton(
        'tab:' +
        tab.id,
        x,
        94,
        w,
        30
      );
    }
  }

  metric(
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
      68,
      {
        radius:14,
        fill:'#FFFDF8',
        stroke:'#DDD4C7',
        shadow:false
      }
    );

    ui.text(
      ctx,
      label,
      x +
      14,
      y +
      18,
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
      45,
      12.5,
      tone ||
      '#173D54',
      '800'
    );
  }

  sectionCard(
    ctx,
    x,
    y,
    w,
    h,
    title
  ) {
    ui.card(
      ctx,
      x,
      y,
      w,
      h,
      {
        radius:15,
        fill:'#FFFDF8',
        stroke:'#DDD4C7',
        shadow:false
      }
    );

    ui.text(
      ctx,
      title,
      x +
      14,
      y +
      20,
      9.2,
      '#173D54',
      '800'
    );
  }

  renderOverview(
    ctx,
    shop
  ) {
    const data =
      operations
        .dashboard(
          shop.id
        );

    const market =
      liveWorldSystem
        .getDistrictDashboard(
          shop.districtId
        );

    const people =
      liveWorldSystem
        .getStaffSummary(
          shop.id
        );

    this.metric(
      ctx,
      '本期营业额',
      opUi.money(
        data.finance
          .revenue
      ),
      14,
      138,
      '#D29A18'
    );

    this.metric(
      ctx,
      '本期利润',
      opUi.money(
        data.finance
          .profit
      ),
      206,
      138,
      data.finance
        .profit >=
        0
        ? '#248B63'
        : '#C85242'
    );

    this.metric(
      ctx,
      '真实订单',
      String(
        data.finance
          .orders
      ),
      14,
      216
    );

    this.metric(
      ctx,
      '商圈竞争',
      market
        .intensityLabel +
      ' ' +
      market.intensity,
      206,
      216,
      riskTone(
        market.intensity
      )
    );

    this.sectionCard(
      ctx,
      14,
      298,
      362,
      154,
      '经营结构'
    );

    const rows = [
      [
        '利润率',
        data.finance
          .profitRate +
        '%'
      ],
      [
        '平均客单',
        opUi.money(
          data.finance
            .avgTicket
        )
      ],
      [
        '门店评分',
        Number(
          data.shopRating
        ).toFixed(
          1
        ) +
        ' / 5.0'
      ],
      [
        '员工状态',
        people.count
          ? '情绪' +
            people.avgMood +
            ' · 压力' +
            people.avgStress
          : '暂无员工'
      ]
    ];

    let y =
      330;

    for (
      const row
      of rows
    ) {
      ui.text(
        ctx,
        row[0],
        28,
        y,
        7.3,
        '#728792',
        '600'
      );

      ui.text(
        ctx,
        row[1],
        352,
        y,
        7.7,
        '#173D54',
        '800',
        'right'
      );

      y +=
        27;
    }

    const events =
      managementSystem
        .getMarketEvents(
          shop.districtId,
          4
        );

    this.sectionCard(
      ctx,
      14,
      468,
      362,
      150,
      '最近竞争动态'
    );

    let ey =
      500;

    if (!events.length) {
      ui.text(
        ctx,
        '当前商圈暂无明显竞争动作',
        28,
        ey,
        7.4,
        '#71858F',
        '600'
      );
    } else {
      for (
        const event
        of events
      ) {
        let text =
          event
            .competitorName ||
          '竞品';

        if (
          event.type ===
          'competitor_action'
        ) {
          text +=
            ' · ' +
            (
              event.actionName ||
              '观察市场'
            );
        } else if (
          event.type ===
          'opening_started'
        ) {
          text +=
            ' · 开始筹备新店';
        } else if (
          event.type ===
          'store_opened'
        ) {
          text +=
            ' · 新店开业';
        } else if (
          event.type ===
          'store_closed'
        ) {
          text +=
            ' · 门店退出';
        } else if (
          event.type ===
          'staff_entrepreneur'
        ) {
          text =
            (
              event.personName ||
              '前员工'
            ) +
            ' · 离职创业';
        }

        ui.text(
          ctx,
          text,
          28,
          ey,
          7.2,
          '#3A5665',
          '600'
        );

        ey +=
          27;
      }
    }
  }

  renderStaff(
    ctx,
    shop
  ) {
    const roster =
      managementSystem
        .getStaffRoster(
          shop.id
        );

    const summary =
      liveWorldSystem
        .getStaffSummary(
          shop.id
        );

    this.sectionCard(
      ctx,
      14,
      138,
      362,
      72,
      '团队状态'
    );

    ui.text(
      ctx,
      '人数 ' +
      summary.count +
      ' · 情绪 ' +
      summary.avgMood +
      ' · 压力 ' +
      summary.avgStress +
      ' · 高离职风险 ' +
      summary
        .highTurnoverRisk,
      28,
      181,
      7.3,
      summary
        .highTurnoverRisk >
        0
        ? '#C85242'
        : '#3A5665',
      '700'
    );

    if (!roster.length) {
      ui.text(
        ctx,
        '当前没有已录用员工，请先去门店招聘。',
        195,
        300,
        9,
        '#71858F',
        '700',
        'center'
      );

      return;
    }

    const perPage =
      opUi.viewHeight() <
        740
        ? 2
        : 3;

    const pages =
      Math.max(
        1,
        Math.ceil(
          roster.length /
          perPage
        )
      );

    this.staffPage =
      clamp(
        this.staffPage,
        0,
        pages -
        1
      );

    const rows =
      roster.slice(
        this.staffPage *
        perPage,
        this.staffPage *
        perPage +
        perPage
      );

    let y =
      224;

    for (
      const staff
      of rows
    ) {
      const selected =
        staff.id ===
        this.selectedStaffId;

      ui.card(
        ctx,
        14,
        y,
        362,
        114,
        {
          radius:14,
          fill:
            selected
              ? '#FFF6D9'
              : '#FFFDF8',
          stroke:
            selected
              ? '#E6B74C'
              : '#DDD4C7',
          shadow:false
        }
      );

      ui.text(
        ctx,
        staff.name +
        ' · ' +
        staff.roleName,
        28,
        y +
        22,
        9.1,
        '#173D54',
        '800'
      );

      ui.text(
        ctx,
        '月薪' +
        opUi.money(
          staff.wage
        ) +
        ' · 技能' +
        staff.skill +
        (
          staff
            .personalityLabels
            .length
            ? ' · ' +
              staff
                .personalityLabels
                .slice(
                  0,
                  2
                )
                .join(
                  '/'
                )
            : ''
        ),
        28,
        y +
        47,
        7,
        '#71858F',
        '600'
      );

      ui.text(
        ctx,
        '情绪' +
        staff.mood +
        '  精力' +
        staff.energy +
        '  压力' +
        staff.stress +
        '  忠诚' +
        staff.loyalty,
        28,
        y +
        73,
        7,
        '#3A5665',
        '700'
      );

      ui.text(
        ctx,
        '离职风险 ' +
        staff.turnoverRisk +
        '%',
        28,
        y +
        98,
        7.2,
        riskTone(
          staff.turnoverRisk
        ),
        '800'
      );

      opUi.button(
        ctx,
        selected
          ? '已选择'
          : '管理',
        292,
        y +
        76,
        68,
        28,
        selected
          ? 'gold'
          : null
      );

      this.addButton(
        'staff:' +
        staff.id,
        282,
        y +
        68,
        84,
        40
      );

      y +=
        122;
    }

    const selected =
      roster.find(
        row =>
          row.id ===
          this.selectedStaffId
      ) ||
      rows[0];

    if (
      selected &&
      !this.selectedStaffId
    ) {
      this.selectedStaffId =
        selected.id;
    }

    const actionY =
      Math.min(
        590,
        opUi.viewHeight() -
        154
      );

    if (selected) {
      ui.text(
        ctx,
        '管理 ' +
        selected.name,
        18,
        actionY -
        13,
        7.4,
        '#173D54',
        '800'
      );

      const actions = [
        [
          'raise',
          '调薪',
          'gold'
        ],
        [
          'rest',
          '休息',
          null
        ],
        [
          'train',
          '培训',
          null
        ],
        [
          'dismiss',
          '离职',
          'danger'
        ]
      ];

      const w =
        82;

      for (
        let i = 0;
        i <
        actions.length;
        i++
      ) {
        const a =
          actions[i];

        const x =
          14 +
          i *
          90;

        opUi.button(
          ctx,
          a[1],
          x,
          actionY,
          w,
          34,
          a[2]
        );

        this.addButton(
          'staffaction:' +
          a[0],
          x,
          actionY,
          w,
          34
        );
      }
    }

    if (
      pages >
      1
    ) {
      opUi.button(
        ctx,
        '上一页',
        14,
        actionY +
        44,
        82,
        28
      );

      opUi.button(
        ctx,
        (
          this.staffPage +
          1
        ) +
        '/' +
        pages,
        154,
        actionY +
        44,
        82,
        28,
        'gold'
      );

      opUi.button(
        ctx,
        '下一页',
        294,
        actionY +
        44,
        82,
        28
      );

      this.addButton(
        'staffprev',
        14,
        actionY +
        44,
        82,
        28
      );

      this.addButton(
        'staffnext',
        294,
        actionY +
        44,
        82,
        28
      );
    }
  }

  renderCompetitors(
    ctx,
    shop
  ) {
    const market =
      liveWorldSystem
        .getDistrictDashboard(
          shop.districtId
        );

    const rows =
      managementSystem
        .getCompetitors(
          shop.districtId,
          20
        );

    this.sectionCard(
      ctx,
      14,
      138,
      362,
      72,
      '商圈竞争'
    );

    ui.text(
      ctx,
      market
        .intensityLabel +
      ' · 强度 ' +
      market.intensity +
      ' · 实际竞品门店 ' +
      market.competitorCount +
      ' · 筹备中 ' +
      market.openings,
      28,
      181,
      7.2,
      riskTone(
        market.intensity
      ),
      '800'
    );

    const perPage =
      opUi.viewHeight() <
        740
        ? 3
        : 4;

    const pages =
      Math.max(
        1,
        Math.ceil(
          rows.length /
          perPage
        )
      );

    this.competitorPage =
      clamp(
        this.competitorPage,
        0,
        pages -
        1
      );

    const visible =
      rows.slice(
        this.competitorPage *
        perPage,
        this.competitorPage *
        perPage +
        perPage
      );

    let y =
      224;

    if (!visible.length) {
      ui.text(
        ctx,
        '本商圈暂无可追踪竞品。',
        195,
        300,
        9,
        '#71858F',
        '700',
        'center'
      );
    }

    for (
      let i = 0;
      i <
      visible.length;
      i++
    ) {
      const row =
        visible[i];

      ui.card(
        ctx,
        14,
        y,
        362,
        82,
        {
          radius:13,
          fill:'#FFFDF8',
          stroke:'#DDD4C7',
          shadow:false
        }
      );

      ui.text(
        ctx,
        (
          this.competitorPage *
          perPage +
          i +
          1
        ) +
        '. ' +
        row.name,
        28,
        y +
        19,
        8.8,
        '#173D54',
        '800'
      );

      ui.text(
        ctx,
        '实力' +
        row.score +
        ' · 本区' +
        row.storeCount +
        '店 · 筹备' +
        row.openingCount +
        '店',
        28,
        y +
        43,
        7,
        '#71858F',
        '600'
      );

      ui.text(
        ctx,
        '最近动作：' +
        row.actionName,
        28,
        y +
        65,
        7.1,
        row.actionId ===
          'poach_staff'
          ? '#C85242'
          : '#3A5665',
        '700'
      );

      if (
        row.ownerName
      ) {
        ui.text(
          ctx,
          row.ownerName,
          352,
          y +
          19,
          7,
          '#A1762A',
          '700',
          'right'
        );
      }

      y +=
        90;
    }

    if (
      pages >
      1
    ) {
      const py =
        Math.min(
          590,
          opUi.viewHeight() -
          106
        );

      opUi.button(
        ctx,
        '上一页',
        14,
        py,
        82,
        30
      );

      opUi.button(
        ctx,
        (
          this.competitorPage +
          1
        ) +
        '/' +
        pages,
        154,
        py,
        82,
        30,
        'gold'
      );

      opUi.button(
        ctx,
        '下一页',
        294,
        py,
        82,
        30
      );

      this.addButton(
        'compprev',
        14,
        py,
        82,
        30
      );

      this.addButton(
        'compnext',
        294,
        py,
        82,
        30
      );
    }
  }

  renderRanking(
    ctx,
    shop
  ) {
    const rows =
      managementSystem
        .getDistrictRanking(
          shop.districtId,
          shop.id,
          10
        );

    this.sectionCard(
      ctx,
      14,
      138,
      362,
      468,
      '商圈动态实力榜'
    );

    ui.text(
      ctx,
      '玩家与NPC共用同一套动态评分，随经营与竞争变化',
      28,
      168,
      7,
      '#71858F',
      '600'
    );

    let y =
      201;

    for (
      const row
      of rows
    ) {
      const top =
        row.rank <=
        3;

      if (
        row.isPlayer
      ) {
        ui.card(
          ctx,
          22,
          y -
          14,
          346,
          38,
          {
            radius:10,
            fill:'#FFF4C8',
            stroke:'#E5B64D',
            shadow:false
          }
        );
      }

      ui.text(
        ctx,
        '#' +
        row.rank,
        30,
        y,
        8,
        top
          ? '#D29A18'
          : '#748791',
        '800'
      );

      ui.text(
        ctx,
        row.name +
        (
          row.isPlayer
            ? '  [我的门店]'
            : ''
        ),
        67,
        y,
        7.8,
        row.isPlayer
          ? '#173D54'
          : '#3A5665',
        row.isPlayer
          ? '800'
          : '700'
      );

      ui.text(
        ctx,
        '实力 ' +
        row.score,
        286,
        y,
        7.4,
        row.isPlayer
          ? '#C77D00'
          : '#173D54',
        '800',
        'right'
      );

      ui.text(
        ctx,
        (
          row.storeCount ||
          1
        ) +
        '店',
        352,
        y,
        7,
        '#71858F',
        '700',
        'right'
      );

      y +=
        39;
    }
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
      '经营管理',
      '经营、员工、竞品和商圈排名统一管理'
    );

    this.renderTabs(
      ctx
    );

    const shop =
      operations
        .getCurrentShop();

    if (!shop) {
      ui.text(
        ctx,
        '开店后解锁完整经营管理中心',
        195,
        230,
        11,
        '#6F838E',
        '800',
        'center'
      );

      ctx.restore();

      return;
    }

    if (
      this.tab ===
      'staff'
    ) {
      this.renderStaff(
        ctx,
        shop
      );
    } else if (
      this.tab ===
      'competitor'
    ) {
      this.renderCompetitors(
        ctx,
        shop
      );
    } else if (
      this.tab ===
      'rank'
    ) {
      this.renderRanking(
        ctx,
        shop
      );
    } else {
      this.renderOverview(
        ctx,
        shop
      );
    }

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
      target.id.indexOf(
        'staff:'
      ) ===
      0
    ) {
      this.selectedStaffId =
        target.id.slice(
          6
        );

      return true;
    }

    if (
      target.id.indexOf(
        'staffaction:'
      ) ===
      0
    ) {
      const shop =
        operations
          .getCurrentShop();

      if (
        !shop ||
        !this.selectedStaffId
      ) {
        return true;
      }

      const action =
        target.id.slice(
          12
        );

      const result =
        managementSystem
          .manageStaff(
            shop.id,
            this.selectedStaffId,
            action
          );

      opUi.toast(
        result.message
      );

      if (
        result.ok &&
        action ===
        'dismiss'
      ) {
        this.selectedStaffId =
          null;
      }

      return true;
    }

    if (
      target.id ===
      'staffprev'
    ) {
      this.staffPage =
        Math.max(
          0,
          this.staffPage -
          1
        );

      return true;
    }

    if (
      target.id ===
      'staffnext'
    ) {
      this.staffPage +=
        1;

      return true;
    }

    if (
      target.id ===
      'compprev'
    ) {
      this.competitorPage =
        Math.max(
          0,
          this.competitorPage -
          1
        );

      return true;
    }

    if (
      target.id ===
      'compnext'
    ) {
      this.competitorPage +=
        1;

      return true;
    }

    return false;
  }
}

module.exports =
  new BusinessScene();
