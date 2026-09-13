'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const legacyFiles = [
  'foundation/createFoundation.js',
  'foundation/packRegistry.js',
  'foundation/index.js',
  'foundation/rng.js',
  'foundation/compositionEngine.js',
  'entities/entityFactory.js',
  'systems/competitionEngine.js',
  'systems/pricingEngine.js',
  'systems/eventEngine.js',
  'systems/reviewEngine.js',
  'systems/personEngine.js',
  'property/propertyAdapterV02.js',
  'property/propertyPackV02.js',
  'property/propertyRulesV02.js',
  'person/personPackV10.js',
  'person/personRulesV10.js',
  'packs/base/foundationPacks.js',
  'easteregg/easterEggPackV10.js',
  'easteregg/easterEggEngineV10.js',
  'easteregg/index.js',
  'scenes/shopScene.js',
  'tests/foundationV02.test.js',
  'tests/propertyPackV02.test.js',
  'tests/propertyFullPackV100.test.js',
  'tests/personNpcFullPackV100.test.js',
  'tests/easterEggPackV100.test.js'
];

let removed = 0;
for (const rel of legacyFiles) {
  const target = path.join(ROOT, rel);
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    fs.unlinkSync(target);
    removed += 1;
  }
}

// Remove only directories that became empty after the exact-file cleanup.
const possibleEmptyDirs = [
  'packs/base', 'packs', 'foundation', 'entities', 'systems',
  'property', 'person', 'easteregg', 'scenes'
];
for (const rel of possibleEmptyDirs) {
  const dir = path.join(ROOT, rel);
  try {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
  } catch (_) {}
}

console.log(`V0.5 layout repair: removed ${removed} legacy root-layout file(s)`);
