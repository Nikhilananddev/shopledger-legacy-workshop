'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var pricing = require('../lib/pricing');
var invoice = require('../lib/invoice');
var reports = require('../lib/reports');

test('invoice totals and GST match the amount computed for the customer', function () {
  var items = [{ id: 20, name: 'Toor Dal', sku: 'DAL-1', hsn: '0713', price: 165, qty: 1 }];
  var billed = pricing.computeTotals(items, '');
  var invoiceFigures = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.equal(invoiceFigures.tax, billed.tax);
  assert.equal(invoiceFigures.cgst, billed.cgst);
  assert.equal(invoiceFigures.sgst, billed.sgst);
  assert.equal(invoiceFigures.total, billed.total);
  assert.equal(invoiceFigures.rows[0].gstPercent, billed.lines[0].gstPercent);
});

test('invoice matches checkout totals, GST and HSN rates across the eight audited orders', function () {
  var auditedOrders = [
    { id: 1001, coupon: '', subtotal: 610, discount: 0, tax: 66.9, total: 676.9, items: [
      { name: 'Assam CTC Masala Chai 250g', hsn: '0902', price: 140, qty: 2 },
      { name: 'Unpolished Toor Dal 1kg', hsn: '0713', price: 165, qty: 2 }
    ], rates: [18, 5] },
    { id: 1002, coupon: 'SAVE10', subtotal: 1020, discount: 102, tax: 45.9, total: 963.9, items: [
      { name: 'Indrayani Basmati Rice 5kg', hsn: '1006', price: 640, qty: 1 },
      { name: 'Cold-Pressed Sunflower Oil 1L', hsn: '1512', price: 190, qty: 2 }
    ], rates: [5, 5] },
    { id: 1003, coupon: 'FLAT50', subtotal: 400, discount: 50, tax: 49.35, total: 399.35, items: [
      { name: 'Pasteurized Table Butter 500g', hsn: '0405', price: 260, qty: 1 },
      { name: 'Assam CTC Masala Chai 250g', hsn: '0902', price: 140, qty: 1 }
    ], rates: [12, 18] },
    { id: 1004, coupon: 'SAVE10', subtotal: 2240, discount: 150, tax: 104.5, total: 2194.5, items: [
      { name: 'Cold-Pressed Groundnut Oil 5L', hsn: '1508', price: 1120, qty: 2 }
    ], rates: [5] },
    { id: 1005, coupon: 'FLAT50', subtotal: 1000, discount: 50, tax: 91.96, total: 1041.96, items: [
      { name: 'Indrayani Basmati Rice 5kg', hsn: '1006', price: 640, qty: 1 },
      { name: 'Kokum Sherbet Concentrate 750ml', hsn: '2106', price: 180, qty: 2 }
    ], rates: [5, 18] },
    { id: 1006, coupon: 'WELCOME', subtotal: 1210, discount: 60.5, tax: 155.61, total: 1305.11, items: [
      { name: 'A2 Gir Cow Ghee 500ml', hsn: '0405', price: 450, qty: 2 },
      { name: 'Filter Coffee Decoction Blend 500g', hsn: '0901', price: 310, qty: 1 }
    ], rates: [12, 18] },
    { id: 1007, coupon: '', subtotal: 1280, discount: 0, tax: 127, total: 1407, items: [
      { name: 'A2 Gir Cow Ghee 500ml', hsn: '0405', price: 450, qty: 2 },
      { name: 'Cold-Pressed Sunflower Oil 1L', hsn: '1512', price: 190, qty: 2 }
    ], rates: [12, 5] },
    { id: 1008, coupon: '', subtotal: 500, discount: 0, tax: 90, total: 590, items: [
      { name: 'Assam CTC Masala Chai 250g', hsn: '0902', price: 140, qty: 1 },
      { name: 'Kokum Sherbet Concentrate 750ml', hsn: '2106', price: 180, qty: 2 }
    ], rates: [18, 18] }
  ];

  auditedOrders.forEach(function (order) {
    var figures = invoice.computeInvoiceFigures(order);
    var rendered = invoice.render(order);

    assert.equal(figures.subtotal, order.subtotal, 'order #' + order.id + ' subtotal');
    assert.equal(figures.discount, order.discount, 'order #' + order.id + ' discount');
    assert.equal(figures.tax, order.tax, 'order #' + order.id + ' GST');
    assert.equal(figures.total, order.total, 'order #' + order.id + ' total');
    assert.deepEqual(figures.rows.map(function (row) { return row.gstPercent; }), order.rates, 'order #' + order.id + ' HSN rates');
    assert.ok(rendered.includes('₹' + order.total.toFixed(2)), 'order #' + order.id + ' printed total');
    assert.equal(rendered.includes('Accountant Reconciliation Notice'), false, 'order #' + order.id + ' has no mismatch notice');
  });
});

