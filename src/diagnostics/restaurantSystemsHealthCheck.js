'use strict';

/**
 * Restaurant systems health checker.
 * Used to verify that the new restaurant expansion modules are registered.
 */
function check(registry) {
  const required = [
    'food',
    'staff',
    'rating',
    'ranking',
    'awards'
  ];

  const systems = registry && typeof registry.getAll === 'function'
    ? registry.getAll()
    : {};

  const missing = required.filter(name => !systems[name]);

  return {
    ok: missing.length === 0,
    missing,
    checked: required
  };
}

module.exports = { check };
