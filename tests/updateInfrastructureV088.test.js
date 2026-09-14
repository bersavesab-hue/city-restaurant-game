'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const pkg =
  JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        'package.json'
      ),
      'utf8'
    )
  );

assert.equal(
  pkg.version,
  '0.8.8',
  '正式版本必须为0.8.8'
);

assert.ok(
  !/scripts\/apply-v\d+/i.test(
    pkg.scripts.pretest ||
    ''
  ),
  '正式pretest禁止再次调用一次性安装脚本'
);

const legacy =
  fs.readFileSync(
    path.join(
      ROOT,
      'tests/operationsScheduleV087.test.js'
    ),
    'utf8'
  );

assert.ok(
  !legacy.includes(
    "'营业时间 / 员工排班'"
  ),
  'V0.8.7回归测试不能再绑定按钮完整文案'
);

const staffScene =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/staffScene.js'
    ),
    'utf8'
  );

assert.ok(
  /switchTo\(\s*'schedule'/.test(
    staffScene
  ),
  '招聘页面必须保留真实可执行的排班导航'
);

assert.ok(
  /\/switchTo\\\(\\s\*'schedule'\//.test(
    legacy
  ),
  'V0.8.7回归测试必须验证真实导航，而不是按钮文案'
);

const runner =
  fs.readFileSync(
    path.join(
      ROOT,
      'scripts/run-ci-tests-v060.js'
    ),
    'utf8'
  );

assert.ok(
  runner.includes(
    'tests/staffCareerV088.test.js'
  ) &&
  runner.includes(
    'tests/updateInfrastructureV088.test.js'
  ),
  '永久CI必须包含V0.8.8员工系统和更新基础设施测试'
);

assert.ok(
  !fs.existsSync(
    path.join(
      ROOT,
      'scripts/apply-v088-staff-career.js'
    )
  ),
  '正式树必须删除apply-v安装脚本'
);

console.log(
  'V0.8.8 update infrastructure tests passed'
);
