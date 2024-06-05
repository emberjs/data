import { camelize, capitalize, dasherize, underscore } from '@ember-data/request-utils/string';
import { module, test } from '@warp-drive/diagnostic';
import type { Diagnostic } from '@warp-drive/diagnostic/-types';

const createTestFunction = (assert: Diagnostic, fn: (v: string) => string) => {
  return (given: string, expected: string, description: string) => {
    assert.equal(fn(given), expected, description);
  };
};

module('String Utils', function () {
  test('camelize tests', function (assert) {
    const expect = createTestFunction(assert, camelize);

    expect('my favorite items', 'myFavoriteItems', 'camelize normal string');
    expect('I Love Ramen', 'iLoveRamen', 'camelize capitalized string');
    expect('css-class-name', 'cssClassName', 'camelize dasherized string');
    expect('action_name', 'actionName', 'camelize underscored string');
    expect('action.name', 'actionName', 'camelize dot notation string');
    expect('innerHTML', 'innerHTML', 'does nothing with camelcased string');
    expect('PrivateDocs/OwnerInvoice', 'privateDocs/ownerInvoice', 'camelize namespaced classified string');
    expect('private_docs/owner_invoice', 'privateDocs/ownerInvoice', 'camelize namespaced underscored string');
    expect('private-docs/owner-invoice', 'privateDocs/ownerInvoice', 'camelize namespaced dasherized string');
  });

  test('capitalize tests', function (assert) {
    const expect = createTestFunction(assert, capitalize);

    expect('my favorite items', 'My favorite items', 'capitalize normal string');
    expect('css-class-name', 'Css-class-name', 'capitalize dasherized string');
    expect('action_name', 'Action_name', 'capitalize underscored string');
    expect('innerHTML', 'InnerHTML', 'capitalize camelcased string');
    expect('Capitalized string', 'Capitalized string', 'does nothing with capitalized string');
    expect('privateDocs/ownerInvoice', 'PrivateDocs/OwnerInvoice', 'capitalize namespaced camelized string');
    expect('private_docs/owner_invoice', 'Private_docs/Owner_invoice', 'capitalize namespaced underscored string');
    expect('private-docs/owner-invoice', 'Private-docs/Owner-invoice', 'capitalize namespaced dasherized string');
    expect('šabc', 'Šabc', 'capitalize string with accent character');
  });

  test('dasherize tests', function (assert) {
    const expect = createTestFunction(assert, dasherize);

    expect('my favorite items', 'my-favorite-items', 'dasherize normal string');
    expect('css-class-name', 'css-class-name', 'does nothing with dasherized string');
    expect('action_name', 'action-name', 'dasherize underscored string');
    expect('innerHTML', 'inner-html', 'dasherize camelcased string');
    expect('toString', 'to-string', 'dasherize string that is the property name of Object.prototype');
    expect('PrivateDocs/OwnerInvoice', 'private-docs/owner-invoice', 'dasherize namespaced classified string');
    expect('privateDocs/ownerInvoice', 'private-docs/owner-invoice', 'dasherize namespaced camelized string');
    expect('private_docs/owner_invoice', 'private-docs/owner-invoice', 'dasherize namespaced underscored string');
  });

  test('underscore tests', function (assert) {
    const expect = createTestFunction(assert, underscore);

    expect('my favorite items', 'my_favorite_items', 'with normal string');
    expect('css-class-name', 'css_class_name', 'with dasherized string');
    expect('action_name', 'action_name', 'does nothing with underscored string');
    expect('innerHTML', 'inner_html', 'with camelcased string');
    expect('PrivateDocs/OwnerInvoice', 'private_docs/owner_invoice', 'underscore namespaced classified string');
    expect('privateDocs/ownerInvoice', 'private_docs/owner_invoice', 'underscore namespaced camelized string');
    expect('private-docs/owner-invoice', 'private_docs/owner_invoice', 'underscore namespaced dasherized string');
  });
});
