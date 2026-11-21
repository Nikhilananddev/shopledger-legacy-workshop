'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var orders = require('../lib/orders');
var ledger = require('../lib/ledger');

test('order history sorts DD/MM/YYYY dates newest first and filters by date range', function () {
  var db = {
    orders: [
      { id: 1004, date: '30/01/2022' },
      { id: 1001, date: '28/12/2021' },
      { id: 1008, date: '15/03/2022' },
      { id: 1009, date: '15/03/2022' }
    ]
  };

  assert.deepEqual(orders.list(db, {}).map(function (o) { return o.id; }), [1009, 1008, 1004, 1001]);
  assert.deepEqual(orders.list(db, { from: '2022-01-01', to: '2022-02-01' }).map(function (o) { return o.id; }), [1004]);
});

test('recording a string settlement amount updates customer totals numerically', function () {
  var db = {
    nextSettlementId: 501,
    customers: [{ id: 7, name: 'Meera Joshi', openingBalance: 0, totalBilled: 2432.01, totalSettled: 1200 }],
    settlements: []
  };

  var result = ledger.recordSettlement(db, 7, '500', 'upi');

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
  assert.equal(result.settlement.amount, 500);
});
