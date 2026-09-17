'use strict';

const assert =
  require('assert');

const moduleUnderTest =
  require('../src/core/featureAccessPolicyV0837.js');

let stage =
  'city_setup';

let shop =
  null;

const policy =
  moduleUnderTest
    .createPolicy({
      gameState:{
        getBusiness() {
          return {
            currentShopId:
              shop &&
              shop.id,
            shops:
              shop
                ? [shop]
                : []
          };
        }
      },
      newGameFlow:{
        getProgress() {
          return {
            stage
          };
        }
      },
      gameplayFlow:{
        currentShop() {
          return shop;
        },
        recommendedRoute() {
          if (
            stage ===
            'city_setup'
          ) {
            return {
              routeId:'newGame',
              params:{}
            };
          }

          return {
            routeId:
              shop
                ? 'shop'
                : 'city',
            params:
              shop
                ? {
                    shopId:
                      shop.id
                  }
                : {}
          };
        }
      }
    });

assert.ok(
  policy
    .evaluate(
      'newGame'
    )
    .allowed
);

assert.ok(
  policy
    .evaluate(
      'system'
    )
    .allowed
);

let blocked =
  policy
    .evaluate(
      'city'
    );

assert.equal(
  blocked.allowed,
  false
);

assert.equal(
  blocked.code,
  'CITY_SETUP_REQUIRED'
);

stage =
  'property_search';

assert.ok(
  policy
    .evaluate(
      'city'
    )
    .allowed
);

assert.ok(
  policy
    .evaluate(
      'district'
    )
    .allowed
);

blocked =
  policy
    .evaluate(
      'staff'
    );

assert.equal(
  blocked.allowed,
  false
);

assert.equal(
  blocked.code,
  'SHOP_REQUIRED'
);

shop = {
  id:'shop_1',
  status:'signed'
};

stage =
  'renovation';

for (
  const route
  of [
    'shop',
    'renovation',
    'equipment',
    'license',
    'staff'
  ]
) {
  assert.ok(
    policy
      .evaluate(
        route
      )
      .allowed,
    route
  );
}

for (
  const route
  of [
    'research',
    'supply',
    'schedule',
    'business',
    'staffCareer'
  ]
) {
  const result =
    policy
      .evaluate(
        route
      );

  assert.equal(
    result.allowed,
    false,
    route
  );

  assert.equal(
    result.code,
    'OPENING_FOCUS_REQUIRED',
    route
  );
}

stage =
  'trial';

for (
  const route
  of [
    'research',
    'supply',
    'schedule',
    'business'
  ]
) {
  assert.ok(
    policy
      .evaluate(
        route
      )
      .allowed,
    route
  );
}

assert.equal(
  policy
    .evaluate(
      'staffCareer'
    )
    .allowed,
  false
);

stage =
  'complete';

assert.ok(
  policy
    .evaluate(
      'staffCareer'
    )
    .allowed
);

stage =
  'renovation';

const diagnostic =
  policy
    .diagnose([
      {
        id:'city'
      },
      {
        id:'shop'
      },
      {
        id:'staffCareer'
      }
    ]);

assert.equal(
  diagnostic.available,
  2
);

assert.equal(
  diagnostic.blocked,
  1
);

console.log(
  'V0.8.37 feature access policy tests passed'
);
