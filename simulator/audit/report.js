'use strict';

const fs =
  require('fs');

const path =
  require('path');

function ensureDir(dir) {
  fs.mkdirSync(
    dir,
    {
      recursive: true
    }
  );
}

function pct(value) {
  return (
    Math.round(
      Number(value) *
      100
    ) +
    '%'
  );
}

function esc(value) {
  return String(
    value == null
      ? ''
      : value
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#39;'
    );
}

function csvCell(value) {
  const text =
    String(
      value == null
        ? ''
        : value
    );

  return (
    '"' +
    text.replace(
      /"/g,
      '""'
    ) +
    '"'
  );
}

function groupCount(
  personas,
  key
) {
  const result = {};

  for (
    const item of
    personas
  ) {
    const value =
      item[key] ||
      'unknown';

    if (
      !result[value]
    ) {
      result[value] = {
        total: 0,
        extreme: 0,
        high: 0,
        medium: 0,
        low: 0
      };
    }

    result[value].total +=
      1;

    if (
      item.churnRisk ===
      '极高'
    ) {
      result[value].extreme +=
        1;
    } else if (
      item.churnRisk ===
      '高'
    ) {
      result[value].high +=
        1;
    } else if (
      item.churnRisk ===
      '中'
    ) {
      result[value].medium +=
        1;
    } else {
      result[value].low +=
        1;
    }
  }

  return result;
}

function dimensionSummary(
  rankedIssues
) {
  const result = {};

  for (
    const issue of
    rankedIssues
  ) {
    if (
      !result[
        issue.dimension
      ]
    ) {
      result[
        issue.dimension
      ] = {
        issueCount:
          0,
        affectedTotal:
          0,
        highConcern:
          0,
        maxPriority:
          issue.priority
      };
    }

    const item =
      result[
        issue.dimension
      ];

    item.issueCount +=
      1;

    item.affectedTotal +=
      issue.affected;

    item.highConcern +=
      issue.highConcern;

    if (
      issue.priority <
      item.maxPriority
    ) {
      item.maxPriority =
        issue.priority;
    }
  }

  return result;
}

function buildSummary(
  report
) {
  return {
    generatedAt:
      report.meta
        .generatedAt,

    personaCount:
      report.meta
        .personaCount,

    issueCount:
      report.meta
        .issueCount,

    personaRisk:
      report.personaRisk,

    topIssues:
      report
        .rankedIssues
        .slice(
          0,
          10
        )
        .map(
          issue => ({
            id:
              issue.id,
            priority:
              issue.priority,
            dimension:
              issue.dimension,
            title:
              issue.title,
            affected:
              issue.affected,
            affectedRate:
              issue.affectedRate,
            highConcern:
              issue.highConcern,
            averageScore:
              issue.averageScore,
            remediation:
              issue.remediation
          })
        ),

    dimensions:
      dimensionSummary(
        report
          .rankedIssues
      ),

    platforms:
      groupCount(
        report.personas,
        'platform'
      ),

    devices:
      groupCount(
        report.personas,
        'device'
      )
  };
}

