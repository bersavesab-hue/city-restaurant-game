'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const utils = require('../tools/devkit/utils.js');
const code = require('../tools/devkit/code-hygiene.js');
const deps = require('../tools/devkit/dependency-audit.js');
const data = require('../tools/devkit/data-audit.js');
const tests = require('../tools/devkit/test-discovery.js');
const impact = require('../tools/devkit/impact.js');

function write(root, rel, content) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content == null ? '' : content);
}

assert.ok(utils.versionGte('0.6.2', '0.6.1'));
assert.ok(!utils.versionGte('0.6.0', '0.6.1'));

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'devkit-fixture-'));

try {
  write(root, 'package.json', JSON.stringify({
    name: 'fixture',
    version: '1.0.0',
    scripts: {
      test: 'node scripts/run-ci-tests-v060.js'
    }
  }));

  write(root, 'src/a.js', "const b=require('./b.js');\n");
  write(root, 'src/b.js', "module.exports=1;\n");
  write(root, 'src/data/good.json', JSON.stringify([
    { id: 'a' },
    { id: 'a' }
  ]));
  write(root, 'scripts/run-ci-tests-v060.js', "require('../tests/one.test.js');\n");
  write(root, 'tests/one.test.js', "console.log('ok');\n");
  write(root, 'tests/two.test.js', "console.log('ok');\n");

  const depReport = deps.audit(root);
  assert.equal(depReport.errors.length, 0);

  const dataReport = data.audit(root);
  assert.equal(dataReport.errors.length, 0);
  assert.ok(dataReport.warnings.some(x => x.type === 'duplicate-id-in-array'));

  const testReport = tests.audit(root);
  assert.equal(testReport.metrics.total, 2);
  assert.equal(testReport.metrics.uncovered, 1);

  const impactReport = impact.analyze(root, 'src/b.js');
  assert.ok(impactReport.references.includes('src/a.js'));

  write(root, 'scripts/apply-v99-old.js', "console.log('old');\n");
  const codeReport = code.audit(root);
  assert.ok(codeReport.errors.some(x => x.type === 'legacy-file'));

  console.log('devkitV100.test.js PASS');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
