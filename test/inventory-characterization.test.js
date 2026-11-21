'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var inventory = require('../lib/inventory');
var orders = require('../lib/orders');

test('inventory check allows purchase of the exact remaining sellable quantity', function () {
  var products = [
    { id: 6, sku: 'DRY-001', name: 'A2 Gir Cow Ghee 500ml', stock: 1, reserved: 0 },
    { id: 11, sku: 'SPC-001', name: 'Byadgi Kashmiri Chilli Powder 500g', stock: 4, reserved: 3 }
  ];

  assert.deepEqual(inventory.check(products, [{ id: 6, qty: 1 }]), { ok: true });
  assert.deepEqual(inventory.check(products, [{ id: 11, qty: 1 }]), { ok: true });
  assert.equal(inventory.check(products, [{ id: 11, qty: 2 }]).ok, false);
});

test('cancelling a pending order restores its committed quantities to physical stock', function () {
  var db = {
    nextOrderId: 1008,
    products: [
      { id: 6, sku: 'DRY-001', stock: 0, reserved: 0 },
      { id: 4, sku: 'OIL-001', stock: 3, reserved: 1 }
    ],
    orders: [{
      id: 1007,
      status: 'pending',
      paymentMode: 'cash',
      items: [{ id: 6, qty: 2 }, { id: 4, qty: 2 }],
      total: 1407
    }]
  };

  var result = orders.cancel(db, 1007, 'Customer cancelled');

  assert.equal(result.ok, true);
  assert.equal(db.orders[0].status, 'cancelled');
  assert.equal(db.products[0].stock, 2);
  assert.equal(db.products[1].stock, 5);
  assert.equal(db.products[1].reserved, 1);
  assert.equal(orders.cancel(db, 1007).ok, false);
  assert.equal(db.products[0].stock, 2);
});
