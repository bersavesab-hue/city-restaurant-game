'use strict';

const gameState =
  require('../core/gameState.js');

const dynamicWorld =
  require('../world/dynamicWorldSystemV0815.js');

const eventPack =
  require('../world/eventPackV0815.js');

const policyPack =
  require('../world/policyPackV0815.js');

const personPack =
  require('../person/personPackV10.js');

const ui =
  require('../ui/premiumUi.js');

const opUi =
  require('../ui/operationsUiV080.js');

const TABS = [
  {
    id:'dynamic',
    name:'动态'
  },
  {
    id:'policy',
    name:'政策'
  },
  {
    id:'discussion',
    name:'讨论'
  },
  {
    id:'people',
    name:'人物'
  }
];

const IMPACT_LABELS = {
  demandMultiplier:'客流需求',
  supplyCostMultiplier:'采购成本',
  laborCostMultiplier:'人工成本',
  rentCostMultiplier:'租金成本',
  utilityCostMultiplier:'水电成本',
  platformCostMultiplier:'平台成本',
  complianceCostMultiplier:'合规成本',
  capacityMultiplier:'经营产能',
  deliveryDemandMultiplier:'外卖需求',
  marketingEfficiencyMultiplier:'营销效率',
  reputationMultiplier:'口碑影响',
  nightDemandMultiplier:'夜间需求',
  inspectionRisk:'检查风险'
};

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0
    )
  );
}

function wrapText(
  ctx,
  text,
  maxWidth,
  maxLines=3
) {
  const chars =
    Array.from(
      String(
        text ||
        ''
      )
    );

  const lines = [];
  let line = '';

  for (
    const ch
    of chars
  ) {
    const next =
      line +
      ch;

    if (
      line &&
      ctx.measureText(
        next
      ).width >
      maxWidth
    ) {
      lines.push(
        line
      );

      line =
        ch;

      if (
        lines.length >=
        maxLines
      ) {
        break;
      }
    } else {
      line =
        next;
    }
  }

  if (
    lines.length <
      maxLines &&
    line
  ) {
    lines.push(
      line
    );
  }

  if (
    lines.length ===
      maxLines &&
    chars.join('').length >
      lines.join('').length
  ) {
    lines[
      lines.length -
      1
    ] =
      lines[
        lines.length -
        1
      ]
        .slice(
          0,
          -1
        ) +
      '…';
  }

  return lines;
}

function roleName(
  id
) {
  const role =
    personPack.NPC_ROLES.find(
      item =>
        item.id ===
        id
    );

  return role
    ? role.name
    : '城市人物';
}

function modifierRows(
  modifiers,
  factor,
  positive
) {
  const rows = [];

  const adverseHighKeys =
    new Set([
      'supplyCostMultiplier',
      'laborCostMultiplier',
      'rentCostMultiplier',
      'utilityCostMultiplier',
      'platformCostMultiplier',
      'complianceCostMultiplier'
    ]);

  for (
    const [key, raw]
    of Object.entries(
      modifiers ||
      {}
    )
  ) {
    if (
      IMPACT_LABELS[
        key
      ] ==
      null
    ) {
      continue;
    }

    let delta =
      Number(
        raw ||
        0
      ) *
      Number(
        factor == null
          ? 1
          : factor
      );

    if (
      positive ===
      true
    ) {
      delta =
        adverseHighKeys.has(
          key
        )
          ? -Math.abs(
              delta
            )
          : Math.abs(
              delta
            );
    } else if (
      positive ===
      false
    ) {
      delta =
        adverseHighKeys.has(
          key
        )
          ? Math.abs(
              delta
            )
          : -Math.abs(
              delta
            );
    }

    if (
      key ===
      'inspectionRisk'
    ) {
      if (
        positive ===
        true
      ) {
        delta =
          -Math.abs(
            delta
          );
      } else if (
        positive ===
        false
      ) {
        delta =
          Math.abs(
            delta
          );
      }
    }

    rows.push({
      key,
      label:
        IMPACT_LABELS[
          key
        ],
      delta
    });
  }

  return rows;
}

