import { module } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model from '@ember-data/model';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';

module('Deprecations', function (hooks) {
  setupTest(hooks);

  const StaticModelMethods = [
    { name: 'typeForRelationship', count: 3 },
    { name: 'inverseFor', count: 5 },
    { name: '_findInverseFor', count: 3 },
    { name: 'eachRelationship', count: 3 },
    { name: 'eachRelatedType', count: 3 },
    { name: 'determineRelationshipType', count: 1 },
    { name: 'eachAttribute', count: 2 },
    { name: 'eachTransformedAttribute', count: 4 },
    { name: 'toString', count: 1 },
  ];
  const StaticModelGetters = [
    { name: 'inverseMap', count: 1 },
    { name: 'relationships', count: 3 },
    { name: 'relationshipNames', count: 1 },
    { name: 'relatedTypes', count: 2 },
    { name: 'relationshipsByName', count: 2 },
    { name: 'relationshipsObject', count: 1 },
    { name: 'fields', count: 1 },
    { name: 'attributes', count: 1 },
    { name: 'transformedAttributes', count: 3 },
  ];

  function checkDeprecationForProp(prop) {
    deprecatedTest(
      `Accessing static prop ${prop.name} is deprecated`,
      { id: 'ember-data:deprecate-early-static', until: '5.0', count: prop.count },
      function (assert) {
        class Post extends Model {}
        Post[prop.name];
        assert.ok(true);
      }
    );
  }
  function checkDeprecationForMethod(method) {
    deprecatedTest(
      `Accessing static method ${method.name} is deprecated`,
      { id: 'ember-data:deprecate-early-static', until: '5.0', count: method.count },
      function (assert) {
        class Post extends Model {}
        try {
          Post[method.name]();
        } catch {
          // do nothing
        }
        assert.ok(true);
      }
    );
  }

  StaticModelGetters.forEach(checkDeprecationForProp);
  StaticModelMethods.forEach(checkDeprecationForMethod);
});
