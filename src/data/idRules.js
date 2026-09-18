'use strict';

const registry = require('./dataDomainRegistry.js');

const ENTITY_ID_PATTERN = /^[a-z][a-z0-9]*_[0-9]{4}$/;
const DOMAIN_ID_PATTERN = /^[a-z][A-Za-z0-9]*$/;

function getExpectedPrefix(domainId) {
  const domain = registry.getDomain(domainId);
  return domain ? domain.idPrefix : null;
}

function validateEntityId(domainId, value) {
  const prefix = getExpectedPrefix(domainId);
  if (!prefix) {
    return { ok: false, code: 'UNKNOWN_DOMAIN', domainId, value };
  }

  if (typeof value !== 'string') {
    return { ok: false, code: 'ID_NOT_STRING', domainId, value };
  }

  if (!ENTITY_ID_PATTERN.test(value)) {
    return { ok: false, code: 'ID_FORMAT_INVALID', domainId, value, expectedPrefix: prefix };
  }

  if (!value.startsWith(prefix)) {
    return { ok: false, code: 'ID_PREFIX_MISMATCH', domainId, value, expectedPrefix: prefix };
  }

  return { ok: true, domainId, value };
}

function assertEntityId(domainId, value) {
  const result = validateEntityId(domainId, value);
  if (!result.ok) {
    const error = new Error(
      `Invalid entity id "${value}" for domain "${domainId}": ${result.code}`
    );
    error.code = result.code;
    error.details = result;
    throw error;
  }
  return value;
}

function makeEntityId(domainId, sequence) {
  const prefix = getExpectedPrefix(domainId);
  if (!prefix) {
    throw new Error(`Unknown data domain: ${domainId}`);
  }

  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 9999) {
    throw new Error('Entity sequence must be an integer from 1 to 9999');
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

function validateDomainId(value) {
  return typeof value === 'string' && DOMAIN_ID_PATTERN.test(value);
}

module.exports = Object.freeze({
  VERSION: 1,
  ENTITY_ID_PATTERN,
  DOMAIN_ID_PATTERN,
  getExpectedPrefix,
  validateEntityId,
  assertEntityId,
  makeEntityId,
  validateDomainId,
  policy: Object.freeze({
    numericWidth: 4,
    neverReuseIds: true,
    deletedContentMustBeDeprecated: true,
    legacyIdsMustUseMigrationAliases: true
  })
});
