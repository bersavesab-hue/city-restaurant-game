'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.gradle',
  'build',
  '.idea'
]);

function normalize(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '');
}

function walk(root, relDir = '.') {
  const base = path.resolve(root, relDir);

  if (!fs.existsSync(base)) {
    return [];
  }

  const output = [];
  const stack = [base];

  while (stack.length) {
    const current = stack.pop();

    for (const ent of fs.readdirSync(current, { withFileTypes: true })) {
      if (ent.isDirectory() && SKIP_DIRS.has(ent.name)) {
        continue;
      }

      const abs = path.join(current, ent.name);

      if (ent.isDirectory()) {
        stack.push(abs);
      } else if (ent.isFile()) {
        output.push(normalize(path.relative(root, abs)));
      }
    }
  }

  return output.sort();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function sha256File(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function sha256Text(text) {
  return crypto
    .createHash('sha256')
    .update(String(text))
    .digest('hex');
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;

  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function versionParts(value) {
  return String(value || '0')
    .split('.')
    .map(part => {
      const match = String(part).match(/\d+/);
      return match ? Number(match[0]) : 0;
    });
}

function versionGte(a, b) {
  const aa = versionParts(a);
  const bb = versionParts(b);
  const len = Math.max(aa.length, bb.length);

  for (let i = 0; i < len; i++) {
    const av = aa[i] || 0;
    const bv = bb[i] || 0;

    if (av > bv) return true;
    if (av < bv) return false;
  }

  return true;
}

function ensureReportDir(root) {
  const dir = path.join(root, 'reports', 'devkit');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolveRelativeModule(fromFile, request) {
  const base = path.resolve(path.dirname(fromFile), request);
  const candidates = [
    base,
    base + '.js',
    base + '.json',
    base + '.txt',
    path.join(base, 'index.js')
  ];

  return candidates.find(file =>
    fs.existsSync(file) &&
    fs.statSync(file).isFile()
  ) || null;
}

module.exports = {
  SKIP_DIRS,
  normalize,
  walk,
  readJson,
  writeJson,
  sha256File,
  sha256Text,
  formatBytes,
  versionParts,
  versionGte,
  ensureReportDir,
  resolveRelativeModule
};
