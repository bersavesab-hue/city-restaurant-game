'use strict';

const path = require('path');
const registry = require('../src/data/dataDomainRegistry.js');
const idRules = require('../src/data/idRules.js');
const contract = require('../src/data/gameDataContract.js');

function audit() {
  const errors = [];
  const warnings = [];

  const domains = registry.domains;
  const ids = new Set();
  const prefixes = new Set();
  const paths = new Set();

  if (domains.length !== 24) {
    errors.push(`Expected 24 data domains, got ${domains.length}`);
  }

  const contentCount = domains.filter((d) => d.kind === registry.DOMAIN_KIND.CONTENT).length;
  const ruleCount = domains.filter((d) => d.kind === registry.DOMAIN_KIND.RULE).length;

  if (contentCount !== 18) {
    errors.push(`Expected 18 content domains, got ${contentCount}`);
  }

  if (ruleCount !== 6) {
    errors.push(`Expected 6 rule domains, got ${ruleCount}`);
  }

  for (const domain of domains) {
    if (!idRules.validateDomainId(domain.id)) {
      errors.push(`Invalid domain id: ${domain.id}`);
    }

    if (ids.has(domain.id)) {
      errors.push(`Duplicate domain id: ${domain.id}`);
    }
    ids.add(domain.id);

    if (!domain.idPrefix || !domain.idPrefix.endsWith('_')) {
      errors.push(`Invalid idPrefix for ${domain.id}: ${domain.idPrefix}`);
    } else if (prefixes.has(domain.idPrefix)) {
      errors.push(`Duplicate idPrefix: ${domain.idPrefix}`);
    }
    prefixes.add(domain.idPrefix);

    if (!domain.canonicalPath || path.isAbsolute(domain.canonicalPath)) {
      errors.push(`Invalid canonicalPath for ${domain.id}`);
    } else if (paths.has(domain.canonicalPath)) {
      errors.push(`Duplicate canonicalPath: ${domain.canonicalPath}`);
    }
    paths.add(domain.canonicalPath);

    for (const dep of domain.dependsOn) {
      if (!registry.getDomain(dep)) {
        errors.push(`Unknown dependency ${dep} referenced by ${domain.id}`);
      }
      if (dep === domain.id) {
        errors.push(`Self dependency found on ${domain.id}`);
      }
    }

    if (domain.sourceState === registry.SOURCE_STATE.LEGACY && domain.legacySources.length === 0) {
      warnings.push(`Legacy domain ${domain.id} has no legacySources listed`);
    }
  }

  const visitState = new Map();
  function visit(id, stack) {
    const state = visitState.get(id) || 0;
    if (state === 1) {
      errors.push(`Dependency cycle: ${stack.concat(id).join(' -> ')}`);
      return;
    }
    if (state === 2) return;

    visitState.set(id, 1);
    for (const dep of registry.getDependencies(id)) {
      visit(dep, stack.concat(id));
    }
    visitState.set(id, 2);
  }

  for (const domain of domains) {
    visit(domain.id, []);
  }

  const contractIds = Object.keys(contract.domains || {});
  if (contractIds.length !== domains.length) {
    errors.push(`Contract exposes ${contractIds.length} domains; registry exposes ${domains.length}`);
  }

  for (const domain of domains) {
    if (!contract.domains || !contract.domains[domain.id]) {
      errors.push(`Contract missing domain: ${domain.id}`);
    }
  }

  return {
    name: 'data-contract-audit',
    errors,
    warnings,
    metrics: {
      domains: domains.length,
      contentDomains: contentCount,
      ruleDomains: ruleCount,
      legacyDomains: domains.filter((d) => d.sourceState === registry.SOURCE_STATE.LEGACY).length,
      plannedDomains: domains.filter((d) => d.sourceState === registry.SOURCE_STATE.PLANNED).length
    }
  };
}

function runCli() {
  const report = audit();

  console.log(
    `[data-contract] domains=${report.metrics.domains} content=${report.metrics.contentDomains} rules=${report.metrics.ruleDomains} errors=${report.errors.length} warnings=${report.warnings.length}`
  );

  for (const error of report.errors) {
    console.error('ERROR', error);
  }

  for (const warning of report.warnings) {
    console.warn('WARN', warning);
  }

  if (report.errors.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = { audit };
