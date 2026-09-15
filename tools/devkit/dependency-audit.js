'use strict';

const fs = require('fs');
const path = require('path');
const {
  walk,
  writeJson,
  ensureReportDir,
  resolveRelativeModule
} = require('./utils.js');

function stripJsComments(source) {
  const text =
    String(source || '');

  let out = '';
  let state = 'normal';
  let escaped = false;

  for (
    let i = 0;
    i < text.length;
    i++
  ) {
    const ch = text[i];
    const next = text[i + 1];

    if (state === 'line') {
      if (ch === '\n') {
        out += ch;
        state = 'normal';
      } else {
        out += ' ';
      }
      continue;
    }

    if (state === 'block') {
      if (
        ch === '*' &&
        next === '/'
      ) {
        out += '  ';
        i += 1;
        state = 'normal';
      } else {
        out +=
          ch === '\n'
            ? '\n'
            : ' ';
      }
      continue;
    }

    if (
      state === 'single' ||
      state === 'double' ||
      state === 'template'
    ) {
      if (
        !escaped &&
        text.slice(
          i,
          i + 8
        ) ===
          'require('
      ) {
        out += '        ';
        i += 7;
        continue;
      }

      out += ch;

      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (
        (
          state === 'single' &&
          ch === "'"
        ) ||
        (
          state === 'double' &&
          ch === '"'
        ) ||
        (
          state === 'template' &&
          ch === '`'
        )
      ) {
        state = 'normal';
      }

      continue;
    }

    if (
      ch === '/' &&
      next === '/'
    ) {
      out += '  ';
      i += 1;
      state = 'line';
      continue;
    }

    if (
      ch === '/' &&
      next === '*'
    ) {
      out += '  ';
      i += 1;
      state = 'block';
      continue;
    }

    if (ch === "'") {
      state = 'single';
    } else if (ch === '"') {
      state = 'double';
    } else if (ch === '`') {
      state = 'template';
    }

    out += ch;
  }

  return out;
}

function audit(root) {
  const errors = [];
  const warnings = [];
  const reverse = {};
  const files = walk(root, '.');

  const codeFiles = files.filter(rel =>
    /\.(js|json)$/i.test(rel) &&
    (
      rel.startsWith('src/') ||
      rel.startsWith('android/') ||
      rel.startsWith('scripts/') ||
      rel.startsWith('tools/')
    )
  );

  let relativeRequireCount = 0;
  let assetReferenceCount = 0;

  for (const rel of codeFiles) {
    const abs = path.join(root, rel);
    let text = '';

    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch (error) {
      continue;
    }

    if (rel.endsWith('.js')) {
      text =
        stripJsComments(
          text
        );

      for (const m of text.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        const req = m[1];

        if (!req.startsWith('.')) {
          continue;
        }

        relativeRequireCount += 1;

        const target = resolveRelativeModule(abs, req);

        if (!target) {
          errors.push({
            type: 'missing-relative-require',
            file: rel,
            request: req,
            message: '相对依赖不存在'
          });
          continue;
        }

        const targetRel = path.relative(root, target).replace(/\\/g, '/');

        if (!reverse[targetRel]) reverse[targetRel] = [];
        reverse[targetRel].push(rel);
      }
    }

    for (const m of text.matchAll(/['"](assets\/images\/[^'"]+\.(?:png|jpg|jpeg|webp|gif|svg))['"]/gi)) {
      const asset = m[1].replace(/\\/g, '/');
      assetReferenceCount += 1;

      if (!fs.existsSync(path.join(root, asset))) {
        errors.push({
          type: 'missing-asset',
          file: rel,
          asset,
          message: '代码引用的图片不存在'
        });
      }

      if (!reverse[asset]) reverse[asset] = [];
      reverse[asset].push(rel);
    }
  }

  return {
    name: 'dependency-audit',
    errors,
    warnings,
    metrics: {
      scannedFiles: codeFiles.length,
      relativeRequireCount,
      assetReferenceCount,
      reverseDependencyNodes: Object.keys(reverse).length
    },
    reverseDependencies: reverse
  };
}

function runCli(root) {
  const report = audit(root);
  const dir = ensureReportDir(root);
  writeJson(path.join(dir, 'dependencies.json'), report);

  console.log(
    `[DevKit/deps] files=${report.metrics.scannedFiles} errors=${report.errors.length}`
  );

  for (const item of report.errors.slice(0, 30)) {
    console.error('ERROR', item.file, item.request || item.asset, item.message);
  }

  if (report.errors.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli(path.resolve(__dirname, '../..'));
}

module.exports = {
  audit,
  stripJsComments
};
