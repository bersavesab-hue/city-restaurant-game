'use strict';

const assert =
  require('assert');

const sceneManager =
  require('../src/ui/managers/sceneManager.js');

const router =
  require('../src/core/entryRouterV0810.js');

sceneManager.reset();
router.resetForTests();

function scene() {
  return {
    enter() {},
    exit() {}
  };
}

for (
  const id
  of [
    'city',
    'shop',
    'system',
    'featureHub',
    'newGame'
  ]
) {
  sceneManager.register(
    id,
    scene()
  );
}

assert.ok(
  router.install()
);

router.setGuard(
  routeId => {
    if (
      routeId ===
      'shop'
    ) {
      return {
        allowed:false,
        code:'SHOP_REQUIRED',
        reason:'测试阻止',
        recommended:{
          routeId:'city',
          params:{}
        }
      };
    }

    return {
      allowed:true
    };
  }
);

assert.ok(
  sceneManager.switchTo(
    'city'
  )
);

assert.equal(
  sceneManager.getCurrentId(),
  'city'
);

assert.equal(
  sceneManager.switchTo(
    'shop'
  ),
  false
);

assert.equal(
  sceneManager.getCurrentId(),
  'city'
);

const error =
  router.getLastError();

assert.equal(
  error.code,
  'ROUTE_BLOCKED'
);

assert.equal(
  error.routeId,
  'shop'
);

assert.equal(
  error.guardCode,
  'SHOP_REQUIRED'
);

const access =
  router.getGuardStatus(
    'shop',
    {}
  );

assert.equal(
  access.allowed,
  false
);

router.setGuard(null);

assert.ok(
  sceneManager.switchTo(
    'shop'
  )
);

assert.equal(
  sceneManager.getCurrentId(),
  'shop'
);

console.log(
  'V0.8.37 router guard integration tests passed'
);