function buildMarkdown(
  report
) {
  const summary =
    buildSummary(
      report
    );

  const lines = [];

  lines.push(
    '# 100名玩家实验室完整报告'
  );

  lines.push(
    ''
  );

  lines.push(
    '> 这是100个“模拟玩家画像”的自动体验审计，不是真实100名用户的问卷数据。画像覆盖抖音碎片化玩家、TapTap核心玩家、数值党、装修党、零氪、轻氪、低端机、小屏、长线经营等不同需求。'
  );

  lines.push(
    ''
  );

  lines.push(
    '## 总览'
  );

  lines.push(
    ''
  );

  lines.push(
    '- 玩家画像：' +
      summary.personaCount
  );

  lines.push(
    '- 发现问题：' +
      summary.issueCount
  );

  lines.push(
    '- 极高流失风险：' +
      summary
        .personaRisk
        ['极高']
  );

  lines.push(
    '- 高流失风险：' +
      summary
        .personaRisk
        ['高']
  );

  lines.push(
    '- 中流失风险：' +
      summary
        .personaRisk
        ['中']
  );

  lines.push(
    '- 低流失风险：' +
      summary
        .personaRisk
        ['低']
  );

  lines.push(
    ''
  );

  lines.push(
    '## TOP 20 问题'
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
        '] [' +
        issue.dimension +
        '] ' +
        issue.title +
        '**'
    );

    lines.push(
      '   - 影响：' +
        issue.affected +
        '/100（' +
        pct(
          issue
            .affectedRate
        ) +
        '），其中高关注 ' +
        issue.highConcern +
        ' 人'
    );

    lines.push(
      '   - 问题：' +
        issue.detail
    );

    lines.push(
      '   - 建议：' +
        issue.remediation
    );

    if (
      issue.examples &&
      issue.examples.length
    ) {
      lines.push(
        '   - 典型玩家：' +
          issue.examples
            .map(
              item =>
                item.personaId +
                ' ' +
                item.label +
                '（' +
                item.score +
                '）'
            )
            .join(
              '、'
            )
      );
    }
  }

  lines.push(
    ''
  );

  lines.push(
    '## 平台分层'
  );

  lines.push(
    ''
  );

  for (
    const [
      name,
      value
    ] of
    Object.entries(
      summary.platforms
    )
  ) {
    lines.push(
      '- ' +
        name +
        '：' +
        value.total +
        '人；极高风险 ' +
        value.extreme +
        '；高风险 ' +
        value.high
    );
  }

  lines.push(
    ''
  );

  lines.push(
    '## 设备分层'
  );

  lines.push(
    ''
  );

  for (
    const [
      name,
      value
    ] of
    Object.entries(
      summary.devices
    )
  ) {
    lines.push(
      '- ' +
        name +
        '：' +
        value.total +
        '人；极高风险 ' +
        value.extreme +
        '；高风险 ' +
        value.high
    );
  }

  lines.push(
    ''
  );

  lines.push(
    '## 100名玩家逐人反馈'
  );

  lines.push(
    ''
  );

  for (
    const persona of
    report.personas
  ) {
    lines.push(
      '### ' +
        persona.personaId +
        ' · ' +
        persona.nickname +
        ' · ' +
        persona.label
    );

    lines.push(
      ''
    );

    lines.push(
      '- 平台：' +
        persona.platform +
        '；设备：' +
        persona.device +
        '；流失风险：' +
        persona.churnRisk
    );

    if (
      persona.complaints
        .length
    ) {
      lines.push(
        '- 主要意见：' +
          persona.complaints
            .slice(
              0,
              6
            )
            .map(
              item =>
                '[' +
                item.dimension +
                '] ' +
                item.title +
                '（' +
                item.score +
                '）'
            )
            .join(
              '；'
            )
      );
    } else {
      lines.push(
        '- 主要意见：暂无高强度投诉'
      );
    }

    lines.push(
      ''
    );
  }

  return lines.join(
    '\n'
  );
}

function buildGithubSummary(
  report
) {
  const summary =
    buildSummary(
      report
    );

  const lines = [];

  lines.push(
    '# 🎮 100名玩家实验室'
  );

  lines.push(
    ''
  );

  lines.push(
    '| 指标 | 结果 |'
  );

  lines.push(
    '| --- | ---: |'
  );

  lines.push(
    '| 模拟玩家画像 | ' +
      summary.personaCount +
      ' |'
  );

  lines.push(
    '| 检测问题 | ' +
      summary.issueCount +
      ' |'
  );

  lines.push(
    '| 极高流失风险 | ' +
      summary
        .personaRisk
        ['极高'] +
      ' |'
  );

  lines.push(
    '| 高流失风险 | ' +
      summary
        .personaRisk
        ['高'] +
      ' |'
  );

  lines.push(
    ''
  );

  lines.push(
    '## 当前最优先修复'
  );

  lines.push(
    ''
  );

  for (
    let i = 0;
    i <
    Math.min(
      10,
      summary
        .topIssues
        .length
    );
    i++
  ) {
    const item =
      summary
        .topIssues[i];

    lines.push(
      (
        i +
        1
      ) +
        '. **[' +
        item.priority +
        '] ' +
        item.title +
        '** — 影响 ' +
        item.affected +
        '/100'
    );
  }

  lines.push(
    ''
  );

  lines.push(
    '> 完整HTML、Markdown、100人逐人反馈、问题CSV均在本次 Actions 的 `100-player-lab-report` Artifact 中。'
  );

  return lines.join(
    '\n'
  );
}

