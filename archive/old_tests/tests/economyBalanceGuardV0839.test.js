'use strict';

const assert =
  require('assert');

const moduleUnderTest =
  require('../src/core/economyBalanceGuardV0839.js');

const data = {
  player:{
    cash:18000
  },
  business:{
    currentShopId:'shop_1',
    shops:[
      {
        id:'shop_1',
        status:'trial_opening',
        monthlyRent:12000
      }
    ],
    openingPrep:{
      staffing:{
        shop_1:{
          hired:[
            {
              wage:6000
            },
            {
              wage:4500
            },
            {
              wage:4500
            }
          ]
        }
      }
    }
  }
};

const guard =
  moduleUnderTest
    .createGuard({
      gameState:{
        getPlayer() {
          return data.player;
        },
        getBusiness() {
          return data.business;
        }
      },
      businessLifecycle:{
        deriveStage() {
          return 'trial_opening';
        },
        getLoanSummary() {
          return {
            status:'active',
            outstanding:50000,
            monthlyPayment:3500
          };
        }
      },
      openingFinance:{
        getOffer() {
          return {
            available:true,
            creditLimit:80000
          };
        }
      },
      completeFinance:{
        snapshot() {
          return {
            profitLoss:{
              revenue:0,
              expenses:0
            }
          };
        }
      }
    });

const burn =
  guard
    .monthlyBurn(
      'shop_1'
    );

assert.equal(
  burn.rent,
  12000
);

assert.equal(
  burn.payroll,
  15000
);

assert.equal(
  burn.fixed,
  27000
);

const reserve =
  guard
    .reserveTarget(
      'shop_1'
    );

assert.ok(
  reserve >=
  20000
);

let assessment =
  guard.assessSpend(
    'shop_1',
    40000,
    'marketing'
  );

assert.equal(
  assessment.allowed,
  false
);

assert.equal(
  assessment.code,
  'INSUFFICIENT_CASH'
);

assessment =
  guard.assessSpend(
    'shop_1',
    12000,
    'marketing'
  );

assert.ok(
  assessment.allowed
);

assert.ok(
  [
    'warning',
    'critical_warning',
    'normal'
  ].includes(
    assessment.severity
  )
);

const view =
  guard.snapshot(
    'shop_1'
  );

assert.equal(
  view.version,
  '0.8.39'
);

assert.ok(
  view.tensionScore >=
  0
);

assert.ok(
  view.tensionScore <=
  100
);

assert.ok(
  view.recovery.some(
    item =>
      item.id ===
      'opening_credit'
  )
);

const diag =
  guard.diagnose(
    'shop_1'
  );

assert.ok(diag.ok);

console.log(
  'V0.8.39 economy balance guard tests passed'
);
