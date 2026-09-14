'use strict';

const fs =
  require('fs');

const path =
  require('path');

const cp =
  require('child_process');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const ZIP =
  path.join(
    ROOT,
    'update.zip'
  );

if (
  !fs.existsSync(
    ZIP
  )
) {
  console.log(
    '[PATCH SAFETY] 普通测试模式：没有update.zip，跳过补丁内容检查'
  );
  process.exit(0);
}

const result =
  cp.spawnSync(
    'unzip',
    [
      '-Z1',
      ZIP
    ],
    {
      cwd:
        ROOT,
      encoding:
        'utf8'
    }
  );

if (
  result.status !==
  0
) {
  console.error(
    '[PATCH SAFETY] 无法读取update.zip目录'
  );
  process.exit(1);
}

const entries =
  String(
    result.stdout ||
    ''
  )
    .split(/\r?\n/)
    .map(
      row =>
        row.trim()
    )
    .filter(Boolean);

const forbidden =
  entries.filter(
    row =>
      row ===
        '.github/workflows' ||
      row.startsWith(
        '.github/workflows/'
      )
  );

if (
  forbidden.length >
  0
) {
  console.error(
    '[PATCH SAFETY] 补丁包含GitHub Workflow文件，当前自动提交令牌没有workflows权限。'
  );
  console.error(
    '[PATCH SAFETY] 请把这些文件从update.zip移除：'
  );

  for (
    const file
    of forbidden
  ) {
    console.error(
      ' - ' +
      file
    );
  }

  process.exit(1);
}

console.log(
  '[PATCH SAFETY] update.zip路径检查通过'
);
