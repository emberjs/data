import { module } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model from '@ember-data/model';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';

module('Deprecations', function (hooks) {
  setupTest(hooks);

  deprecatedTest(
    `Calling on natively extended class`,
    { id: 'ember-data:deprecate-model-reopenclass', until: '5.0', count: 1 },
    function (assert) {
      class Post extends Model {}
      Post.reopenClass({});
      assert.ok(true);
    }
  );

  deprecatedTest(
    `Calling on classic extended class`,
    { id: 'ember-data:deprecate-model-reopenclass', until: '5.0', count: 1 },
    function (assert) {
      const Post = Model.extend();
      Post.reopenClass({});
      assert.ok(true);
    }
  );
});
