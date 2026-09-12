'use strict';

const ARCHETYPES = [
  {
    key: 'douyin_flash',
    label: '抖音3分钟新客',
    platform: 'douyin',
    sessionMinutes: 4,
    skill: 0.25,
    spend: 'zero',
    device: 'mid_android',
    sensitivities: {
      onboarding: 1.00, ui: 0.90, typography: 0.86, interaction: 0.95,
      flow: 0.98, gameplay: 0.82, balance: 0.60, economy: 0.55,
      ads: 0.95, performance: 0.95, stability: 0.95, accessibility: 0.62,
      content: 0.58, replayability: 0.52, customization: 0.35, feedback: 0.95
    }
  },
  {
    key: 'douyin_ad_sensitive',
    label: '抖音广告敏感玩家',
    platform: 'douyin',
    sessionMinutes: 8,
    skill: 0.35,
    spend: 'zero',
    device: 'mid_android',
    sensitivities: {
      onboarding: 0.80, ui: 0.78, typography: 0.76, interaction: 0.90,
      flow: 0.86, gameplay: 0.75, balance: 0.66, economy: 0.62,
      ads: 1.00, performance: 0.88, stability: 0.90, accessibility: 0.60,
      content: 0.60, replayability: 0.55, customization: 0.40, feedback: 0.90
    }
  },
  {
    key: 'douyin_commute',
    label: '碎片化通勤玩家',
    platform: 'douyin',
    sessionMinutes: 10,
    skill: 0.42,
    spend: 'light',
    device: 'small_android',
    sensitivities: {
      onboarding: 0.84, ui: 0.90, typography: 0.92, interaction: 0.95,
      flow: 0.90, gameplay: 0.72, balance: 0.66, economy: 0.62,
      ads: 0.86, performance: 0.90, stability: 0.92, accessibility: 0.72,
      content: 0.58, replayability: 0.62, customization: 0.38, feedback: 0.88
    }
  },
  {
    key: 'douyin_returner',
    label: '抖音回流玩家',
    platform: 'douyin',
    sessionMinutes: 15,
    skill: 0.55,
    spend: 'light',
    device: 'mid_android',
    sensitivities: {
      onboarding: 0.55, ui: 0.74, typography: 0.72, interaction: 0.82,
      flow: 0.86, gameplay: 0.78, balance: 0.74, economy: 0.70,
      ads: 0.78, performance: 0.80, stability: 0.88, accessibility: 0.55,
      content: 0.76, replayability: 0.86, customization: 0.55, feedback: 0.80
    }
  },
  {
    key: 'taptap_core_sim',
    label: 'TapTap经营模拟核心玩家',
    platform: 'taptap',
    sessionMinutes: 55,
    skill: 0.82,
    spend: 'light',
    device: 'high_android',
    sensitivities: {
      onboarding: 0.72, ui: 0.88, typography: 0.80, interaction: 0.82,
      flow: 0.86, gameplay: 1.00, balance: 0.96, economy: 1.00,
      ads: 0.92, performance: 0.72, stability: 0.90, accessibility: 0.48,
      content: 0.95, replayability: 0.94, customization: 0.82, feedback: 0.80
    }
  },
  {
    key: 'taptap_visual',
    label: 'TapTap画面与UI党',
    platform: 'taptap',
    sessionMinutes: 35,
    skill: 0.58,
    spend: 'light',
    device: 'high_android',
    sensitivities: {
      onboarding: 0.62, ui: 1.00, typography: 0.98, interaction: 0.90,
      flow: 0.82, gameplay: 0.72, balance: 0.66, economy: 0.56,
      ads: 0.90, performance: 0.76, stability: 0.84, accessibility: 0.70,
      content: 0.76, replayability: 0.68, customization: 0.94, feedback: 0.88
    }
  },
  {
    key: 'taptap_numbers',
    label: 'TapTap数值硬核玩家',
    platform: 'taptap',
    sessionMinutes: 80,
    skill: 0.95,
    spend: 'zero',
    device: 'high_android',
    sensitivities: {
      onboarding: 0.52, ui: 0.64, typography: 0.70, interaction: 0.70,
      flow: 0.76, gameplay: 0.96, balance: 1.00, economy: 1.00,
      ads: 0.88, performance: 0.65, stability: 0.90, accessibility: 0.42,
      content: 0.90, replayability: 0.96, customization: 0.62, feedback: 0.76
    }
  },
  {
    key: 'taptap_casual',
    label: 'TapTap养老休闲玩家',
    platform: 'taptap',
    sessionMinutes: 30,
    skill: 0.48,
    spend: 'zero',
    device: 'mid_android',
    sensitivities: {
      onboarding: 0.82, ui: 0.86, typography: 0.86, interaction: 0.84,
      flow: 0.82, gameplay: 0.74, balance: 0.76, economy: 0.72,
      ads: 0.94, performance: 0.76, stability: 0.90, accessibility: 0.70,
      content: 0.82, replayability: 0.78, customization: 0.75, feedback: 0.82
    }
  },
  {
    key: 'zero_spender',
    label: '零氪长期玩家',
    platform: 'cross',
    sessionMinutes: 45,
    skill: 0.72,
    spend: 'zero',
    device: 'mid_android',
    sensitivities: {
      onboarding: 0.62, ui: 0.70, typography: 0.72, interaction: 0.74,
      flow: 0.80, gameplay: 0.90, balance: 0.95, economy: 0.96,
      ads: 0.96, performance: 0.72, stability: 0.90, accessibility: 0.52,
      content: 0.90, replayability: 0.94, customization: 0.72, feedback: 0.76
    }
  },
  {
    key: 'light_spender',
    label: '轻氪效率玩家',
    platform: 'cross',
    sessionMinutes: 38,
    skill: 0.76,
    spend: 'light',
    device: 'high_android',
    sensitivities: {
      onboarding: 0.58, ui: 0.74, typography: 0.70, interaction: 0.80,
      flow: 0.88, gameplay: 0.88, balance: 0.90, economy: 0.90,
      ads: 0.78, performance: 0.76, stability: 0.90, accessibility: 0.44,
      content: 0.86, replayability: 0.90, customization: 0.66, feedback: 0.82
    }
  },
  {
    key: 'efficiency_whale',
    label: '付费效率型玩家',
    platform: 'cross',
    sessionMinutes: 50,
    skill: 0.80,
    spend: 'heavy',
    device: 'high_android',
    sensitivities: {
      onboarding: 0.48, ui: 0.78, typography: 0.72, interaction: 0.86,
      flow: 0.95, gameplay: 0.90, balance: 0.86, economy: 0.82,
      ads: 0.92, performance: 0.82, stability: 0.94, accessibility: 0.40,
      content: 0.92, replayability: 0.92, customization: 0.78, feedback: 0.88
    }
  },
  {
    key: 'decorator',
    label: '装修审美党',
    platform: 'cross',
    sessionMinutes: 60,
    skill: 0.60,
    spend: 'light',
    device: 'high_android',
    sensitivities: {
      onboarding: 0.58, ui: 1.00, typography: 0.90, interaction: 0.90,
      flow: 0.80, gameplay: 0.74, balance: 0.62, economy: 0.64,
      ads: 0.86, performance: 0.72, stability: 0.82, accessibility: 0.58,
      content: 0.88, replayability: 0.78, customization: 1.00, feedback: 0.92
    }
  },
  {
    key: 'sandbox_builder',
    label: '沙盒自由建造党',
    platform: 'cross',
    sessionMinutes: 90,
    skill: 0.78,
    spend: 'zero',
    device: 'tablet',
    sensitivities: {
      onboarding: 0.50, ui: 0.80, typography: 0.72, interaction: 0.88,
      flow: 0.74, gameplay: 0.94, balance: 0.78, economy: 0.84,
      ads: 0.94, performance: 0.66, stability: 0.86, accessibility: 0.48,
      content: 0.90, replayability: 0.96, customization: 1.00, feedback: 0.84
    }
  },
  {
    key: 'restaurant_depth',
    label: '餐饮经营深度党',
    platform: 'cross',
    sessionMinutes: 100,
    skill: 0.88,
    spend: 'light',
    device: 'tablet',
    sensitivities: {
      onboarding: 0.56, ui: 0.74, typography: 0.72, interaction: 0.80,
      flow: 0.80, gameplay: 1.00, balance: 0.96, economy: 1.00,
      ads: 0.92, performance: 0.65, stability: 0.88, accessibility: 0.44,
      content: 1.00, replayability: 0.98, customization: 0.90, feedback: 0.82
    }
  },
  {
    key: 'absolute_novice',
    label: '完全新手游盲',
    platform: 'cross',
    sessionMinutes: 12,
    skill: 0.10,
    spend: 'zero',
    device: 'mid_android',
    sensitivities: {
      onboarding: 1.00, ui: 0.96, typography: 0.94, interaction: 1.00,
      flow: 1.00, gameplay: 0.80, balance: 0.58, economy: 0.56,
      ads: 0.90, performance: 0.84, stability: 0.94, accessibility: 0.86,
      content: 0.54, replayability: 0.48, customization: 0.45, feedback: 1.00
    }
  },
  {
    key: 'older_font',
    label: '大字体需求玩家',
    platform: 'cross',
    sessionMinutes: 25,
    skill: 0.40,
    spend: 'light',
    device: 'mid_android',
    sensitivities: {
      onboarding: 0.86, ui: 0.96, typography: 1.00, interaction: 0.96,
      flow: 0.88, gameplay: 0.72, balance: 0.62, economy: 0.62,
      ads: 0.86, performance: 0.80, stability: 0.92, accessibility: 1.00,
      content: 0.62, replayability: 0.62, customization: 0.58, feedback: 0.92
    }
  },
  {
    key: 'one_hand_small',
    label: '小屏单手玩家',
    platform: 'douyin',
    sessionMinutes: 9,
    skill: 0.46,
    spend: 'zero',
    device: 'small_android',
    sensitivities: {
      onboarding: 0.76, ui: 0.98, typography: 0.96, interaction: 1.00,
      flow: 0.92, gameplay: 0.72, balance: 0.60, economy: 0.58,
      ads: 0.94, performance: 0.92, stability: 0.94, accessibility: 0.88,
      content: 0.54, replayability: 0.56, customization: 0.42, feedback: 0.94
    }
  },
  {
    key: 'low_end_device',
    label: '低端机玩家',
    platform: 'douyin',
    sessionMinutes: 14,
    skill: 0.50,
    spend: 'zero',
    device: 'low_android',
    sensitivities: {
      onboarding: 0.68, ui: 0.72, typography: 0.76, interaction: 0.86,
      flow: 0.82, gameplay: 0.70, balance: 0.62, economy: 0.60,
      ads: 0.88, performance: 1.00, stability: 1.00, accessibility: 0.68,
      content: 0.58, replayability: 0.60, customization: 0.40, feedback: 0.84
    }
  },
  {
    key: 'high_end_visual',
    label: '高端机视觉玩家',
    platform: 'cross',
    sessionMinutes: 40,
    skill: 0.65,
    spend: 'light',
    device: 'high_android',
    sensitivities: {
      onboarding: 0.56, ui: 1.00, typography: 0.88, interaction: 0.90,
      flow: 0.84, gameplay: 0.82, balance: 0.70, economy: 0.62,
      ads: 0.90, performance: 0.76, stability: 0.86, accessibility: 0.52,
      content: 0.84, replayability: 0.78, customization: 0.88, feedback: 0.90
    }
  },
  {
    key: 'tablet_strategy',
    label: '平板经营策略玩家',
    platform: 'taptap',
    sessionMinutes: 85,
    skill: 0.90,
    spend: 'light',
    device: 'tablet',
    sensitivities: {
      onboarding: 0.52, ui: 0.82, typography: 0.72, interaction: 0.84,
      flow: 0.80, gameplay: 1.00, balance: 0.98, economy: 1.00,
      ads: 0.92, performance: 0.62, stability: 0.88, accessibility: 0.46,
      content: 0.96, replayability: 0.98, customization: 0.92, feedback: 0.82
    }
  },
  {
    key: 'restart_tester',
    label: '反复重开试错玩家',
    platform: 'cross',
    sessionMinutes: 35,
    skill: 0.78,
    spend: 'zero',
    device: 'mid_android',
    sensitivities: {
      onboarding: 0.62, ui: 0.70, typography: 0.68, interaction: 0.86,
      flow: 0.92, gameplay: 0.90, balance: 0.92, economy: 0.94,
      ads: 0.88, performance: 0.72, stability: 1.00, accessibility: 0.44,
      content: 0.82, replayability: 0.94, customization: 0.68, feedback: 0.86
    }
  },
  {
    key: 'collector',
    label: '收集成就党',
    platform: 'cross',
    sessionMinutes: 50,
    skill: 0.68,
    spend: 'light',
    device: 'mid_android',
    sensitivities: {
      onboarding: 0.58, ui: 0.76, typography: 0.70, interaction: 0.76,
      flow: 0.80, gameplay: 0.84, balance: 0.82, economy: 0.74,
      ads: 0.86, performance: 0.68, stability: 0.86, accessibility: 0.46,
      content: 0.98, replayability: 0.96, customization: 0.84, feedback: 0.86
    }
  },
  {
    key: 'speedrunner',
    label: '速通效率玩家',
    platform: 'cross',
    sessionMinutes: 30,
    skill: 0.92,
    spend: 'zero',
    device: 'high_android',
    sensitivities: {
      onboarding: 0.30, ui: 0.66, typography: 0.64, interaction: 0.92,
      flow: 1.00, gameplay: 0.92, balance: 0.94, economy: 0.90,
      ads: 0.98, performance: 0.88, stability: 0.94, accessibility: 0.36,
      content: 0.76, replayability: 0.86, customization: 0.42, feedback: 0.88
    }
  },
  {
    key: 'exploit_hunter',
    label: '数值套利/漏洞猎人',
    platform: 'taptap',
    sessionMinutes: 120,
    skill: 1.00,
    spend: 'zero',
    device: 'high_android',
    sensitivities: {
      onboarding: 0.22, ui: 0.50, typography: 0.56, interaction: 0.70,
      flow: 0.78, gameplay: 0.98, balance: 1.00, economy: 1.00,
      ads: 0.94, performance: 0.60, stability: 1.00, accessibility: 0.30,
      content: 0.88, replayability: 0.98, customization: 0.58, feedback: 0.72
    }
  },
  {
    key: 'long_term_tycoon',
    label: '长线连锁经营玩家',
    platform: 'cross',
    sessionMinutes: 120,
    skill: 0.88,
    spend: 'light',
    device: 'tablet',
    sensitivities: {
      onboarding: 0.42, ui: 0.72, typography: 0.68, interaction: 0.78,
      flow: 0.84, gameplay: 1.00, balance: 0.98, economy: 1.00,
      ads: 0.90, performance: 0.64, stability: 0.94, accessibility: 0.40,
      content: 1.00, replayability: 1.00, customization: 0.90, feedback: 0.80
    }
  }
];

