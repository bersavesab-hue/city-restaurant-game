'use strict';

const fs =
  require('fs');

const path =
  require('path');

function makeIssue(
  id,
  priority,
  dimension,
  title,
  detail,
  evidence,
  remediation
) {
  return {
    id,
    priority,
    dimension,
    title,
    detail,
    evidence,
    remediation
  };
}

function read(
  root,
  relative
) {
  const file =
    path.join(
      root,
      relative
    );

  return fs.existsSync(
    file
  )
    ? fs.readFileSync(
        file,
        'utf8'
      )
    : '';
}

function runFlowProbe(
  root
) {
  const issues = [];

  const store =
    read(
      root,
      'src/scenes/storeScene.js'
    );

  const renovation =
    read(
      root,
      'src/scenes/renovationScene.js'
    );

  const main =
    read(
      root,
      'src/main.js'
    );

  const supply =
    read(
      root,
      'src/scenes/supplyScene.js'
    );

  const research =
    read(
      root,
      'src/scenes/researchScene.js'
    );

  if (
    /将在下一阶段接入/
      .test(
        store
      )
  ) {
    issues.push(
      makeIssue(
        'FLOW_CORE_LOOP_BREAK',
        'P0',
        'flow',
        '开店核心闭环尚未打通',
        '门店页仍把设备、证照或招聘作为占位模块。玩家签约和装修后无法完整走到营业经营。',
        {
          file:
            'src/scenes/storeScene.js'
        },
        '先完成开业闭环，再继续扩玩法。对经营游戏来说“能完整开第一家店”应是第一可玩里程碑。'
      )
    );
  }

  if (
    !/trial|试营业|open|开业/
      .test(
        main +
        store +
        renovation
      )
  ) {
    issues.push(
      makeIssue(
        'FLOW_NO_OPENING_PAYOFF',
        'P1',
        'feedback',
        '缺少明确的试营业/开业回报节点',
        '长流程投入后需要明显的开业仪式、首日客流和经营结果反馈，否则前期筹备容易显得“只是在填表”。',
        {
          scan:
            '未发现完整试营业/开业流程'
        },
        '加入首日经营、排队/翻台、营业额、顾客评价和开业事件，形成强反馈。'
      )
    );
  }

  if (
    supply.length <
      2500 ||
    research.length <
      2500
  ) {
    issues.push(
      makeIssue(
        'GAMEPLAY_SIDE_SYSTEM_SHALLOW',
        'P2',
        'gameplay',
        '菜品/供应链等侧系统深度不足',
        '底部导航已经承诺多个经营系统，但部分页面内容量较少，玩家会感到“按钮很多、真正能玩的少”。',
        {
          supplySourceBytes:
            supply.length,
          researchSourceBytes:
            research.length
        },
        '每个底部一级入口至少提供一个能独立形成决策循环的玩法，而不是展示页。'
      )
    );
  }

  return {
    issues
  };
}

module.exports = {
  runFlowProbe
};
