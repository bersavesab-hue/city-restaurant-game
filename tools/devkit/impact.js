'use strict';

const fs = require('fs');
const path = require('path');
const {
  walk
} = require('./utils.js');

function analyze(root, target) {
  const normalized = String(target || '').replace(/\\/g, '/');
  const base = path.basename(normalized);
  const stem = base.replace(/\.[^.]+$/, '');

  const files = walk(root, '.')
    .filter(rel =>
      /\.(js|json|md|txt)$/i.test(rel) &&
      (
        rel.startsWith('src/') ||
        rel.startsWith('scripts/') ||
        rel.startsWith('tools/') ||
        rel.startsWith('tests/') ||
        rel.startsWith('android/')
      )
    );

  const references = [];
  const relatedTests = [];

  for (const rel of files) {
    if (rel === normalized) continue;

    const text = fs.readFileSync(path.join(root, rel), 'utf8');

    if (
      text.includes(normalized) ||
      text.includes(base) ||
      (stem.length >= 5 && text.includes(stem))
    ) {
      references.push(rel);

      if (rel.startsWith('tests/')) {
        relatedTests.push(rel);
      }
    }
  }

  return {
    target: normalized,
    exists: fs.existsSync(path.join(root, normalized)),
    references: [...new Set(references)].sort(),
    relatedTests: [...new Set(relatedTests)].sort()
  };
}

function runCli(root) {
  const target = process.argv[2];

  if (!target) {
    console.error('用法: npm run dev:impact -- src/xxx.js');
    process.exit(2);
  }

  const report = analyze(root, target);

  console.log('目标:', report.target);
  console.log('存在:', report.exists ? 'YES' : 'NO');
  console.log('引用:', report.references.length);
  report.references.slice(0, 40).forEach(x => console.log('  ', x));
  console.log('关联测试:', report.relatedTests.length);
  report.relatedTests.forEach(x => console.log('  ', x));

  if (!report.exists) process.exitCode = 1;
}

if (require.main === module) {
  runCli(path.resolve(__dirname, '../..'));
}

module.exports = { analyze };