const VARIANTS = [
  {
    suffix: 'A',
    patienceDelta: -0.12,
    sensitivityScale: 1.07,
    deviceOverride: null
  },
  {
    suffix: 'B',
    patienceDelta: 0.00,
    sensitivityScale: 1.00,
    deviceOverride: null
  },
  {
    suffix: 'C',
    patienceDelta: 0.12,
    sensitivityScale: 0.96,
    deviceOverride: 'small_android'
  },
  {
    suffix: 'D',
    patienceDelta: 0.06,
    sensitivityScale: 1.03,
    deviceOverride: 'low_android'
  }
];

const NICKNAMES = [
  '小夏','阿诚','柚子','老周','米粒','阿岚','北北','青禾','小林','大海',
  '七七','木木','阿哲','麦子','晓南','阿婧','石头','沐风','思思','川川',
  '可乐','小顾','阿坤','明月','小贺','安安','老陈','晓晓','阿文','乐乐',
  '小唐','子墨','阿霖','小宋','阿远','然然','大白','小季','浅浅','阿川',
  '鹿鹿','小夏2','阿策','洛洛','小韩','小郑','南风','小谢','果果','阿墨',
  '小许','小乔','阿宇','然子','琪琪','老高','小温','阿峰','小雨','阿睿',
  '阿洛','小武','苗苗','阿成','小曹','团子','小叶','阿豪','小杜','小鱼',
  '晨晨','阿彬','小秦','橙子','老胡','小冯','阿宁','小苏','小邹','小彤',
  '阿凯','小赵','小马','安子','阿杰','小何','小伍','阿新','小吴','小梁',
  '阿东','小姜','阿白','小段','小潘','阿许','小袁','阿罗','小施','阿钟'
];

