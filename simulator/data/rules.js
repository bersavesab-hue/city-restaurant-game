'use strict';

const ISSUE_WEIGHTS = {
  P0: 5,
  P1: 4,
  P2: 3,
  P3: 2,
  P4: 1
};

const DIMENSIONS = [
  'ui',
  'typography',
  'interaction',
  'flow',
  'onboarding',
  'gameplay',
  'balance',
  'economy',
  'ads',
  'performance',
  'stability',
  'accessibility',
  'content',
  'replayability',
  'customization',
  'feedback'
];

const EVIDENCE_BASIS = [
  {
    source: 'TapTap玩家评论',
    themes: [
      '字体和按钮过小',
      '新手引导过长或讲不清',
      '玩法复杂但规则说明不足',
      '广告频率高、强制广告、退出困难',
      '数值和平衡异常',
      '资源获取与日常肝度',
      '运行稳定性与卡顿',
      '画面/UI美观度'
    ]
  },
  {
    source: '抖音小游戏官方规范',
    themes: [
      '广告必须可预期且不可诱导误触',
      '按钮生效区域应覆盖整个按钮',
      '重要功能应能返回首页',
      '启动和场景加载影响用户流失',
      '低端设备性能体验需要关注'
    ]
  },
  {
    source: '经营/模拟类通用玩家需求',
    themes: [
      '清晰的因果反馈',
      '可恢复的失败',
      '多个有效经营策略',
      '长期目标与短期回报并存',
      '避免唯一最优解',
      '装修自由度与经营数值真实联动',
      '存档、重开、长期经营可靠'
    ]
  }
];

module.exports = {
  ISSUE_WEIGHTS,
  DIMENSIONS,
  EVIDENCE_BASIS
};
