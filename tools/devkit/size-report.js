'use strict';

const fs = require('fs');
const path = require('path');
const {
  walk,
  writeJson,
  ensureReportDir,
  formatBytes
} = require('./utils.js');

function audit(root) {
  const files = walk(root, '.');
  const groups = {};
  const largest = [];

  for (const rel of files) {
    const abs = path.join(root, rel);
    let size = 0;

    try {
      size = fs.statSync(abs).size;
    } catch (error) {
      continue;
    }

    const parts = rel.split('/');
    let group = parts[0] || '(root)';

    if (rel.startsWith('assets/images/') && parts.length >= 3) {
      group = parts.slice(0, 3).join('/');
    } else if (parts.length >= 2) {
      group = parts.slice(0, 2).join('/');
    }

    groups[group] = (groups[group] || 0) + size;
    largest.push({ path: rel, bytes: size });
  }

  largest.sort((a, b) => b.bytes - a.bytes);

  return {
    name: 'size-report',
    errors: [],
    warnings: [],
    metrics: {
      fileCount: files.length,
      totalBytes: largest.reduce((sum, item) => sum + item.bytes, 0)
    },
    groups: Object.entries(groups)
      .map(([name, bytes]) => ({ name, bytes }))
      .sort((a, b) => b.bytes - a.bytes),
    largest: largest.slice(0, 30)
  };
}

function runCli(root) {
  const report = audit(root);
  const dir = ensureReportDir(root);
  writeJson(path.join(dir, 'size-report.json'), report);

  console.log(
    `[DevKit/size] files=${report.metrics.fileCount} total=${formatBytes(report.metrics.totalBytes)}`
  );

  for (const item of report.groups.slice(0, 12)) {
    console.log(' ', item.name, formatBytes(item.bytes));
  }
}

if (require.main === module) {
  runCli(path.resolve(__dirname, '../..'));
}

module.exports = { audit };
