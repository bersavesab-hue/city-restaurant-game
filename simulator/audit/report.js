'use strict';

const fs =
  require('fs');

const path =
  require('path');

function pct(value) {
  return (
    Math.round(
      value *
      100
    ) +
    '%'
  );
}

function buildMarkdown(
  report
) {
  const lines = [];

  lines.push(
    '# 100名玩家实验室报告'
  );

  lines.push(
    ''
  );

  lines.push(
    '- 玩家画像：' +
      report.meta
        .personaCount
  );

  lines.push(
    '- 检测问题：' +
      report.issues
        .length
  );

  lines.push(
    '- 极高流失风险玩家：' +
      report
        .personaRisk
        ['极高']
  );

  lines.push(
    '- 高流失风险玩家：' +
      report
        .personaRisk
        ['高']
  );

  lines.push(
    ''
  );

  lines.push(
    '## 当前最值得优先修的问题'
  );

  lines.push(
    ''
  );

  for (
    let i = 0;
    i <
    Math.min(
      20,
      report
        .rankedIssues
        .length
    );
    i++
  ) {
    const issue =
      report
        .rankedIssues[i];

    lines.push(
      (
        i +
        1
      ) +
        '. **[' +
        issue.priority +
        '] ' +
        issue.title +
        '**'
    );

    lines.push(
      '   - 维度：' +
        issue.dimension +
        '；100人中影响 ' +
        issue.affected +
        ' 人（' +
        pct(
          issue
            .affectedRate
        ) +
        '）'
    );

    lines.push(
      '   - ' +
        issue.detail
    );

    lines.push(
      '   - 修复：' +
        issue.remediation
    );
  }

  lines.push(
    ''
  );

  lines.push(
    '## 玩家分层'
  );

  lines.push(
    ''
  );

  const buckets =
    {};

  for (
    const persona of
    report
      .personas
  ) {
    const key =
      persona.label
        .split(
          '·'
        )[0];

    if (
      !buckets[key]
    ) {
      buckets[key] = {
        count:
          0,
        high:
          0
      };
    }

    buckets[key]
      .count +=
      1;

    if (
      persona.churnRisk ===
        '极高' ||
      persona.churnRisk ===
        '高'
    ) {
      buckets[key]
        .high +=
        1;
    }
  }

  for (
    const [
      key,
      value
    ] of
    Object.entries(
      buckets
    )
  ) {
    lines.push(
      '- ' +
        key +
        '：' +
        value.count +
        '人；高风险 ' +
        value.high +
        '人'
    );
  }

  lines.push(
    ''
  );

  lines.push(
    '## 说明'
  );

  lines.push(
    ''
  );

  lines.push(
    '这100人不是“100个随机点击机器人”，而是覆盖抖音碎片化用户、TapTap核心玩家、数值党、装修党、零氪/付费、低端机、小屏单手、大字体需求、长线经营、漏洞猎人等真实需求差异的玩家画像。'
  );

  return lines.join(
    '\n'
  );
}

function writeReport(
  root,
  report
) {
  const dir =
    path.join(
      root,
      'simulator/reports'
    );

  fs.mkdirSync(
    dir,
    {
      recursive:
        true
    }
  );

  fs.writeFileSync(
    path.join(
      dir,
      'latest.json'
    ),
    JSON.stringify(
      report,
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(
      dir,
      'latest.md'
    ),
    buildMarkdown(
      report
    )
  );
}

module.exports = {
  buildMarkdown,
  writeReport
};
