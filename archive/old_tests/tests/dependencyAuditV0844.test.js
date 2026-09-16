'use strict';

const assert =
  require('assert');

const path =
  require('path');

const dependencyAudit =
  require('../tools/devkit/dependency-audit.js');

const sample =
  dependencyAudit
    .stripJsComments(
      "// require('./missing-a.js')\n" +
      "/* 'assets/images/missing.webp' */\n" +
      "const live = require('./real.js');\n"
    );

assert.ok(
  !sample.includes(
    'missing-a.js'
  )
);

assert.ok(
  !sample.includes(
    'missing.webp'
  )
);

assert.ok(
  sample.includes(
    "require('./real.js')"
  )
);

const report =
  dependencyAudit
    .audit(
      path.resolve(
        __dirname,
        '..'
      )
    );

assert.equal(
  report.errors.length,
  0,
  JSON.stringify(
    report.errors
  )
);

console.log(
  'V0.8.44 dependency audit tests passed'
);
