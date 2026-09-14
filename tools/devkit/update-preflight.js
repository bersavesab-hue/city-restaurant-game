'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const {
  walk,
  readJson,
  versionGte
} = require('./utils.js');

function run(command, args, options = {}) {
  return cp.spawnSync(command, args, {
    encoding: 'utf8',
    ...options
  });
}

function inspectZip(root, zipPath) {
  const errors = [];
  const warnings = [];
  const absZip = path.resolve(root, zipPath);

  if (!fs.existsSync(absZip)) {
    return {
      errors: [{ type: 'missing-zip', message: 'update.zip 不存在' }],
      warnings,
      entries: []
    };
  }

  const list = run('unzip', ['-Z1', absZip]);

  if (list.status !== 0) {
    errors.push({
      type: 'unzip-unavailable-or-invalid',
      message: (list.stderr || list.stdout || '无法读取ZIP').trim()
    });

    return { errors, warnings, entries: [] };
  }

  const entries = String(list.stdout || '')
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);

  const seen = new Set();

  for (const entry of entries) {
    if (
      entry.startsWith('/') ||
      entry.split('/').includes('..') ||
      entry.startsWith('.git/')
    ) {
      errors.push({
        type: 'unsafe-path',
        entry,
        message: 'ZIP包含不安全路径'
      });
    }

    if (seen.has(entry)) {
      warnings.push({
        type: 'duplicate-entry',
        entry,
        message: 'ZIP存在重复路径'
      });
    }

    seen.add(entry);
  }

  if (entries.includes('.github/workflows/apply-update.yml')) {
    errors.push({
      type: 'workflow-overwrite',
      message: '更新包不得覆盖一键更新工作流'
    });
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'devkit-preflight-'));

  try {
    const extract = run('unzip', ['-q', '-o', absZip, '-d', tmp]);

    if (extract.status !== 0) {
      errors.push({
        type: 'extract-failed',
        message: (extract.stderr || 'ZIP解压失败').trim()
      });

      return { errors, warnings, entries };
    }

    const pkgPath = path.join(tmp, 'package.json');

    if (!fs.existsSync(pkgPath)) {
      warnings.push({
        type: 'no-package-json',
        message: '更新包没有package.json，版本无法预检'
      });
    } else {
      try {
        const incoming = readJson(pkgPath);
        const current = readJson(path.join(root, 'package.json'));

        if (!versionGte(incoming.version, current.version)) {
          errors.push({
            type: 'version-regression',
            current: current.version,
            incoming: incoming.version,
            message: '更新包版本低于当前项目'
          });
        }
      } catch (error) {
        errors.push({
          type: 'invalid-package-json',
          message: String(error.message || error)
        });
      }
    }

    const manifestPath = path.join(tmp, 'PATCH_MANIFEST.json');

    if (!fs.existsSync(manifestPath)) {
      warnings.push({
        type: 'no-patch-manifest',
        message: '建议所有更新包包含PATCH_MANIFEST.json'
      });
    } else {
      try {
        readJson(manifestPath);
      } catch (error) {
        errors.push({
          type: 'invalid-patch-manifest',
          message: String(error.message || error)
        });
      }
    }

    const jsFiles = walk(tmp, '.').filter(rel => rel.endsWith('.js'));

    for (const rel of jsFiles) {
      const check = run(
        process.execPath,
        ['--check', path.join(tmp, rel)]
      );

      if (check.status !== 0) {
        errors.push({
          type: 'js-syntax',
          file: rel,
          message: (check.stderr || check.stdout || 'JS语法错误').trim()
        });
      }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  return { errors, warnings, entries };
}

function runCli(root) {
  const zipPath = process.argv[2] || 'update.zip';
  const report = inspectZip(root, zipPath);

  console.log(
    `[DevKit/preflight] entries=${report.entries.length} errors=${report.errors.length} warnings=${report.warnings.length}`
  );

  report.errors.forEach(x => console.error('ERROR', x.message, x.entry || x.file || ''));
  report.warnings.forEach(x => console.warn('WARN', x.message, x.entry || ''));

  console.log(
    report.errors.length
      ? '允许上传: NO'
      : '允许上传: YES'
  );

  if (report.errors.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli(path.resolve(__dirname, '../..'));
}

module.exports = { inspectZip };
