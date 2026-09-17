'use strict';

/**
 * Project-level module boundary registry.
 *
 * This file describes where the current source tree belongs logically before
 * physical folder migrations are performed.  The migration is intentionally
 * incremental so the runnable/tested baseline is never sacrificed for a
 * cosmetic directory rewrite.
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
    'service',
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

const knownCaseCollisions = Object.freeze([
  Object.freeze([
    'core/GameState.js',
    'core/gameState.js'
  ])
]);

const legacyCorePresentationFiles = Object.freeze([
  'animationManager.js',
  'popupManager.js',
  'sceneManager.js'
]);

/**
 * Concrete migration debt. New work should not add more overlap groups.
 */
const migrationDebt = Object.freeze([
  Object.freeze({
    id: 'state-case-collision',
    priority: 1,
    paths: Object.freeze(['core/GameState.js', 'core/gameState.js']),
    target: 'Keep one canonical runtime state implementation.'
  }),
  Object.freeze({
    id: 'core-presentation-leak',
    priority: 1,
    paths: Object.freeze([
      'core/animationManager.js',
      'core/popupManager.js',
      'core/sceneManager.js'
    ]),
    target: 'Move presentation managers out of core after dependency rewiring.'
  }),
  Object.freeze({
    id: 'bootstrap-overlap',
    priority: 2,
    paths: Object.freeze(['bootstrap/', 'core/AppBootstrap.js', 'core/bootstrap.js']),
    target: 'Consolidate startup/bootstrap ownership.'
  }),
  Object.freeze({
    id: 'service-singular-plural-overlap',
    priority: 2,
    paths: Object.freeze(['service/', 'services/']),
    target: 'Consolidate service ownership under one application-service boundary.'
  }),
  Object.freeze({
    id: 'renovation-decoration-overlap',
    priority: 2,
    paths: Object.freeze(['decoration/', 'renovation/']),
    target: 'Keep renovation domain logic separate from editor/presentation code.'
  }),
  Object.freeze({
    id: 'people-model-overlap',
    priority: 3,
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
