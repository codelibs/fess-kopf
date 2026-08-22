/**
 * Tests for the Alert model
 * Errors must stay on screen long enough to be read, and must be
 * expanded when they carry a response body.
 */

const fs = require('fs');
const path = require('path');

const utilCode = fs.readFileSync(
  path.join(__dirname, '../src/kopf/util.js'),
  'utf8'
);
eval(utilCode);

const alertsCode = fs.readFileSync(
  path.join(__dirname, '../src/kopf/services/alerts.js'),
  'utf8'
);
// Only the Alert constructor is needed; the factory registration below it
// requires the global kopf module, so cut the file at the factory call.
const alertModel = alertsCode.split('kopf.factory')[0];
eval(alertModel);

describe('Alert', () => {
  test('should be expanded when it carries a response', () => {
    const alert = new Alert('boom', {error: 'x'}, 'error', 'alert-danger',
        'fa fa-warning');
    expect(alert.expanded).toBe(true);
  });

  test('should not be expanded without a response', () => {
    const alert = new Alert('boom', undefined, 'error', 'alert-danger',
        'fa fa-warning');
    expect(alert.expanded).toBe(false);
  });

  test('should not expand non-error alerts that carry a response', () => {
    const success = new Alert('saved', {acknowledged: true}, 'success',
        'alert-success', 'fa fa-check');
    expect(success.expanded).toBe(false);

    const warn = new Alert('slow', {took: 9000}, 'warn',
        'alert-warning', 'fa fa-info');
    expect(warn.expanded).toBe(false);
  });
});
