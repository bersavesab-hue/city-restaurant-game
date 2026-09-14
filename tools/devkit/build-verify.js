'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  walk,
  writeJson,
  ensureReportDir,
  sha256File
} = require('./utils.js');

function digestSource(root) {
  const files = walk(root, '.')
    .filter(rel =>
      (
        rel.startsWith('src/') ||
        rel === 'android/entry.js' ||
        rel === 'android/entry.js.txt'
      ) &&
      /\.(js|json|txt)$/i.test(rel)
    );

  const hash = crypto.createHash('sha256');

  for (const rel of files) {
    hash.update(rel);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(root, rel)));
    hash.update('\0');
  }

  return {
    files,
    hash: hash.digest('hex')
  };
}

function audit(root) {
  const errors = [];
  const warnings = [];
  const bundle = path.join(
    root,
    'android',
    'app',
    'src',
    'main',
    'assets',
    'game.bundle.js'
  );

  const source = digestSource(root);

  if (!fs.existsSync(bundle)) {
    errors.push({
      type: 'missing-bundle',
      message: 'Android game.bundle.js 不存在，请先执行 build:android-js'
    });

    return {
      name: 'build-verify',
      errors,
      warnings,
      metrics: {
        sourceFiles: source.files.length
      },
      sourceDigest: source.hash,
      bundle: null
    };
  }

  const bundleStat = fs.statSync(bundle);

  let newestSourceMtime = 0;
  let newestSource = null;

  for (const rel of source.files) {
    const stat = fs.statSync(path.join(root, rel));

    if (stat.mtimeMs > newestSourceMtime) {
      newestSourceMtime = stat.mtimeMs;
      newestSource = rel;
    }
  }

  if (bundleStat.mtimeMs + 1000 < newestSourceMtime) {
    errors.push({
      type: 'stale-bundle',
      source: newestSource,
      message: 'game.bundle.js 比最新源码更旧'
    });
  }

  const bundleHash = sha256File(bundle);

  return {
    name: 'build-verify',
    errors,
    warnings,
    metrics: {
      sourceFiles: source.files.length,
      bundleBytes: bundleStat.size
    },
    sourceDigest: source.hash,
    bundle: {
      path: path.relative(root, bundle).replace(/\\/g, '/'),
      sha256: bundleHash,
      mtimeMs: bundleStat.mtimeMs
    }
  };
}

function runCli(root) {
  const report = audit(root);
  const dir = ensureReportDir(root);
  writeJson(path.join(dir, 'build-fingerprint.json'), report);

  console.log(
    `[DevKit/build] source=${report.sourceDigest.slice(0, 12)} bundle=${report.bundle ? report.bundle.sha256.slice(0, 12) : 'MISSING'} errors=${report.errors.length}`
  );

  for (const item of report.errors) {
    console.error('ERROR', item.message);
  }

  if (report.errors.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli(path.resolve(__dirname, '../..'));
}

module.exports = { audit, digestSource };