function buildHtml(
  report
) {
  const summary =
    buildSummary(
      report
    );

  const issueRows =
    report
      .rankedIssues
      .map(
        (
          issue,
          index
        ) =>
          '<tr>' +
          '<td>' +
          (
            index +
            1
          ) +
          '</td>' +
          '<td><span class="prio ' +
          esc(
            issue.priority
          ) +
          '">' +
          esc(
            issue.priority
          ) +
          '</span></td>' +
          '<td>' +
          esc(
            issue.dimension
          ) +
          '</td>' +
          '<td><b>' +
          esc(
            issue.title
          ) +
          '</b><div class="sub">' +
          esc(
            issue.detail
          ) +
          '</div></td>' +
          '<td>' +
          issue.affected +
          '/100<br><span class="sub">' +
          esc(
            pct(
              issue.affectedRate
            )
          ) +
          '</span></td>' +
          '<td>' +
          issue.highConcern +
          '</td>' +
          '<td>' +
          esc(
            issue.remediation
          ) +
          '</td>' +
          '</tr>'
      )
      .join(
        ''
      );

  const playerCards =
    report.personas
      .map(
        persona => {
          const complaints =
            persona.complaints
              .slice(
                0,
                5
              )
              .map(
                item =>
                  '<li><b>' +
                  esc(
                    item.title
                  ) +
                  '</b> <span class="score">' +
                  item.score +
                  '</span><span class="sub"> · ' +
                  esc(
                    item.dimension
                  ) +
                  '</span></li>'
              )
              .join(
                ''
              );

          return (
            '<article class="player">' +
            '<div class="player-head">' +
            '<b>' +
            esc(
              persona.personaId
            ) +
            ' · ' +
            esc(
              persona.nickname
            ) +
            '</b>' +
            '<span class="risk risk-' +
            esc(
              persona.churnRisk
            ) +
            '">' +
            esc(
              persona.churnRisk
            ) +
            '</span>' +
            '</div>' +
            '<div class="sub">' +
            esc(
              persona.label
            ) +
            ' · ' +
            esc(
              persona.platform
            ) +
            ' · ' +
            esc(
              persona.device
            ) +
            '</div>' +
            '<ul>' +
            (
              complaints ||
              '<li>暂无高强度投诉</li>'
            ) +
            '</ul>' +
            '</article>'
          );
        }
      )
      .join(
        ''
      );

  return (
    '<!doctype html>' +
    '<html lang="zh-CN">' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>100名玩家实验室</title>' +
    '<style>' +
    ':root{color-scheme:light;--bg:#f5f1e8;--card:#fffdf8;--ink:#193347;--muted:#6e7b82;--line:#ded3c5;--p0:#b42318;--p1:#d65f00;--p2:#b58a00;--p3:#2374a6;}' +
    '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;line-height:1.55}' +
    'main{max-width:1180px;margin:auto;padding:18px}.hero{background:linear-gradient(135deg,#08344c,#0e6078);color:white;border-radius:18px;padding:22px;margin-bottom:16px}.hero h1{margin:0 0 6px;font-size:28px}.hero p{margin:0;opacity:.85}' +
    '.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.stat,.panel,.player{background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:0 4px 14px rgba(28,39,48,.06)}.stat{padding:14px}.stat b{font-size:25px;display:block}.stat span,.sub{font-size:13px;color:var(--muted)}' +
    '.panel{padding:14px;margin:14px 0;overflow:auto}.panel h2{margin:0 0 10px;font-size:19px}table{width:100%;border-collapse:collapse;min-width:860px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #eee4d7;padding:10px 8px;font-size:13px}th{position:sticky;top:0;background:#fff8ed}' +
    '.prio{font-weight:800;padding:3px 7px;border-radius:8px;color:white}.P0{background:var(--p0)}.P1{background:var(--p1)}.P2{background:var(--p2)}.P3{background:var(--p3)}.P4{background:#6b7280}' +
    '.players{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.player{padding:12px}.player-head{display:flex;justify-content:space-between;gap:10px}.player ul{margin:8px 0 0;padding-left:20px;font-size:13px}.risk{padding:2px 8px;border-radius:10px;font-size:12px;font-weight:800}.risk-极高{background:#fee4e2;color:#b42318}.risk-高{background:#ffead5;color:#b54708}.risk-中{background:#fff3c4;color:#946200}.risk-低{background:#dcfae6;color:#067647}.score{font-weight:800;color:#b54708}' +
    '.note{font-size:13px;color:var(--muted);margin:8px 0 0}@media(max-width:760px){main{padding:10px}.stats{grid-template-columns:repeat(2,1fr)}.players{grid-template-columns:1fr}.hero h1{font-size:22px}.stat b{font-size:20px}}' +
    '</style>' +
    '</head>' +
    '<body><main>' +
    '<section class="hero"><h1>100名玩家实验室</h1><p>模拟100种真实玩家需求差异，对 UI、字体、操作、流程、玩法、平衡、数值、广告、性能、长期耐玩等进行自动审计。</p></section>' +
    '<section class="stats">' +
    '<div class="stat"><b>' +
    summary.personaCount +
    '</b><span>玩家画像</span></div>' +
    '<div class="stat"><b>' +
    summary.issueCount +
    '</b><span>问题总数</span></div>' +
    '<div class="stat"><b>' +
    summary.personaRisk['极高'] +
    '</b><span>极高流失风险</span></div>' +
    '<div class="stat"><b>' +
    summary.personaRisk['高'] +
    '</b><span>高流失风险</span></div>' +
    '</section>' +
    '<section class="panel"><h2>问题优先级</h2><table><thead><tr><th>#</th><th>级别</th><th>维度</th><th>问题</th><th>影响</th><th>高关注</th><th>修复建议</th></tr></thead><tbody>' +
    issueRows +
    '</tbody></table></section>' +
    '<section class="panel"><h2>100名玩家逐人反馈</h2><p class="note">每个玩家的意见根据其平台、设备、耐心、技能和关注维度不同而变化。</p><div class="players">' +
    playerCards +
    '</div></section>' +
    '</main></body></html>'
  );
}

