import setupStore from 'dummy/tests/helpers/store';
import DS from 'ember-data';
import Ember from 'ember';

import {module, test} from 'qunit';

let env, adapter;
let { run } = Ember;

module("unit/adapters/build-url-mixin/path-for-type - DS.BuildURLMixin#pathForType", {
  beforeEach() {

    // test for overriden pathForType methods which return null path values
    let customPathForType = {
      pathForType(type) {
        if (type === 'rootModel') { return ''; }
        return this._super(type);
      }
    };

    let Adapter = DS.Adapter.extend(DS.BuildURLMixin, customPathForType);

    env = setupStore({
      adapter: Adapter
    });

    adapter = env.adapter;
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

test('pathForType - works with camelized types', function(assert) {
  assert.equal(adapter.pathForType('superUser'), 'superUsers');
});

test('pathForType - works with dasherized types', function(assert) {
  assert.equal(adapter.pathForType('super-user'), 'superUsers');
});

test('pathForType - works with underscored types', function(assert) {
  assert.equal(adapter.pathForType('super_user'), 'superUsers');
});
