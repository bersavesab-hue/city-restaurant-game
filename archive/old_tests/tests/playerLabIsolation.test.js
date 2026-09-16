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

function read(relative) {
  const file =
    path.join(
      ROOT,
      relative
    );

  return fs.existsSync(
    file
  )
    ? fs.readFileSync(
        file,
        'utf8'
      )
    : '';
}

const main =
  read(
    'src/main.js'
  );

const entry =
  read(
    'android/entry.js'
  );

assert.ok(
  !main.includes(
    'simulator/'
  ),
  '正式游戏main.js不得引用simulator'
);

assert.ok(
  !entry.includes(
    'simulator/'
  ),
  'Android入口不得引用simulator'
);

assert.ok(
  fs.existsSync(
    path.join(
      ROOT,
      'simulator/run100.js'
    )
  ),
  '玩家实验室项目必须存在'
);

console.log(
  'player lab isolation tests passed'
);
