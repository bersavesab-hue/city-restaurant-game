'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const lifecycle = require('../scripts/resource-lifecycle.js');

function write(root, rel, content) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content == null ? '' : content);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'resource-lifecycle-'));

try {
  write(root, 'package.json', JSON.stringify({
    name: 'fixture',
    version: '1.2.0'
  }));

  write(root, 'assets/resource-lifecycle.json', JSON.stringify({
    schemaVersion: 1,
    defaultStatus: 'protected',
    policies: [
      { prefix: 'assets/images/reserve/', status: 'reserve' },
      { prefix: 'assets/images/active/', status: 'active' }
    ],
    dynamicPools: [
      { id: 'reserve_pool', prefixes: ['assets/images/reserve/'] }
    ],
    retired: [
      {
        path: 'assets/images/old/dead.png',
        replacement: 'assets/images/active/new.png',
        retireAfter: '1.1.0',
        saveSafe: true
      },
      {
        path: 'assets/images/old/still_used.png',
        replacement: 'assets/images/active/new.png',
        retireAfter: '1.1.0',
        saveSafe: true
      }
    ],
    rules: {
      requireReplacementBeforeDelete: true,
      requireSaveSafeBeforeDelete: true
    }
  }));

  for (const rel of [
    'assets/images/reserve/future.png',
    'assets/images/active/new.png',
    'assets/images/old/dead.png',
    'assets/images/old/still_used.png',
    'assets/images/unmanaged/unknown.png'
  ]) {
    write(root, rel, Buffer.from([0, 1, 2, 3]));
  }

  write(
    root,
    'src/app.js',
    "const p='assets/images/old/still_used.png';\n"
  );

  const audit = lifecycle.buildAudit(root);

  const reserve = audit.records.find(
    x => x.path === 'assets/images/reserve/future.png'
  );

  assert.equal(reserve.status, 'reserve');
  assert.deepEqual(reserve.pools, ['reserve_pool']);
  assert.equal(reserve.referencedBy.length, 0);

  const unknown = audit.records.find(
    x => x.path === 'assets/images/unmanaged/unknown.png'
  );

  assert.equal(unknown.status, 'protected');
  assert.equal(unknown.managed, false);

  const retired = lifecycle.evaluateRetired(root, audit);

  assert.ok(
    retired.find(x => x.path === 'assets/images/old/dead.png').eligible
  );

  assert.equal(
    retired.find(x => x.path === 'assets/images/old/still_used.png').eligible,
    false
  );

  lifecycle.garbageCollect(root, true);

  assert.ok(!fs.existsSync(path.join(root, 'assets/images/old/dead.png')));
  assert.ok(fs.existsSync(path.join(root, 'assets/images/reserve/future.png')));
  assert.ok(fs.existsSync(path.join(root, 'assets/images/unmanaged/unknown.png')));

  const pools = lifecycle.syncPools(root);
  assert.ok(
    pools.reserve_pool.some(
      x => x.path === 'assets/images/reserve/future.png'
    )
  );

  console.log('resourceLifecycleV062.test.js PASS');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
