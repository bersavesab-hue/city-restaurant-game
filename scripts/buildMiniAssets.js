'use strict';

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const manifest =
  JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        'assets/runtime-manifest.json'
      ),
      'utf8'
    )
  );

const OUTPUT =
  path.join(
    ROOT,
    'build/minigame-assets'
  );

function ensureDir(dir) {
  fs.mkdirSync(
    dir,
    {
      recursive: true
    }
  );
}

function removeDir(dir) {
  fs.rmSync(
    dir,
    {
      recursive: true,
      force: true
    }
  );
}

function copyOne(
  relativePath,
  targetRoot
) {
  const src =
    path.join(
      ROOT,
      relativePath
    );

  if (
    !fs.existsSync(
      src
    )
  ) {
    throw new Error(
      '缺少资源：' +
      relativePath
    );
  }

  const dest =
    path.join(
      targetRoot,
      relativePath
    );

  ensureDir(
    path.dirname(
      dest
    )
  );

  fs.copyFileSync(
    src,
    dest
  );

  return fs.statSync(
    src
  ).size;
}

function copyList(
  list,
  targetRoot
) {
  let total = 0;

  for (
    const item of
    list
  ) {
    total +=
      copyOne(
        item,
        targetRoot
      );
  }

  return total;
}

function mb(bytes) {
  return (
    bytes /
    1024 /
    1024
  ).toFixed(2);
}

removeDir(
  OUTPUT
);

const mainDir =
  path.join(
    OUTPUT,
    'main'
  );

const mainBytes =
  copyList(
    manifest.core,
    mainDir
  );

if (
  mainBytes >
  manifest
    .budgets
    .mainAssetsBytes
) {
  throw new Error(
    '主包资源超预算：' +
    mb(mainBytes) +
    'MB'
  );
}

const modules = {};

for (
  const [
    name,
    files
  ] of
  Object.entries(
    manifest.modules
  )
) {
  const dir =
    path.join(
      OUTPUT,
      'subpackages',
      name
    );

  const bytes =
    copyList(
      files,
      dir
    );

  if (
    bytes >
    manifest
      .budgets
      .subpackageBytes
  ) {
    throw new Error(
      '分包 ' +
      name +
      ' 超预算：' +
      mb(bytes) +
      'MB'
    );
  }

  modules[name] =
    bytes;
}

const report = {
  mainBytes,
  mainMB:
    mb(mainBytes),

  modules:
    Object.fromEntries(
      Object.entries(
        modules
      ).map(
        ([name, bytes]) => [
          name,
          {
            bytes,
            mb:
              mb(bytes)
          }
        ]
      )
    )
};

ensureDir(
  OUTPUT
);

fs.writeFileSync(
  path.join(
    OUTPUT,
    'asset-report.json'
  ),
  JSON.stringify(
    report,
    null,
    2
  )
);

console.log(
  'Mini-game runtime assets prepared:',
  JSON.stringify(
    report
  )
);
