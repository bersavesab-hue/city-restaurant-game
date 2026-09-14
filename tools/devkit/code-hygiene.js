'use strict';

const fs = require('fs');
const path = require('path');
const {
  walk,
  writeJson,
  ensureReportDir
} = require('./utils.js');

function audit(root) {
  const errors = [];
  const warnings = [];
  const files = walk(root, '.');

  const forbiddenFiles = files.filter(rel =>
    /^scripts\/apply-v/i.test(rel) ||
    /(^|\/)(old|legacy|backup|bak|temp|tmp)(\/|[._-])/i.test(rel) ||
    /v052/i.test(rel)
  );

  for (const rel of forbiddenFiles) {
    errors.push({
      type: 'legacy-file',
      file: rel,
      message: '正式树发现旧补丁/备份型文件'
    });
  }

  const jsFiles = files.filter(rel =>
    rel.endsWith('.js') &&
    (
      rel.startsWith('src/') ||
      rel.startsWith('scripts/') ||
      rel.startsWith('tools/')
    )
  );

  const reassignment = {};

  for (const rel of jsFiles) {
    const abs = path.join(root, rel);
    const text = fs.readFileSync(abs, 'utf8');

    const names = new Map();

    for (const m of text.matchAll(/(?:^|\n)\s*([A-Za-z_$][\w$]*)\s*=\s*function\s*\(/g)) {
      const name = m[1];
      names.set(name, (names.get(name) || 0) + 1);
    }

    for (const [name, count] of names.entries()) {
      if (count > 1) {
        if (!reassignment[rel]) reassignment[rel] = [];
        reassignment[rel].push({ name, count });

        warnings.push({
          type: 'function-overlay-chain',
          file: rel,
          name,
          count,
          message: `同一函数被 function 形式重新赋值 ${count} 次`
        });
      }
    }

    const markers = [...text.matchAll(/\bV(\d{2,})(?:[._]\d+)?_[A-Z0-9_]+/g)]
      .map(m => m[0]);

    const uniqueMarkers = [...new Set(markers)];

    if (uniqueMarkers.length >= 6) {
      warnings.push({
        type: 'version-layer-density',
        file: rel,
        count: uniqueMarkers.length,
        markers: uniqueMarkers.slice(0, 20),
        message: '单文件历史版本标记过密，建议继续收口'
      });
    }
  }

  return {
    name: 'code-hygiene',
    errors,
    warnings,
    metrics: {
      jsFiles: jsFiles.length,
      forbiddenFiles: forbiddenFiles.length,
      overlayWarnings: warnings.filter(x => x.type === 'function-overlay-chain').length
    },
    details: {
      reassignment
    }
  };
}

function runCli(root) {
  const report = audit(root);
  const dir = ensureReportDir(root);
  writeJson(path.join(dir, 'code-hygiene.json'), report);

  console.log(
    `[DevKit/code] errors=${report.errors.length} warnings=${report.warnings.length}`
  );

  for (const item of report.errors) {
    console.error('ERROR', item.file, item.message);
  }

  for (const item of report.warnings.slice(0, 20)) {
    console.warn('WARN', item.file, item.message);
  }

  if (report.errors.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli(path.resolve(__dirname, '../..'));
}

module.exports = { audit };