function clamp(value) {
  return Math.max(
    0,
    Math.min(
      1,
      value
    )
  );
}

function buildPersonas() {
  const personas = [];
  let index = 0;

  for (
    const archetype of
    ARCHETYPES
  ) {
    for (
      const variant of
      VARIANTS
    ) {
      const sensitivities = {};

      for (
        const [
          key,
          value
        ] of
        Object.entries(
          archetype
            .sensitivities
        )
      ) {
        sensitivities[key] =
          clamp(
            value *
            variant
              .sensitivityScale
          );
      }

      personas.push({
        id:
          'P' +
          String(
            index + 1
          ).padStart(
            3,
            '0'
          ),

        nickname:
          NICKNAMES[
            index
          ],

        archetype:
          archetype.key,

        label:
          archetype.label +
          '·' +
          variant.suffix,

        platform:
          archetype
            .platform,

        sessionMinutes:
          Math.max(
            3,
            Math.round(
              archetype
                .sessionMinutes *
              (
                1 +
                variant
                  .patienceDelta
              )
            )
          ),

        skill:
          clamp(
            archetype.skill +
            variant
              .patienceDelta *
              0.25
          ),

        spend:
          archetype.spend,

        device:
          variant
            .deviceOverride ||
          archetype.device,

        patience:
          clamp(
            0.55 +
            variant
              .patienceDelta
          ),

        sensitivities
      });

      index += 1;
    }
  }

  return personas;
}

const PERSONAS =
  buildPersonas();

if (
  PERSONAS.length !==
  100
) {
  throw new Error(
    '玩家画像数量必须严格为100，当前为' +
      PERSONAS.length
  );
}

module.exports = {
  ARCHETYPES,
  PERSONAS
};