class DynamicWorldScene {
  constructor() {
    this.id =
      'dynamicWorld';

    this.tab =
      'dynamic';

    this.page =
      0;

    this.selected =
      null;

    this.buttons =
      [];
  }

  enter(
    payload={}
  ) {
    if (
      payload.tab &&
      TABS.some(
        item =>
          item.id ===
          payload.tab
      )
    ) {
      this.tab =
        payload.tab;
    }

    this.page =
      0;

    this.selected =
      null;

    dynamicWorld
      .markSeen(
        this.tab
      );
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
        x <=
          b.x +
          b.w &&
        y >= b.y &&
        y <=
          b.y +
          b.h
      ) {
        return b;
      }
    }

    return null;
  }

  state() {
    return dynamicWorld
      .getState();
  }

  items() {
    const state =
      this.state();

    if (
      this.tab ===
      'dynamic'
    ) {
      const active =
        (
          state
            .eventState
            .active ||
          []
        ).map(
          item => ({
            kind:'event',
            active:true,
            data:item
          })
        );

      const history =
        (
          state
            .eventState
            .history ||
          []
        ).map(
          item => ({
            kind:'event',
            active:false,
            data:item
          })
        );

      return [
        ...active,
        ...history
      ];
    }

    if (
      this.tab ===
      'policy'
    ) {
      const active =
        (
          state
            .policyState
            .active ||
          []
        ).map(
          item => ({
            kind:'policy',
            active:true,
            data:item
          })
        );

      const history =
        (
          state
            .policyState
            .history ||
          []
        ).map(
          item => ({
            kind:'policy',
            active:false,
            data:item
          })
        );

      return [
        ...active,
        ...history
      ];
    }

    if (
      this.tab ===
      'discussion'
    ) {
      const dialogues =
        (
          state.dialogueFeed ||
          []
        ).map(
          item => ({
            kind:'dialogue',
            day:
              Number(
                item.day
              ) ||
              0,
            data:item
          })
        );

      const barrages =
        (
          state.barrageFeed ||
          []
        ).map(
          item => ({
            kind:'barrage',
            day:
              Number(
                item.day
              ) ||
              0,
            data:item
          })
        );

      return [
        ...dialogues,
        ...barrages
      ].sort(
        (
          a,
          b
        ) =>
          b.day -
          a.day
      );
    }

    return (
      state.npcPool ||
      []
    ).map(
      item => ({
        kind:'person',
        data:item
      })
    );
  }

  phaseName(
    phase
  ) {
    const row =
      eventPack.EVENT_PHASES.find(
        item =>
          item.id ===
          phase
      );

    return row
      ? row.name
      : phase;
  }

  stageName(
    stage
  ) {
    const row =
      policyPack.POLICY_STAGES.find(
        item =>
          item.id ===
          stage
      );

    return row
      ? row.name
      : stage;
  }

  renderHeader(
    ctx,
    h
  ) {
    opUi.background(
      ctx,
      h
    );

    opUi.header(
      ctx,
      '城市动态中心',
      '事件、政策、讨论与长期人物'
    );

    const unread =
      dynamicWorld
        .getUnreadCounts();

    const stats =
      this.state();

    ui.card(
      ctx,
      14,
      92,
      362,
      50,
      {
        radius:13,
        fill:'#FFFDF8',
        stroke:'#DDD4C7',
        shadow:false
      }
    );

    const activeEvents =
      stats
        .eventState
        .active
        .length;

    const activePolicies =
      stats
        .policyState
        .active
        .filter(
          item =>
            item.stage ===
            'active'
        )
        .length;

    ui.text(
      ctx,
      '进行中事件',
      28,
      108,
      7.0,
      '#718590',
      '700'
    );

    ui.text(
      ctx,
      String(
        activeEvents
      ),
      28,
      129,
      10.5,
      '#C98F14',
      '800'
    );

    ui.text(
      ctx,
      '生效政策',
      128,
      108,
      7.0,
      '#718590',
      '700'
    );

    ui.text(
      ctx,
      String(
        activePolicies
      ),
      128,
      129,
      10.5,
      '#173D54',
      '800'
    );

    ui.text(
      ctx,
      '新消息',
      228,
      108,
      7.0,
      '#718590',
      '700'
    );

    ui.text(
      ctx,
      String(
        unread.total
      ),
      228,
      129,
      10.5,
      unread.total >
        0
        ? '#D15142'
        : '#278A64',
      '800'
    );

    ui.text(
      ctx,
      '人物',
      317,
      108,
      7.0,
      '#718590',
      '700'
    );

    ui.text(
      ctx,
      String(
        stats
          .npcPool
          .length
      ),
      317,
      129,
      10.5,
      '#173D54',
      '800'
    );
  }

  renderTabs(
    ctx
  ) {
    const unread =
      dynamicWorld
        .getUnreadCounts();

    const counts = {
      dynamic:
        unread.events,
      policy:
        unread.policies,
      discussion:
        unread.discussion,
      people:0
    };

    let x =
      14;

    for (
      const tab
      of TABS
    ) {
      const w =
        84;

      opUi.pill(
        ctx,
        tab.name,
        x,
        151,
        w,
        this.tab ===
          tab.id
      );

      const count =
        counts[
          tab.id
        ] ||
        0;

      if (
        count >
        0
      ) {
        ctx.beginPath();

        ctx.arc(
          x +
            w -
            8,
          157,
          6,
          0,
          Math.PI *
            2
        );

        ctx.fillStyle =
          '#D94F43';

        ctx.fill();

        ui.text(
          ctx,
          count >
            9
            ? '9+'
            : String(
                count
              ),
          x +
            w -
            8,
          157,
          5.8,
          '#FFFFFF',
          '800',
          'center'
        );
      }

      this.addButton(
        'tab:' +
          tab.id,
        x,
        151,
        w,
        30
      );

      x +=
        92;
    }
  }

  itemTitle(
    row
  ) {
    const item =
      row.data;

    if (
      row.kind ===
      'event'
    ) {
      return item.name;
    }

    if (
      row.kind ===
      'policy'
    ) {
      return item.name;
    }

    if (
      row.kind ===
      'dialogue'
    ) {
      return (
        item.actorName ||
        '城市人物'
      ) +
      ' · ' +
      (
        item.sceneName ||
        '对话'
      );
    }

    if (
      row.kind ===
      'barrage'
    ) {
      return (
        item.speaker ||
        item.sourceName ||
        '城市讨论'
      );
    }

    return (
      item.name ||
      '城市人物'
    );
  }

  itemMeta(
    row
  ) {
    const item =
      row.data;

    if (
      row.kind ===
      'event'
    ) {
      return (
        item.domainName +
        '｜' +
        (
          row.active
            ? this.phaseName(
                item.phase
              )
            : '历史'
        ) +
        '｜' +
        item.severityName
      );
    }

    if (
      row.kind ===
      'policy'
    ) {
      return (
        item.domainName +
        '｜' +
        (
          row.active
            ? this.stageName(
                item.stage
              )
            : '已退出'
        )
      );
    }

    if (
      row.kind ===
      'dialogue'
    ) {
      return (
        item.toneName +
        '｜' +
        item.intentName +
        '｜第' +
        item.day +
        '天'
      );
    }

    if (
      row.kind ===
      'barrage'
    ) {
      return (
        item.sourceName +
        '｜' +
        item.emotionName +
        '｜' +
        item.topicName
      );
    }

    return (
      roleName(
        item.currentRole
      ) +
      '｜' +
      item.age +
      '岁｜' +
      (
        item.gender ===
          'female'
          ? '女'
          : '男'
      )
    );
  }

  itemBody(
    row
  ) {
    const item =
      row.data;

    if (
      row.kind ===
      'event'
    ) {
      return (
        item.subject +
        '：' +
        item.situation
      );
    }

    if (
      row.kind ===
      'policy'
    ) {
      return item.supportive
        ? '扶持/改善型政策，生效后会直接改变经营环境。'
        : '规范/监管型政策，生效后会改变成本与合规压力。';
    }

    if (
      row.kind ===
      'dialogue' ||
      row.kind ===
      'barrage'
    ) {
      return item.text;
    }

    return (
      (
        item.personalityLabels ||
        []
      )
        .slice(
          0,
          4
        )
        .join(
          '、'
        ) ||
      '暂无性格标签'
    );
  }

  renderList(
    ctx,
    h
  ) {
    const rows =
      this.items();

    const pageSize =
      5;

    const pages =
      Math.max(
        1,
        Math.ceil(
          rows.length /
          pageSize
        )
      );

    this.page =
      clamp(
        this.page,
        0,
        pages -
          1
      );

    const visible =
      rows.slice(
        this.page *
          pageSize,
        this.page *
          pageSize +
          pageSize
      );

    if (!visible.length) {
      ui.card(
        ctx,
        18,
        205,
        354,
        120,
        {
          radius:15,
          fill:'#FFFDF8',
          stroke:'#DDD4C7'
        }
      );

      ui.text(
        ctx,
        '这里暂时还没有记录',
        195,
        250,
        11,
        '#6E828E',
        '800',
        'center'
      );

      ui.text(
        ctx,
        '继续推进游戏时间，城市会自行产生变化。',
        195,
        280,
        7.5,
        '#87969D',
        '600',
        'center'
      );

      return;
    }

    let y =
      194;

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
        74,
        {
          radius:13,
          fill:'#FFFDF8',
          stroke:'#DDD4C7',
          shadow:false
        }
      );

      const title =
        this.itemTitle(
          row
        );

      ui.text(
        ctx,
        title.length >
          22
          ? title.slice(
              0,
              21
            ) +
            '…'
          : title,
        28,
        y +
          17,
        8.6,
        '#173D54',
        '800'
      );

      ui.text(
        ctx,
        this.itemMeta(
          row
        ),
        28,
        y +
          38,
        6.8,
        '#748791',
        '600'
      );

      const body =
        this.itemBody(
          row
        );

      ui.text(
        ctx,
        body.length >
          30
          ? body.slice(
              0,
              29
            ) +
            '…'
          : body,
        28,
        y +
          59,
        7.1,
        '#5E737F',
        '600'
      );

      ui.text(
        ctx,
        '›',
        352,
        y +
          37,
        16,
        '#D2A020',
        '800',
        'right'
      );

      this.addButton(
        'item:' +
          (
            this.page *
              pageSize +
            i
          ),
        14,
        y,
        362,
        74
      );

      y +=
        82;
    }

    const pageY =
      Math.min(
        h -
          112,
        614
      );

    opUi.button(
      ctx,
      '上一页',
      84,
      pageY,
      78,
      32
    );

    ui.text(
      ctx,
      (
        this.page +
        1
      ) +
      '/' +
      pages,
      195,
      pageY +
        16,
      7.4,
      '#637B87',
      '700',
      'center'
    );

    opUi.button(
      ctx,
      '下一页',
      228,
      pageY,
      78,
      32
    );

    this.addButton(
      'prev',
      84,
      pageY,
      78,
      32
    );

    this.addButton(
      'next',
      228,
      pageY,
      78,
      32
    );
  }

  renderImpact(
    ctx,
    rows,
    startY
  ) {
    let y =
      startY;

    for (
      const row
      of rows.slice(
        0,
        7
      )
    ) {
      const pct =
        Math.round(
          row.delta *
          1000
        ) /
        10;

      ui.text(
        ctx,
        row.label,
        32,
        y,
        7.4,
        '#718590',
        '600'
      );

      ui.text(
        ctx,
        (
          pct >
          0
            ? '+'
            : ''
        ) +
          pct +
          '%',
        350,
        y,
        7.8,
        pct >
          0
          ? '#C05042'
          : '#278A64',
        '800',
        'right'
      );

      y +=
        24;
    }

    return y;
  }

  renderDetail(
    ctx,
    h
  ) {
    const row =
      this.selected;

    const item =
      row.data;

    opUi.button(
      ctx,
      '返回列表',
      14,
      194,
      82,
      32
    );

    this.addButton(
      'detail:back',
      14,
      194,
      82,
      32
    );

    ui.card(
      ctx,
      14,
      238,
      362,
      Math.min(
        360,
        h -
          350
      ),
      {
        radius:15,
        fill:'#FFFDF8',
        stroke:'#DDD4C7',
        shadow:false
      }
    );

    ui.text(
      ctx,
      this.itemTitle(
        row
      ),
      30,
      260,
      11,
      '#173D54',
      '800'
    );

    ui.text(
      ctx,
      this.itemMeta(
        row
      ),
      30,
      283,
      7.2,
      '#748791',
      '600'
    );

    if (
      row.kind ===
      'event'
    ) {
      ctx.font =
        '600 7.4px sans-serif';

      const lines =
        wrapText(
          ctx,
          item.subject +
            '：' +
            item.situation +
            '。该事件处于“' +
            this.phaseName(
              item.phase
            ) +
            '”阶段。',
          320,
          3
        );

      let y =
        312;

      for (
        const line
        of lines
      ) {
        ui.text(
          ctx,
          line,
          30,
          y,
          7.4,
          '#526A77',
          '600'
        );

        y +=
          18;
      }

      const phase =
        eventPack.EVENT_PHASES.find(
          x =>
            x.id ===
            item.phase
        );

      const impacts =
        modifierRows(
          item.baseModifiers,
          (
            phase
              ? phase.factor
              : 1
          ) *
          Number(
            item.severityFactor ||
            1
          ),
          item.positive
        );

      ui.text(
        ctx,
        '当前实际影响',
        30,
        y +
          8,
        8.2,
        '#173D54',
        '800'
      );

      this.renderImpact(
        ctx,
        impacts,
        y +
          34
      );

      ui.text(
        ctx,
        '持续：第' +
          item.startedDay +
          '天 → 第' +
          item.recoveryEndDay +
          '天',
        30,
        570,
        7.1,
        '#819098',
        '600'
      );
    } else if (
      row.kind ===
      'policy'
    ) {
      ctx.font =
        '600 7.4px sans-serif';

      const text =
        item.supportive
          ? '这是一项经营环境改善/扶持型政策。只有进入“生效”阶段后，数值效果才正式进入经营计算。'
          : '这是一项规范/监管型政策。进入“生效”阶段后，会影响经营成本或合规检查风险。';

      let y =
        312;

      for (
        const line
        of wrapText(
          ctx,
          text,
          320,
          3
        )
      ) {
        ui.text(
          ctx,
          line,
          30,
          y,
          7.4,
          '#526A77',
          '600'
        );

        y +=
          18;
      }

      ui.text(
        ctx,
        '政策时间线',
        30,
        y +
          10,
        8.2,
        '#173D54',
        '800'
      );

      ui.text(
        ctx,
        '酝酿 ' +
          item.proposedDay +
          ' → 公告 ' +
          item.announcedDay +
          ' → 生效 ' +
          item.activeDay +
          ' → 评估 ' +
          item.reviewDay +
          ' → 退出 ' +
          item.expireDay,
        30,
        y +
          35,
        6.8,
        '#667C88',
        '600'
      );

      ui.text(
        ctx,
        '生效后影响',
        30,
        y +
          64,
        8.2,
        '#173D54',
        '800'
      );

      this.renderImpact(
        ctx,
        modifierRows(
          item.modifiers,
          1,
          null
        ),
        y +
          90
      );
    } else if (
      row.kind ===
      'dialogue' ||
      row.kind ===
      'barrage'
    ) {
      ctx.font =
        '600 8px sans-serif';

      let y =
        320;

      for (
        const line
        of wrapText(
          ctx,
          item.text,
          318,
          8
        )
      ) {
        ui.text(
          ctx,
          line,
          30,
          y,
          8,
          '#3F5968',
          '600'
        );

        y +=
          21;
      }

      if (
        row.kind ===
          'dialogue' &&
        dynamicWorld.findNpc(
          item.actorId
        )
      ) {
        opUi.button(
          ctx,
          '查看人物',
          270,
          Math.min(
            h -
              136,
            560
          ),
          92,
          34,
          'gold'
        );

        this.addButton(
          'detail:person:' +
            item.actorId,
          270,
          Math.min(
            h -
              136,
            560
          ),
          92,
          34
        );
      }
    } else {
      const person =
        item;

      const role =
        roleName(
          person.currentRole
        );

      const rows = [
        [
          '身份',
          role
        ],
        [
          '年龄',
          person.age +
            '岁'
        ],
        [
          '情绪',
          Math.round(
            person
              .state
              .mood
          ) +
            '/100'
        ],
        [
          '精力',
          Math.round(
            person
              .state
              .energy
          ) +
            '/100'
        ],
        [
          '压力',
          Math.round(
            person
              .state
              .stress
          ) +
            '/100'
        ],
        [
          '财富',
          opUi.money(
            person.wealth
          )
        ]
      ];

      let y =
        316;

      for (
        const pair
        of rows
      ) {
        ui.text(
          ctx,
          pair[0],
          30,
          y,
          7.4,
          '#718590',
          '600'
        );

        ui.text(
          ctx,
          pair[1],
          350,
          y,
          7.8,
          '#173D54',
          '800',
          'right'
        );

        y +=
          25;
      }

      ui.text(
        ctx,
        '性格',
        30,
        y +
          10,
        8.2,
        '#173D54',
        '800'
      );

      ctx.font =
        '600 7.4px sans-serif';

      const labels =
        (
          person.personalityLabels ||
          []
        )
          .slice(
            0,
            6
          )
          .join(
            '、'
          );

      for (
        const line
        of wrapText(
          ctx,
          labels ||
            '暂无',
          318,
          3
        )
      ) {
        y +=
          24;

        ui.text(
          ctx,
          line,
          30,
          y,
          7.4,
          '#536B78',
          '600'
        );
      }

      ui.text(
        ctx,
        '近期记忆 ' +
          (
            person.memory
              ? person.memory.length
              : 0
          ) +
          ' 条',
        30,
        y +
          32,
        7.4,
        '#8A6F3B',
        '700'
      );
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

    this.renderHeader(
      ctx,
      h
    );

    this.renderTabs(
      ctx
    );

    if (
      this.selected
    ) {
      this.renderDetail(
        ctx,
        h
      );
    } else {
      this.renderList(
        ctx,
        h
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

      this.page =
        0;

      this.selected =
        null;

      dynamicWorld
        .markSeen(
          this.tab
        );

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

    if (
      target.id ===
      'detail:back'
    ) {
      this.selected =
        null;

      return true;
    }

    if (
      target.id.indexOf(
        'detail:person:'
      ) ===
      0
    ) {
      const id =
        target.id.slice(
          'detail:person:'.length
        );

      const person =
        dynamicWorld
          .findNpc(
            id
          );

      if (person) {
        this.tab =
          'people';

        this.selected = {
          kind:'person',
          data:person
        };

        dynamicWorld
          .markSeen(
            'people'
          );

        return true;
      }
    }

    if (
      target.id.indexOf(
        'item:'
      ) ===
      0
    ) {
      const index =
        Number(
          target.id.slice(
            5
          )
        );

      const rows =
        this.items();

      this.selected =
        rows[
          index
        ] ||
        null;

      return !!this.selected;
    }

    return false;
  }
}

module.exports =
  new DynamicWorldScene();
