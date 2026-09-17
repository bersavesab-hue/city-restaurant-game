'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const registry = require('../src/registry/ProjectModuleRegistry.js');

function fail(message, details) {
  console.error('[architecture-audit] FAIL:', message);
  if (details && details.length) {
    for (const item of details) console.error('  -', item);
  }
  process.exit(1);
}

function normalize(rel) {
  return rel.split(path.sep).join('/');
}

function walk(dir, base = dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full, base));
    else if (ent.isFile()) out.push(normalize(path.relative(base, full)));
  }
  return out;
}

const index = registry.buildDirectoryIndex();
const srcEntries = fs.readdirSync(SRC, { withFileTypes: true });
const actualDirectories = srcEntries
  .filter((ent) => ent.isDirectory())
  .map((ent) => ent.name)
  .sort();
const expectedDirectories = Object.keys(index).sort();

const unclassified = actualDirectories.filter((name) => !index[name]);
const missing = expectedDirectories.filter((name) => !actualDirectories.includes(name));

if (unclassified.length) {
  fail('Unclassified src top-level directories detected. Classify them before merging.', unclassified);
}

if (missing.length) {
  fail('Registry still references directories that no longer exist. Update migration registry with the move.', missing);
}

const allowedTopLevelFiles = new Set([
  ...registry.sourceEntrypoints,
  ...registry.legacyTopLevelFiles
]);
const unknownTopLevelJs = srcEntries
  .filter((ent) => ent.isFile() && ent.name.endsWith('.js'))
  .map((ent) => ent.name)
  .filter((name) => !allowedTopLevelFiles.has(name));

if (unknownTopLevelJs.length) {
  fail('New top-level JavaScript files are not allowed in src/. Put them in the owning module.', unknownTopLevelJs);
}

const knownCollisionKeys = new Set(
  registry.knownCaseCollisions.map((group) => group.map((item) => item.toLowerCase()).sort().join('|'))
);
const byLowerPath = new Map();
for (const rel of walk(SRC)) {
  const key = rel.toLowerCase();
  if (!byLowerPath.has(key)) byLowerPath.set(key, []);
  byLowerPath.get(key).push(rel);
}

const unexpectedCollisions = [];
for (const group of byLowerPath.values()) {
  if (group.length < 2) continue;
  const key = group.map((item) => item.toLowerCase()).sort().join('|');
  if (!knownCollisionKeys.has(key)) unexpectedCollisions.push(group.join(' <-> '));
}

if (unexpectedCollisions.length) {
  fail('Unexpected case-insensitive source collisions detected.', unexpectedCollisions);
}

const coreDir = path.join(SRC, 'core');
const legacyCorePresentation = new Set(registry.legacyCorePresentationFiles);
const suspiciousCorePresentation = fs.readdirSync(coreDir, { withFileTypes: true })
  .filter((ent) => ent.isFile() && ent.name.endsWith('.js'))
  .map((ent) => ent.name)
  .filter((name) => /(animation|popup|scene)/i.test(name))
  .filter((name) => !legacyCorePresentation.has(name));

if (suspiciousCorePresentation.length) {
  fail('Presentation code must not be added to src/core.', suspiciousCorePresentation);
}

console.log('[architecture-audit] PASS');
console.log('[architecture-audit] classified directories:', actualDirectories.length);
console.log('[architecture-audit] migration debt items:', registry.migrationDebt.length);
console.log('[architecture-audit] protected legacy core presentation files:', registry.legacyCorePresentationFiles.length);
