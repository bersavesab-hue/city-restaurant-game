'use strict';

const fs = require('fs');
const path = require('path');
const {
  walk,
  writeJson,
  ensureReportDir
} = require('./utils.js');

function audit(root) {
  const tests = walk(root, 'tests')
    .filter(rel => rel.endsWith('.js'));

  const runnerPath = path.join(root, 'scripts', 'run-ci-tests-v060.js');
  const qualityGatePath = path.join(root, 'scripts', 'quality-gate-v089.js');
  const packagePath = path.join(root, 'package.json');

  const haystacks = [];

  if (fs.existsSync(runnerPath)) {
    haystacks.push(fs.readFileSync(runnerPath, 'utf8'));
  }

  if (fs.existsSync(qualityGatePath)) {
    haystacks.push(fs.readFileSync(qualityGatePath, 'utf8'));
  }

  if (fs.existsSync(packagePath)) {
    haystacks.push(fs.readFileSync(packagePath, 'utf8'));
  }

  const combined = haystacks.join('\n');
  const covered = [];
  const uncovered = [];

  for (const rel of tests) {
    const fileName = path.basename(rel);

    if (
      combined.includes(rel) ||
      combined.includes(fileName)
    ) {
      covered.push(rel);
    } else {
      uncovered.push(rel);
    }
  }

  const warnings = uncovered.map(rel => ({
    type: 'uncovered-test',
    file: rel,
    message: '测试文件存在，但当前主测试入口没有直接包含它'
  }));

  return {
    name: 'test-discovery',
    errors: [],
    warnings,
    metrics: {
      total: tests.length,
      covered: covered.length,
      uncovered: uncovered.length
    },
    covered,
    uncovered
  };
}

function runCli(root) {
  const report = audit(root);
  const dir = ensureReportDir(root);
  writeJson(path.join(dir, 'test-discovery.json'), report);

  console.log(
    `[DevKit/tests] total=${report.metrics.total} covered=${report.metrics.covered} uncovered=${report.metrics.uncovered}`
  );

  for (const rel of report.uncovered.slice(0, 30)) {
    console.warn('WARN uncovered', rel);
  }
}

if (require.main === module) {
  runCli(path.resolve(__dirname, '../..'));
}

module.exports = { audit };
