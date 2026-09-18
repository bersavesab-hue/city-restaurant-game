'use strict';

/**
 * Project-level module boundary registry.
 *
 * This file records the current logical ownership of top-level source modules.
 * Resolved migration debt is removed from this registry so the audit reflects
 * the repository as it exists now, not historical structure.
 */
const layers = Object.freeze({
  platform: Object.freeze([
    'bootstrap',
    'core',
    'data',
    'facade',
    'foundation',
    'integration',
    'registry'
  ]),

  domain: Object.freeze([
    'balance',
    'brand',
    'city',
    'competitor',
    'customer',
    'employee',
    'entities',
    'events',
    'finance',
    'food',
    'inventory',
    'kitchen',
    'opening',
    'operations',
    'order',
    'person',
    'progress',
    'property',
    'ranking',
    'rating',
    'regulatory',
    'renovation',
    'reputation',
    'supplier',
    'world'
  ]),

  experience: Object.freeze([
    'audio',
    'barrage',
    'decoration',
    'dialogue',
    'easteregg',
    'scenes',
    'social',
    'ui'
  ]),

  support: Object.freeze([
    'analytics',
    'diagnostics',
    'packs',
    'services',
    'simulator',
    'systems',
    'testing'
  ])
});

const sourceEntrypoints = Object.freeze([
  'main.js'
]);

// Kept temporarily so migrations can be proven safe before deletion/archive.
const legacyTopLevelFiles = Object.freeze([
  'main_refactor_example.js'
]);

// Historical GameState case collision has been resolved.
const knownCaseCollisions = Object.freeze([]);

// Presentation implementations now live under src/ui/managers.
const legacyCorePresentationFiles = Object.freeze([]);

/**
 * Concrete migration debt still remaining.
 * New work should not add more overlap groups.
 */
const migrationDebt = Object.freeze([
  Object.freeze({
    id: 'renovation-decoration-overlap',
    priority: 1,
    paths: Object.freeze(['decoration/', 'renovation/']),
    target: 'Keep renovation domain logic separate from editor/presentation code.'
  }),
  Object.freeze({
    id: 'people-model-overlap',
    priority: 2,
    paths: Object.freeze(['person/', 'employee/', 'customer/', 'entities/']),
    target: 'Define shared person model while keeping customer/staff domain behavior separate.'
  }),
  Object.freeze({
    id: 'legacy-main-example',
    priority: 3,
    paths: Object.freeze(['main_refactor_example.js']),
    target: 'Archive or remove after proving no runtime/test dependency.'
  })
]);

function buildDirectoryIndex() {
  const result = Object.create(null);

  for (const [layer, directories] of Object.entries(layers)) {
    for (const directory of directories) {
      if (result[directory]) {
        throw new Error('Duplicate module directory classification: ' + directory);
      }
      result[directory] = layer;
    }
  }

  return result;
}

module.exports = {
  layers,
  sourceEntrypoints,
  legacyTopLevelFiles,
  knownCaseCollisions,
  legacyCorePresentationFiles,
  migrationDebt,
  buildDirectoryIndex
};