function buildIssueCsv(
  report
) {
  const rows = [
    [
      'rank',
      'priority',
      'dimension',
      'issue_id',
      'title',
      'affected',
      'affected_rate',
      'high_concern',
      'average_score',
      'detail',
      'remediation'
    ]
  ];

  report
    .rankedIssues
    .forEach(
      (
        issue,
        index
      ) => {
        rows.push([
          index + 1,
          issue.priority,
          issue.dimension,
          issue.id,
          issue.title,
          issue.affected,
          issue.affectedRate,
          issue.highConcern,
          issue.averageScore,
          issue.detail,
          issue.remediation
        ]);
      }
    );

  return rows
    .map(
      row =>
        row.map(
          csvCell
        ).join(
          ','
        )
    )
    .join(
      '\n'
    );
}

function buildPlayerCsv(
  report
) {
  const rows = [
    [
      'persona_id',
      'nickname',
      'label',
      'platform',
      'device',
      'churn_risk',
      'top_complaint_1',
      'top_score_1',
      'top_complaint_2',
      'top_score_2',
      'top_complaint_3',
      'top_score_3'
    ]
  ];

  for (
    const persona of
    report.personas
  ) {
    const top =
      persona.complaints
        .slice(
          0,
          3
        );

    rows.push([
      persona.personaId,
      persona.nickname,
      persona.label,
      persona.platform,
      persona.device,
      persona.churnRisk,
      top[0]
        ? top[0].title
        : '',
      top[0]
        ? top[0].score
        : '',
      top[1]
        ? top[1].title
        : '',
      top[1]
        ? top[1].score
        : '',
      top[2]
        ? top[2].title
        : '',
      top[2]
        ? top[2].score
        : ''
    ]);
  }

  return rows
    .map(
      row =>
        row.map(
          csvCell
        ).join(
          ','
        )
    )
    .join(
      '\n'
    );
}

function writeReport(
  root,
  report,
  outputDir
) {
  const dir =
    outputDir ||
    path.join(
      root,
      'player-lab-output'
    );

  ensureDir(
    dir
  );

  const summary =
    buildSummary(
      report
    );

  fs.writeFileSync(
    path.join(
      dir,
      'report.html'
    ),
    buildHtml(
      report
    )
  );

  fs.writeFileSync(
    path.join(
      dir,
      'report.md'
    ),
    buildMarkdown(
      report
    )
  );

  fs.writeFileSync(
    path.join(
      dir,
      'summary.json'
    ),
    JSON.stringify(
      summary,
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(
      dir,
      'issues.json'
    ),
    JSON.stringify(
      report
        .rankedIssues,
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(
      dir,
      'players.json'
    ),
    JSON.stringify(
      report.personas,
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(
      dir,
      'issues.csv'
    ),
    buildIssueCsv(
      report
    )
  );

  fs.writeFileSync(
    path.join(
      dir,
      'players.csv'
    ),
    buildPlayerCsv(
      report
    )
  );

  fs.writeFileSync(
    path.join(
      dir,
      'github-summary.md'
    ),
    buildGithubSummary(
      report
    )
  );

  return {
    dir,
    files: [
      'report.html',
      'report.md',
      'summary.json',
      'issues.json',
      'players.json',
      'issues.csv',
      'players.csv',
      'github-summary.md'
    ]
  };
}

module.exports = {
  buildSummary,
  buildMarkdown,
  buildGithubSummary,
  buildHtml,
  buildIssueCsv,
  buildPlayerCsv,
  writeReport
};
