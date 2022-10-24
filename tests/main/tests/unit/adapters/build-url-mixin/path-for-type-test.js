import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Adapter, { BuildURLMixin } from '@ember-data/adapter';

module('unit/adapters/build-url-mixin/path-for-type - DS.BuildURLMixin#pathForType', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    // test for overriden pathForType methods which return null path values
    let customPathForType = {
      pathForType(type) {
        if (type === 'rootModel') {
          return '';
        }
        return this._super(type);
      },
    };

    this.owner.register('adapter:application', Adapter.extend(BuildURLMixin, customPathForType));
  });

  test('pathForType - works with camelized types', function (assert) {
    let adapter = this.owner.lookup('adapter:application');
    assert.strictEqual(adapter.pathForType('superUser'), 'superUsers');
  });

  test('pathForType - works with dasherized types', function (assert) {
    let adapter = this.owner.lookup('adapter:application');
    assert.strictEqual(adapter.pathForType('super-user'), 'superUsers');
  });

  test('pathForType - works with underscored types', function (assert) {
    let adapter = this.owner.lookup('adapter:application');
    assert.strictEqual(adapter.pathForType('super_user'), 'superUsers');
  });
});
