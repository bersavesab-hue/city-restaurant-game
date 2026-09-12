'use strict';

const assert =
  require('assert');

const path =
  require('path');

const {
  PERSONAS,
  ARCHETYPES
} =
  require('../simulator/data/personas.js');

const {
  DIMENSIONS
} =
  require('../simulator/data/rules.js');

const {
  runLab
} =
  require('../simulator/run100.js');

assert.strictEqual(
  PERSONAS.length,
  100,
  '玩家实验室必须严格包含100个画像'
);

assert.strictEqual(
  ARCHETYPES.length,
  25,
  '应由25类核心玩家×4种变体组成100人'
);

const ids =
  new Set(
    PERSONAS.map(
      item =>
        item.id
    )
  );

assert.strictEqual(
  ids.size,
  100,
  '100个玩家ID必须全部唯一'
);

for (
  const persona of
  PERSONAS
) {
  for (
    const dimension of
    DIMENSIONS
  ) {
    assert.ok(
      Number.isFinite(
        persona
          .sensitivities[
            dimension
          ]
      ),
      persona.id +
        ' 缺少维度 ' +
        dimension
    );
  }
}

const report =
  runLab(
    path.resolve(
      __dirname,
      '..'
    ),
    {
      writeReport:
        false
    }
  );

assert.strictEqual(
  report.meta
    .personaCount,
  100
);

assert.ok(
  report
    .rankedIssues
    .length >
  0,
  '实验室应该能发现至少一个体验问题'
);

assert.ok(
  report
    .rankedIssues
    .some(
      item =>
        item.dimension ===
          'ui' ||
        item.dimension ===
          'typography' ||
        item.dimension ===
          'interaction'
    ),
  '必须覆盖UI/字体/操作问题'
);

assert.ok(
  report
    .rankedIssues
    .some(
      item =>
        item.dimension ===
          'balance' ||
        item.dimension ===
          'economy'
    ),
  '必须覆盖平衡/数值问题'
);

assert.ok(
  report
    .rankedIssues
    .some(
      item =>
        item.dimension ===
          'flow' ||
        item.dimension ===
          'gameplay'
    ),
  '必须覆盖流程/玩法问题'
);

console.log(
  '100-player lab tests passed'
);

console.log(
  'Top issue:',
  report
    .rankedIssues[0]
    .title
);
