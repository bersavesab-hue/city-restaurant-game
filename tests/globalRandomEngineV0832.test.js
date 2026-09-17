'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const seedManager =
  require('../src/core/seedManagerV0813.js');

const random =
  require('../src/core/globalRandomEngineV0832.js');

gameState.reset();

seedManager.setMasterSeed(
  'global-random-v0832',
  {
    resetSimulation:false
  }
);

random.resetNamespace(
  'test_stream'
);

const first =
  random.next(
    'test_stream',
    'shop_a'
  );

const second =
  random.next(
    'test_stream',
    'shop_a'
  );

const save =
  gameState.exportSave();

const third =
  random.next(
    'test_stream',
    'shop_a'
  );

assert.notEqual(
  first,
  second
);

assert.notEqual(
  second,
  third
);

assert.ok(
  gameState.importSave(save)
);

const replayThird =
  random.next(
    'test_stream',
    'shop_a'
  );

assert.equal(
  replayThird,
  third,
  '存档恢复后命名随机流必须从相同位置继续'
);

const previewA =
  random.preview(
    'preview',
    'scope',
    5
  );

const previewB =
  random.preview(
    'preview',
    'scope',
    5
  );

assert.deepEqual(
  previewA,
  previewB,
  'preview不得推进持久随机流'
);

random.resetStream(
  'reset_test',
  'scope'
);

const resetFirst =
  random.int(
    'reset_test',
    'scope',
    1,
    100000
  );

random.int(
  'reset_test',
  'scope',
  1,
  100000
);

random.resetStream(
  'reset_test',
  'scope'
);

const resetFirstAgain =
  random.int(
    'reset_test',
    'scope',
    1,
    100000
  );

assert.equal(
  resetFirstAgain,
  resetFirst
);

const sample =
  random.sample(
    'sample',
    'scope',
    [
      1,2,3,4,5,
      6,7,8,9,10
    ],
    4
  );

assert.equal(sample.length,4);
assert.equal(new Set(sample).size,4);

const diag =
  random.diagnose();

assert.ok(diag.ok);
assert.equal(diag.version,'0.8.32');
assert.ok(diag.streamCount>=2);

console.log(
  'V0.8.32 global random engine tests passed'
);
