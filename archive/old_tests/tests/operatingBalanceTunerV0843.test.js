'use strict';
const assert=require('assert');
const tuner=require('../src/balance/operatingBalanceTunerV0843.js');

const assessed=tuner.assessDay({
  revenue:10000,foodCost:3100,labor:2500,rent:1200,profit:1200,foodCostRate:31,profitRate:12
},{tensionScore:60});
assert.equal(assessed.version,'0.8.43');
assert.equal(assessed.bands.foodCostRate,'healthy');
assert.equal(assessed.bands.laborRate,'healthy');
assert.equal(assessed.bands.rentRate,'healthy');
assert.equal(assessed.bands.profitRate,'healthy');

const calibration=tuner.calibrate(100,{seed:20260915});
assert.equal(calibration.total,100);
assert.ok(calibration.pass,JSON.stringify({
  deadlockRate:calibration.deadlockRate,
  tooEasyRate:calibration.tooEasyRate,
  balancedRate:calibration.balancedRate
}));
assert.ok(calibration.rows.every(x=>Number.isFinite(x.financial.profit)));
console.log('V0.8.43 operating balance tuner tests passed');
