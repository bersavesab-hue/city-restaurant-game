'use strict';

const fs = require('fs');
const path = require('path');
const {
  walk,
  writeJson,
  ensureReportDir
} = require('./utils.js');

function findDuplicateIds(value, location, warnings) {
  if (Array.isArray(value)) {
    const idMap = new Map();

    for (let i = 0; i < value.length; i++) {
      const item = value[i];

      if (
        item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        Object.prototype.hasOwnProperty.call(item, 'id')
      ) {
        const id = String(item.id);

        if (idMap.has(id)) {
          warnings.push({
            type: 'duplicate-id-in-array',
            location,
            id,
            indexes: [idMap.get(id), i],
            message: '同一数组内存在重复 id'
          });
        } else {
          idMap.set(id, i);
        }
      }

      findDuplicateIds(item, `${location}[${i}]`, warnings);
    }

    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      findDuplicateIds(child, `${location}.${key}`, warnings);
    }
  }
}

function audit(root) {
  const errors = [];
  const warnings = [];
  const files = walk(root, '.')
    .filter(rel =>
      rel.endsWith('.json') &&
      (
        rel.startsWith('src/') ||
        rel.startsWith('assets/') ||
        rel.startsWith('simulator/')
      )
    )
    .filter(rel =>
      rel !== 'assets/resource-lifecycle.json'
    );

  let parsed = 0;

  for (const rel of files) {
    const abs = path.join(root, rel);

    try {
      const value = JSON.parse(fs.readFileSync(abs, 'utf8'));
      parsed += 1;
      findDuplicateIds(value, rel, warnings);
    } catch (error) {
      errors.push({
        type: 'invalid-json',
        file: rel,
        message: String(error.message || error)
      });
    }
  }

  return {
    name: 'data-audit',
    errors,
    warnings,
    metrics: {
      jsonFiles: files.length,
      parsed
    }
  };
}

function runCli(root) {
  const report = audit(root);
  const dir = ensureReportDir(root);
  writeJson(path.join(dir, 'data-audit.json'), report);

  console.log(
    `[DevKit/data] json=${report.metrics.jsonFiles} errors=${report.errors.length} warnings=${report.warnings.length}`
  );

  for (const item of report.errors) {
    console.error('ERROR', item.file, item.message);
  }

  for (const item of report.warnings.slice(0, 20)) {
    console.warn('WARN', item.location, item.message, item.id || '');
  }

  if (report.errors.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli(path.resolve(__dirname, '../..'));
}

module.exports = { audit };
