import setupStore from 'dummy/tests/helpers/store';
import DS from 'ember-data';

import {module, test} from 'qunit';

var env, adapter;

module("unit/adapters/build-url-mixin/path-for-type - DS.BuildURLMixin#pathForType", {
  beforeEach() {

    // test for overriden pathForType methods which return null path values
    var customPathForType = {
      pathForType(type) {
        if (type === 'rootModel') { return ''; }
        return this._super(type);
      }
    };

    var Adapter = DS.Adapter.extend(DS.BuildURLMixin, customPathForType);

    env = setupStore({
      adapter: Adapter
    });

    adapter = env.adapter;
  }
});

test('pathForType - works with camelized types', function(assert) {
  assert.equal(adapter.pathForType('superUser'), "superUsers");
});

test('pathForType - works with dasherized types', function(assert) {
  assert.equal(adapter.pathForType('super-user'), "superUsers");
});

test('pathForType - works with underscored types', function(assert) {
  assert.equal(adapter.pathForType('super_user'), "superUsers");
});
