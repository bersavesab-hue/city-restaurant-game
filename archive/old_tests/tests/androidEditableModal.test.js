'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const entry =
  fs.readFileSync(
    path.resolve(
      __dirname,
      '../android/entry.js'
    ),
    'utf8'
  );

assert.ok(
  entry.includes(
    'showModal(options)'
  ),
  'Android API 必须提供 showModal'
);

assert.ok(
  entry.includes(
    'opts.editable'
  ),
  'showModal 必须支持 editable 输入'
);

assert.ok(
  entry.includes(
    'input.focus()'
  ),
  '输入弹窗必须能主动呼起键盘'
);

assert.ok(
  entry.includes(
    'content: value'
  ),
  '确认后必须把输入值回传给 textInput'
);

console.log(
  'android editable modal bridge tests passed'
);
