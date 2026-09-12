'use strict';

const path =
  require('path');

const {
  PERSONAS
} =
  require('./data/personas.js');

const {
  auditSource
} =
  require('./audit/sourceAudit.js');

const {
  runEconomyProbe
} =
  require('./probes/economyProbe.js');

const {
  runFlowProbe
} =
  require('./probes/flowProbe.js');

const {
  aggregate
} =
  require('./audit/personaEvaluator.js');

const {
  writeReport
} =
  require('./audit/report.js');

function dedupeIssues(
  issues
) {
  const map =
    new Map();

  for (
    const issue of
    issues
  ) {
    if (
      !map.has(
        issue.id
      )
    ) {
      map.set(
        issue.id,
        issue
      );
    }
  }

  return Array.from(
    map.values()
  );
}

function runLab(
  root,
  options
) {
  const opts =
    options ||
    {};

  const source =
    auditSource(
      root
    );

  const economy =
    runEconomyProbe();

  const flow =
    runFlowProbe(
      root
    );

  const issues =
    dedupeIssues(
      [
        ...source.issues,
        ...economy.issues,
        ...flow.issues
      ]
    );

  const aggregateResult =
    aggregate(
      PERSONAS,
      issues
    );

  const report = {
    meta: {
      personaCount:
        PERSONAS.length,
      sceneCount:
        source.sceneCount,
      issueCount:
        issues.length,
      generatedAt:
        new Date()
          .toISOString()
    },

    personaRisk:
      aggregateResult
        .riskCounts,

    sourceMetrics: {
      fontsSampled:
        source
          .fontSamples
          .length,
      fixedButtonsSampled:
        source
          .buttonSamples
          .length,
      startingCash:
        economy
          .startingCash,
      economyScenarios:
        economy
          .scenarios
    },

    issues,

    rankedIssues:
      aggregateResult
        .ranked,

    personas:
      aggregateResult
        .results
  };

  if (
    opts.writeReport
  ) {
    writeReport(
      root,
      report
    );
  }

  return report;
}

function printSummary(
  report
) {
  console.log(
    '\n=== 100名玩家实验室 ==='
  );

  console.log(
    '画像数量:',
    report.meta
      .personaCount
  );

  console.log(
    '检测问题:',
    report.meta
      .issueCount
  );

  console.log(
    '玩家流失风险:',
    JSON.stringify(
      report.personaRisk
    )
  );

  console.log(
    '\nTOP 问题:'
  );

  for (
    let i = 0;
    i <
    Math.min(
      15,
      report
        .rankedIssues
        .length
    );
    i++
  ) {
    const item =
      report
        .rankedIssues[i];

    console.log(
      String(
        i + 1
      ).padStart(
        2,
        '0'
      ) +
        '. [' +
        item.priority +
        '][' +
        item.dimension +
        '] ' +
        item.title +
        ' | 影响 ' +
        item.affected +
        '/100 | 高关注 ' +
        item.highConcern +
        '人'
    );
  }

  console.log(
    '=========================\n'
  );
}

if (
  require.main ===
  module
) {
  const ROOT =
    path.resolve(
      __dirname,
      '..'
    );

  const ci =
    process.argv.includes(
      '--ci'
    );

  const report =
    runLab(
      ROOT,
      {
        writeReport:
          !ci
      }
    );

  printSummary(
    report
  );
}

module.exports = {
  runLab,
  printSummary
};
