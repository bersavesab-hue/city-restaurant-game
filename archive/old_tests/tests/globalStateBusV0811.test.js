'use strict';

const assert = require('assert');
const busModule = require('../src/core/globalStateBusV0811.js');

const bus = busModule.createBus({ historyLimit: 32 });

assert.equal(bus.VERSION, '0.8.11');
assert.equal(bus.HISTORY_LIMIT, 32);

const exact = [];
const wildcard = [];
let onceCount = 0;

bus.on('player.cash.changed', event => exact.push(event.type));
bus.on('player.*', event => wildcard.push(event.type));
bus.once('player.cash.changed', () => { onceCount++; });

bus.emit('player.cash.changed', { value: 100 });
bus.emit('player.cash.changed', { value: 120 });

assert.equal(exact.length, 2, 'exact listener should receive both events');
assert.equal(wildcard.length, 2, 'prefix wildcard should receive both events');
assert.equal(onceCount, 1, 'once listener must fire exactly once');

let resilientCount = 0;
bus.on('safe.event', () => { throw new Error('listener boom'); });
bus.on('safe.event', () => { resilientCount++; });
assert.doesNotThrow(() => bus.emit('safe.event', { ok: true }));
assert.equal(resilientCount, 1, 'one failing listener must not block others');
assert.equal(bus.diagnose().listenerErrors.length, 1, 'listener error should be recorded');

const state = { cash: 10, nested: { value: 1 } };
bus.registerDomain('player', () => state);
assert.equal(bus.syncDomain('player', 'initial', true), true);
const firstRevision = bus.getDomainRevision('player');
assert.ok(firstRevision >= 1);
assert.equal(bus.syncDomain('player', 'no-change'), false, 'unchanged domain should not create revision');
state.cash = 20;
assert.equal(bus.syncDomain('player', 'cash-change'), true);
assert.equal(bus.getDomainRevision('player'), firstRevision + 1);
assert.equal(bus.getDomainSnapshot('player').cash, 20);

const order = [];
bus.on('tx.*', event => order.push(event.type));
bus.on('transaction.committed', event => order.push(event.type));

bus.transaction('batch-test', () => {
  bus.emit('tx.first', { index: 1 });
  bus.emit('tx.second', { index: 2 });
});

assert.deepEqual(
  order.slice(-3),
  ['tx.first', 'tx.second', 'transaction.committed'],
  'transaction events must flush in order and finish with commit event'
);

for (let i = 0; i < 60; i++) {
  bus.emit('history.test', { i });
}
assert.ok(bus.getHistory().length <= 32, 'history must respect configured cap');

const historyCopy = bus.getHistory();
if (historyCopy.length) {
  historyCopy[0].payload = { changed: true };
  assert.notDeepEqual(historyCopy[0].payload, bus.getHistory()[0].payload, 'history must be returned as copy');
}

console.log('V0.8.11 global state bus tests passed');
