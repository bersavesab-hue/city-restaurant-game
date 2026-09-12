'use strict';

const fs =
  require('fs');

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
  writeReport,
  buildGithubSummary
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
          .toISOString(),
      methodology:
        '100 simulated player personas'
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
    report.output =
      writeReport(
        root,
        report,
        opts.outputDir
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

  if (
    report.output
  ) {
    console.log(
      '\n完整报告目录:',
      report.output.dir
    );
  }

  console.log(
    '=========================\n'
  );
}

function appendGithubSummary(
  report
) {
  const summaryFile =
    process.env
      .GITHUB_STEP_SUMMARY;

  if (
    !summaryFile
  ) {
    return;
  }

  try {
    fs.appendFileSync(
      summaryFile,
      buildGithubSummary(
        report
      ) +
        '\n'
    );
  } catch (
    error
  ) {
    console.warn(
      '无法写入GitHub Step Summary:',
      error.message
    );
  }
}

function parseArgs(
  argv
) {
  const result = {
    ci:
      false,
    report:
      false,
    outputDir:
      null
  };

  for (
    let i = 0;
    i <
    argv.length;
    i++
  ) {
    const arg =
      argv[i];

    if (
      arg ===
      '--ci'
    ) {
      result.ci =
        true;
    } else if (
      arg ===
      '--report'
    ) {
      result.report =
        true;
    } else if (
      arg ===
      '--output' &&
      argv[
        i + 1
      ]
    ) {
      result.outputDir =
        path.resolve(
          argv[
            i + 1
          ]
        );

      i +=
        1;
    }
  }

  return result;
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

  const args =
    parseArgs(
      process.argv.slice(
        2
      )
    );

  const report =
    runLab(
      ROOT,
      {
        writeReport:
          args.report,
        outputDir:
          args.outputDir
      }
    );

  printSummary(
    report
  );

  appendGithubSummary(
    report
  );
}

module.exports = {
  runLab,
  printSummary,
  appendGithubSummary,
  parseArgs
};
