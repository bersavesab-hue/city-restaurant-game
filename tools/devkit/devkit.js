'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const codeHygiene = require('./code-hygiene.js');
const dependencyAudit = require('./dependency-audit.js');
const dataAudit = require('./data-audit.js');
const testDiscovery = require('./test-discovery.js');
const sizeReport = require('./size-report.js');
const buildVerify = require('./build-verify.js');
const snapshot = require('./repo-snapshot.js');

const {
  walk,
  writeJson,
  ensureReportDir
} = require('./utils.js');

const ROOT = path.resolve(__dirname, '../..');

function run(command, args) {
  const result = cp.spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} 失败`);
  }
}

function selfCheck() {
  const files = walk(ROOT, 'tools/devkit')
    .filter(rel => rel.endsWith('.js'));

  for (const rel of files) {
    const result = cp.spawnSync(
      process.execPath,
      ['--check', path.join(ROOT, rel)],
      { cwd: ROOT, stdio: 'inherit' }
    );

    if (result.status !== 0) {
      throw new Error('DevKit语法检查失败：' + rel);
    }
  }

  console.log(`[DevKit/self-check] ${files.length} files PASS`);
  return true;
}

function audit() {
  const reports = [
    codeHygiene.audit(ROOT),
    dependencyAudit.audit(ROOT),
    dataAudit.audit(ROOT),
    testDiscovery.audit(ROOT),
    sizeReport.audit(ROOT)
  ];

  const errors = reports.flatMap(x => x.errors || []);
  const warnings = reports.flatMap(x => x.warnings || []);

  const summary = {
    version: 1,
    status: errors.length ? 'FAIL' : 'PASS',
    errors: errors.length,
    warnings: warnings.length,
    tools: reports.map(x => ({
      name: x.name,
      errors: (x.errors || []).length,
      warnings: (x.warnings || []).length,
      metrics: x.metrics || {}
    }))
  };

  const dir = ensureReportDir(ROOT);
  writeJson(path.join(dir, 'latest.json'), {
    ...summary,
    reports
  });

  console.log('\n=== CITY RESTAURANT DEVKIT 1.0 ===');
  console.log('状态:', summary.status);
  console.log('错误:', summary.errors);
  console.log('警告:', summary.warnings);

  for (const tool of summary.tools) {
    console.log(
      `- ${tool.name}: errors=${tool.errors} warnings=${tool.warnings}`
    );
  }

  if (errors.length) {
    process.exitCode = 1;
  }

  return summary;
}

function releaseCheck() {
  selfCheck();

  const first = audit();

  if (first.errors) {
    throw new Error('DevKit审计存在阻断错误');
  }

  console.log('\n[DevKit/release] 运行完整项目测试');
  run('npm', ['test']);

  console.log('\n[DevKit/release] 重新构建Android JS');
  run('npm', ['run', 'build:android-js']);

  console.log('\n[DevKit/release] 校验构建新鲜度与指纹');
  const build = buildVerify.audit(ROOT);

  const dir = ensureReportDir(ROOT);
  writeJson(path.join(dir, 'build-fingerprint.json'), build);

  if (build.errors.length) {
    build.errors.forEach(x => console.error('ERROR', x.message));
    throw new Error('Android JS构建一致性校验失败');
  }

  console.log('\n[DevKit/release] 生成仓库快照');
  const snap = snapshot.createSnapshot(ROOT);
  writeJson(path.join(dir, 'repo-snapshot.json'), snap);

  console.log('\nRELEASE CHECK PASS');
  console.log('Source SHA256:', build.sourceDigest);
  console.log('Bundle SHA256:', build.bundle.sha256);
  console.log('Snapshot files:', snap.fileCount);
}

function runCli() {
  const command = process.argv[2] || 'audit';

  if (command === 'audit') {
    audit();
    return;
  }

  if (command === 'release-check') {
    releaseCheck();
    return;
  }

  if (command === 'self-check') {
    selfCheck();
    return;
  }

  throw new Error('未知DevKit命令：' + command);
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    console.error('[DevKit]', error.message || error);
    process.exit(1);
  }
}

module.exports = {
  selfCheck,
  audit,
  releaseCheck
};
