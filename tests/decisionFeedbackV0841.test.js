'use strict';
const assert=require('assert');
const gameState=require('../src/core/gameState.js');
const feedback=require('../src/operations/decisionFeedbackV0841.js');

gameState.reset();
gameState.addShop({id:'shop_decision',status:'open'});

const d=feedback.record('shop_decision',3,'menu_price',{delta:2,menuItemId:'dish_1'},{
  day:3,cash:50000,revenue:500,profit:50,rating:4,memberCount:20,inventoryAlerts:2,staffCount:5,tensionScore:50
});
assert.ok(d.id);
const resolved=feedback.resolveDay('shop_decision',3,{
  day:4,cash:50600,revenue:900,profit:220,rating:4.1,memberCount:22,inventoryAlerts:1,staffCount:5,tensionScore:43
});
assert.equal(resolved.length,1);
assert.equal(resolved[0].status,'resolved');
assert.ok(Number.isFinite(resolved[0].impact.score));
assert.ok(resolved[0].impact.explanation.length>0);

const view=feedback.overview('shop_decision');
assert.equal(view.pending.length,0);
assert.equal(view.recent.length,1);
assert.equal(view.metrics.resolved,1);
console.log('V0.8.41 decision feedback tests passed');