test('invoice uses the order HSN GST slab when gstRate is absent', function () {
  var items = [{ id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 100, qty: 1 }];
  var orderTotals = pricing.computeTotals(items, '');
  var invoiceFigures = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.equal(orderTotals.tax, 5);
  assert.equal(orderTotals.total, 105);
  assert.equal(invoiceFigures.rows[0].gstPercent, 5);
  assert.equal(invoiceFigures.tax, 5);
  assert.equal(invoiceFigures.total, 105);
});

test('invoice and order pricing interpret decimal gstRate consistently', function () {
  var figures = invoice.computeInvoiceFigures({
    items: [{ name: 'Rice', hsn: '1006', gstRate: 0.05, price: 100, qty: 1 }],
    coupon: ''
  });

  assert.equal(figures.rows[0].gstPercent, 5);
  assert.equal(figures.tax, 5);
  assert.equal(figures.total, 105);
});

test('invoice applies the same percent coupon discount and GST calculation as order pricing', function () {
  var items = [{ id: 2, name: 'Rice', sku: 'RICE-2', hsn: '1006', price: 1000, qty: 1 }];
  var orderTotals = pricing.computeTotals(items, 'SAVE10');
  var invoiceFigures = invoice.computeInvoiceFigures({ items: items, coupon: 'SAVE10' });

  assert.equal(orderTotals.subtotal, 1000);
  assert.equal(orderTotals.discount, 100);
  assert.equal(orderTotals.tax, 45);
  assert.equal(orderTotals.total, 945);

  assert.equal(invoiceFigures.discount, 100);
  assert.equal(invoiceFigures.tax, 45);
  assert.equal(invoiceFigures.total, 945);
});

test('invoice applies the flat coupon minimum subtotal rule used by order pricing', function () {
  var figures = invoice.computeInvoiceFigures({
    items: [{ name: 'Tea', hsn: '0902', price: 100, qty: 1 }],
    coupon: 'FLAT50'
  });

  assert.equal(figures.subtotal, 100);
  assert.equal(figures.discount, 0);
  assert.equal(figures.total, 118);
});

test('reconciliation reports matching invoice totals and GST for an order priced by HSN', function () {
  var db = {
    orders: [
      {
        id: 10,
        date: '21/11/2026',
        customer: 'Walk-in',
        items: [{ name: 'Rice', hsn: '1006', price: 100, qty: 1 }],
        coupon: '',
        subtotal: 100,
        discount: 0,
        tax: 5,
        total: 105,
        status: 'completed'
      },
      {
        id: 11,
        date: '21/11/2026',
        items: [{ name: 'Rice', hsn: '1006', price: 100, qty: 1 }],
        coupon: '',
        subtotal: 100,
        discount: 0,
        tax: 18,
        total: 118,
        status: 'cancelled'
      }
    ]
  };

  var result = reports.getGstReconciliation(db);

  assert.equal(result.totalChecked, 1);
  assert.equal(result.mismatchCount, 0);
  assert.equal(result.totalDelta, 0);
  assert.deepEqual(result.rows[0], {
    orderId: 10,
    date: '21/11/2026',
    customer: 'Walk-in',
    coupon: '',
    ledgerSubtotal: 100,
    ledgerDiscount: 0,
    ledgerTax: 5,
    ledgerTotal: 105,
    invoiceDiscount: 0,
    invoiceTax: 5,
    invoiceTotal: 105,
    delta: 0,
    matched: true
  });
});

test('CURRENT BEHAVIOUR: reconciliation passes when stored totals match invoice fallback calculations', function () {
  var db = {
    orders: [{
      id: 12,
      date: '21/11/2026',
      items: [{ name: 'Tea', price: 100, qty: 1 }],
      coupon: '',
      subtotal: 100,
      discount: 0,
      tax: 18,
      total: 118,
      status: 'completed'
    }]
  };

  var result = reports.getGstReconciliation(db);

  assert.equal(result.mismatchCount, 0);
  assert.equal(result.totalDelta, 0);
  assert.equal(result.rows[0].matched, true);
});
