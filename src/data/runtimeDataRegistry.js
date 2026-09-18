'use strict';

const domainRegistry = require('./dataDomainRegistry.js');
const idRules = require('./idRules.js');

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray(payload.items)) {
    return payload.items;
  }
  return null;
}

class RuntimeDataRegistry {
  constructor(options = {}) {
    this.strictIds = options.strictIds !== false;
    this.payloads = new Map();
    this.metadata = new Map();
  }

  register(domainId, payload, options = {}) {
    const domain = domainRegistry.getDomain(domainId);
    if (!domain) {
      throw new Error(`Unknown data domain: ${domainId}`);
    }

    const items = extractItems(payload);
    const strictIds = options.strictIds === undefined ? this.strictIds : options.strictIds;

    if (items) {
      const seen = new Set();

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        if (!Object.prototype.hasOwnProperty.call(item, 'id')) continue;

        const id = String(item.id);
        if (seen.has(id)) {
          throw new Error(`Duplicate id "${id}" in domain "${domainId}"`);
        }
        seen.add(id);

        if (strictIds) {
          idRules.assertEntityId(domainId, id);
        }
      }
    }

    const schemaVersion =
      options.schemaVersion ||
      (payload && typeof payload === 'object' && !Array.isArray(payload) && payload.schemaVersion) ||
      domain.schemaVersion;

    if (schemaVersion !== domain.schemaVersion && options.allowVersionMismatch !== true) {
      throw new Error(
        `Schema version mismatch for "${domainId}": expected ${domain.schemaVersion}, got ${schemaVersion}`
      );
    }

    this.payloads.set(domainId, payload);
    this.metadata.set(domainId, Object.freeze({
      schemaVersion,
      source: options.source || 'runtime',
      registeredAt: options.registeredAt || null,
      legacy: options.legacy === true
    }));

    return payload;
  }

  get(domainId) {
    return this.payloads.has(domainId) ? this.payloads.get(domainId) : null;
  }

  getMetadata(domainId) {
    return this.metadata.has(domainId) ? this.metadata.get(domainId) : null;
  }

  getDomainDefinition(domainId) {
    return domainRegistry.getDomain(domainId);
  }

  has(domainId) {
    return this.payloads.has(domainId);
  }

  unregister(domainId) {
    const existed = this.payloads.delete(domainId);
    this.metadata.delete(domainId);
    return existed;
  }

  clear() {
    this.payloads.clear();
    this.metadata.clear();
  }

  listRegistered() {
    return Array.from(this.payloads.keys());
  }

  listMissingDependencies(domainId) {
    const domain = domainRegistry.getDomain(domainId);
    if (!domain) {
      throw new Error(`Unknown data domain: ${domainId}`);
    }

    return domain.dependsOn.filter((dependencyId) => !this.payloads.has(dependencyId));
  }
}

module.exports = RuntimeDataRegistry;
