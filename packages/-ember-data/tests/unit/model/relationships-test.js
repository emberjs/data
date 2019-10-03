import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import Model from '@ember-data/model';
import { hasMany, belongsTo } from '@ember-data/model';
import { get } from '@ember/object';
import { gte } from 'ember-compatibility-helpers';

class Person extends Model {
  @hasMany('occupation', { async: false }) occupations;
  @hasMany('person', { inverse: 'parent', async: false }) people;
  @belongsTo('person', { inverse: 'people', async: false }) parent;
}

class UserProfile extends Model {
  @belongsTo() user;
}

class User extends Model {
  @belongsTo() userProfile;
}

class Occupation extends Model {}

module('[@ember-data/model] unit - relationships', function(hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function() {
    let { owner } = this;

    owner.register('model:occupation', Occupation);
    owner.register('model:person', Person);
    owner.register('model:user-profile', UserProfile);
    owner.register('model:user', User);

    store = owner.lookup('service:store');
  });

  test('exposes a hash of the relationships on a model', function(assert) {
    let Person = store.modelFor('person');

    let relationships = get(Person, 'relationships');
    function extractDetails(key) {
      let descs = relationships.get(key);

      return descs.map(desc => {
        return {
          kind: desc.kind,
          name: desc.name,
          options: desc.options,
        };
      });
    }

    assert.deepEqual(
      extractDetails('person'),
      [
        { name: 'people', kind: 'hasMany', options: { async: false, inverse: 'parent' } },
        { name: 'parent', kind: 'belongsTo', options: { async: false, inverse: 'people' } },
      ],
      'person relationships contains the expected meta information'
    );
    assert.deepEqual(
      extractDetails('occupation'),
      [{ name: 'occupations', kind: 'hasMany', options: { async: false } }],
      'occupation relationships contains the expected meta information'
    );
  });

  test('relationshipNames a hash of the relationships on a model with type as a key', function(assert) {
    assert.deepEqual(
      get(Person, 'relationshipNames'),
      {
        hasMany: ['occupations', 'people'],
        belongsTo: ['parent'],
      },
      'relationshipNames hash contains the expected relationship types as keys'
    );
  });

  test('eachRelatedType() iterates over relations without duplication', function(assert) {
    let relations = [];

    Person.eachRelatedType(modelName => relations.push(modelName));

    assert.deepEqual(relations, ['occupation', 'person'], 'eachRelatedType() did not return duplicate modelNames');
  });

  test('normalizing belongsTo relationship names', function(assert) {
    let User = store.modelFor('user');

    const relationships = get(User, 'relationships');

    assert.ok(relationships.has('user-profile'), 'relationship key has been normalized');

    const relationship = relationships.get('user-profile')[0];

    assert.equal(relationship.meta.name, 'userProfile', 'relationship name has not been changed');
  });

  test('normalizing hasMany relationship names', function(assert) {
    let store;
    let { owner } = this;

    class StreamItem extends Model {
      @belongsTo() user;
    }

    class User extends Model {
      @hasMany() streamItems;
    }

    owner.unregister('model:user');
    owner.register('model:stream-item', StreamItem);
    owner.register('model:user', User);

    store = owner.lookup('service:store');

    let user = store.modelFor('user');

    const relationships = get(user, 'relationships');

    assert.ok(relationships.has('stream-item'), 'relationship key has been normalized');

    const relationship = relationships.get('stream-item')[0];

    assert.equal(relationship.meta.name, 'streamItems', 'relationship name has not been changed');
  });

  if (gte('3.10.0')) {
    test('decorators works without parens', function(assert) {
      let store;
      let { owner } = this;

      class StreamItem extends Model {
        @belongsTo user;
      }

      class User extends Model {
        @hasMany streamItems;
      }

      owner.unregister('model:user');
      owner.register('model:stream-item', StreamItem);
      owner.register('model:user', User);

      store = owner.lookup('service:store');

      let user = store.modelFor('user');

      const relationships = get(user, 'relationships');

      assert.ok(relationships.has('stream-item'), 'relationship key has been normalized');

      const relationship = relationships.get('stream-item')[0];

      assert.equal(relationship.meta.name, 'streamItems', 'relationship name has not been changed');
    });
  }
});
