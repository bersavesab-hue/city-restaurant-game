'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  walk,
  writeJson,
  ensureReportDir
} = require('./utils.js');

function createSnapshot(root) {
  const files = walk(root, '.')
    .filter(rel =>
      rel.startsWith('src/') ||
      rel.startsWith('assets/') ||
      rel.startsWith('scripts/') ||
      rel.startsWith('tools/') ||
      rel.startsWith('android/') ||
      rel === 'package.json'
    );

  const items = [];

  for (const rel of files) {
    const abs = path.join(root, rel);
    const stat = fs.statSync(abs);
    const hash = crypto.createHash('sha256')
      .update(fs.readFileSync(abs))
      .digest('hex');

    items.push({
      path: rel,
      bytes: stat.size,
      sha256: hash
    });
  }

  const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0);

  return {
    version: 1,
    fileCount: items.length,
    totalBytes,
    files: items
  };
}

function runCli(root) {
  const report = createSnapshot(root);
  const dir = ensureReportDir(root);
  writeJson(path.join(dir, 'repo-snapshot.json'), report);

  console.log(
    `[DevKit/snapshot] files=${report.fileCount} bytes=${report.totalBytes}`
  );
}

if (require.main === module) {
  runCli(path.resolve(__dirname, '../..'));
}

module.exports = { createSnapshot };
