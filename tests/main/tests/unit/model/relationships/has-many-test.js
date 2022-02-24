import EmberObject, { get } from '@ember/object';
import { run } from '@ember/runloop';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import { hash, Promise as EmberPromise } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { LEGACY_SUPPORT, PromiseManyArray } from '@ember-data/model/-private';
import { DEPRECATE_ARRAY_LIKE } from '@ember-data/private-build-infra/deprecations';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { recordIdentifierFor } from '@ember-data/store';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';
import todo from '@ember-data/unpublished-test-infra/test-support/todo';

module('unit/model/relationships - hasMany', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('unloadRecord while iterating a hasMany is safe', function (assert) {
    class User extends Model {
      @attr name;
      @hasMany('user', { inverse: null, async: false }) friends;
    }
    const { owner } = this;
    owner.register('model:user', User);
    const store = owner.lookup('service:store');
    const chris = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: { name: 'Chris' },
        relationships: {
          friends: {
            data: [
              { type: 'user', id: '2' },
              { type: 'user', id: '3' },
              { type: 'user', id: '4' },
              { type: 'user', id: '5' },
            ],
          },
        },
      },
      included: [
        { type: 'user', id: '2', attributes: { name: 'William' } },
        { type: 'user', id: '3', attributes: { name: 'Michael' } },
        { type: 'user', id: '4', attributes: { name: 'Thomas' } },
        { type: 'user', id: '5', attributes: { name: 'John' } },
      ],
    });
    const james = store.createRecord('user', { name: 'James' });
    const jamesIdentifier = recordIdentifierFor(james);
    chris.friends.splice(1, 0, james);

    const expectedOrder = [
      store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' }),
      jamesIdentifier,
      store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '3' }),
      store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '4' }),
      store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '5' }),
    ];
    let expectedIndex = 0;

    assert.strictEqual(chris.friends.length, 5, 'we have 5 friends');
    chris.friends.forEach((friend, index) => {
      if (expectedIndex < 2) {
        assert.strictEqual(chris.friends.length, 5, `we have the right length BEFORE iteration ${expectedIndex + 1}`);
      } else if (expectedIndex < 4) {
        assert.strictEqual(chris.friends.length, 4, `we have the right length BEFORE iteration ${expectedIndex + 1}`);
      } else {
        assert.strictEqual(chris.friends.length, 3, `we have the right length BEFORE iteration ${expectedIndex + 1}`);
      }
      assert.strictEqual(index, expectedIndex, `We reached item ${expectedIndex + 1} of 5`);
      const identifier = friend && recordIdentifierFor(friend);
      assert.strictEqual(identifier, expectedOrder[expectedIndex], `We received the expected identifier`);
      if (expectedIndex === 1 || expectedIndex === 3) {
        friend.unloadRecord();
      }
      if (expectedIndex < 1) {
        assert.strictEqual(chris.friends.length, 5, `we have the right length AFTER iteration ${expectedIndex + 1}`);
      } else if (expectedIndex < 3) {
        assert.strictEqual(chris.friends.length, 4, `we have the right length AFTER iteration ${expectedIndex + 1}`);
      } else {
        assert.strictEqual(chris.friends.length, 3, `we have the right length AFTER iteration ${expectedIndex + 1}`);
      }
      expectedIndex++;
    });
    assert.strictEqual(expectedIndex, 5, 'we iterated the expected number of times');
    assert.strictEqual(chris.friends.length, 3, 'we have 3 friends');
  });

  test('rollbackAttributes while iterating a hasMany is safe', function (assert) {
    class User extends Model {
      @attr name;
      @hasMany('user', { inverse: null, async: false }) friends;
    }
    const { owner } = this;
    owner.register('model:user', User);
    const store = owner.lookup('service:store');
    const chris = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: { name: 'Chris' },
        relationships: {
          friends: {
            data: [
              { type: 'user', id: '2' },
              { type: 'user', id: '3' },
              { type: 'user', id: '4' },
              { type: 'user', id: '5' },
            ],
          },
        },
      },
      included: [
        { type: 'user', id: '2', attributes: { name: 'William' } },
        { type: 'user', id: '3', attributes: { name: 'Michael' } },
        { type: 'user', id: '4', attributes: { name: 'Thomas' } },
        { type: 'user', id: '5', attributes: { name: 'John' } },
      ],
    });
    const james = store.createRecord('user', { name: 'James' });
    const jamesIdentifier = recordIdentifierFor(james);
    chris.friends.splice(1, 0, james);

    const expectedOrder = [
      store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' }),
      jamesIdentifier,
      store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '3' }),
      store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '4' }),
      store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '5' }),
    ];
    let expectedIndex = 0;

    assert.strictEqual(chris.friends.length, 5, 'we have 5 friends');
    chris.friends.forEach((friend, index) => {
      if (expectedIndex < 2) {
        assert.strictEqual(chris.friends.length, 5, `we have the right length BEFORE iteration ${expectedIndex + 1}`);
      } else {
        assert.strictEqual(chris.friends.length, 4, `we have the right length BEFORE iteration ${expectedIndex + 1}`);
      }
      assert.strictEqual(index, expectedIndex, `We reached item ${expectedIndex + 1} of 5`);
      const identifier = friend && recordIdentifierFor(friend);
      assert.strictEqual(identifier, expectedOrder[expectedIndex], `We received the expected identifier`);
      if (expectedIndex === 1 || expectedIndex === 3) {
        friend.rollbackAttributes();
      }
      if (expectedIndex < 1) {
        assert.strictEqual(chris.friends.length, 5, `we have the right length AFTER iteration ${expectedIndex + 1}`);
      } else {
        assert.strictEqual(chris.friends.length, 4, `we have the right length AFTER iteration ${expectedIndex + 1}`);
      }
      expectedIndex++;
    });
    assert.strictEqual(expectedIndex, 5, 'we iterated the expected number of times');
    assert.strictEqual(chris.friends.length, 4, 'we have 4 friends');
  });

  test('hasMany handles pre-loaded relationships', function (assert) {
    assert.expect(13);

    const Tag = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: 'tags' }),
    });

    const Pet = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: 'pets' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tags: hasMany('tag', { async: false, inverse: 'person' }),
      pets: hasMany('pet', { async: false, inverse: 'person' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:pet', Pet);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      if (type === Tag && id === '12') {
        return { id: '12', name: 'oohlala' };
      } else {
        assert.ok(false, 'findRecord() should not be called with these values');
      }
    };
    adapter.shouldBackgroundReloadRecord = () => false;

    run(() => {
      store.push({
        data: [
          {
            type: 'tag',
            id: '5',
            attributes: {
              name: 'friendly',
            },
          },
          {
            type: 'tag',
            id: '2',
            attributes: {
              name: 'smarmy',
            },
          },
          {
            type: 'pet',
            id: '4',
            attributes: {
              name: 'fluffy',
            },
          },
          {
            type: 'pet',
            id: '7',
            attributes: {
              name: 'snowy',
            },
          },
          {
            type: 'pet',
            id: '12',
            attributes: {
              name: 'cerberus',
            },
          },
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Tom Dale',
            },
            relationships: {
              tags: {
                data: [{ type: 'tag', id: '5' }],
              },
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Yehuda Katz',
            },
            relationships: {
              tags: {
                data: [{ type: 'tag', id: '12' }],
              },
            },
          },
        ],
      });
    });

    return run(() => {
      return store
        .findRecord('person', 1)
        .then((person) => {
          assert.strictEqual(get(person, 'name'), 'Tom Dale', 'precond - retrieves person record from store');

          let tags = get(person, 'tags');
          assert.strictEqual(get(tags, 'length'), 1, 'the list of tags should have the correct length');
          assert.strictEqual(get(tags.at(0), 'name'), 'friendly', 'the first tag should be a Tag');

          run(() => {
            store.push({
              data: {
                type: 'person',
                id: '1',
                attributes: {
                  name: 'Tom Dale',
                },
                relationships: {
                  tags: {
                    data: [
                      { type: 'tag', id: '5' },
                      { type: 'tag', id: '2' },
                    ],
                  },
                },
              },
            });
          });

          assert.strictEqual(tags, get(person, 'tags'), 'a relationship returns the same object every time');
          assert.strictEqual(get(get(person, 'tags'), 'length'), 2, 'the length is updated after new data is loaded');

          assert.strictEqual(
            get(person, 'tags').at(0),
            get(person, 'tags').at(0),
            'the returned object is always the same'
          );
          assert.strictEqual(
            get(person, 'tags').at(0),
            store.peekRecord('tag', 5),
            'relationship objects are the same as objects retrieved directly'
          );

          run(() => {
            store.push({
              data: {
                type: 'person',
                id: '3',
                attributes: {
                  name: 'KSelden',
                },
              },
            });
          });

          return store.findRecord('person', 3);
        })
        .then((kselden) => {
          assert.strictEqual(
            get(get(kselden, 'tags'), 'length'),
            0,
            'a relationship that has not been supplied returns an empty array'
          );

          run(() => {
            store.push({
              data: {
                type: 'person',
                id: '4',
                attributes: {
                  name: 'Cyvid Hamluck',
                },
                relationships: {
                  pets: {
                    data: [{ type: 'pet', id: '4' }],
                  },
                },
              },
            });
          });
          return store.findRecord('person', 4);
        })
        .then((cyvid) => {
          assert.strictEqual(get(cyvid, 'name'), 'Cyvid Hamluck', 'precond - retrieves person record from store');

          let pets = get(cyvid, 'pets');
          assert.strictEqual(get(pets, 'length'), 1, 'the list of pets should have the correct length');
          assert.strictEqual(get(pets.at(0), 'name'), 'fluffy', 'the first pet should be correct');

          run(() => {
            store.push({
              data: {
                type: 'person',
                id: '4',
                attributes: {
                  name: 'Cyvid Hamluck',
                },
                relationships: {
                  pets: {
                    data: [
                      { type: 'pet', id: '4' },
                      { type: 'pet', id: '12' },
                    ],
                  },
                },
              },
            });
          });

          assert.strictEqual(pets, get(cyvid, 'pets'), 'a relationship returns the same object every time');
          assert.strictEqual(get(get(cyvid, 'pets'), 'length'), 2, 'the length is updated after new data is loaded');
        });
    });
  });

  test('hasMany does not notify when it is initially reified', function (assert) {
    assert.expect(1);

    const Tag = Model.extend({
      name: attr('string'),
      people: hasMany('person', { async: false, inverse: 'tag' }),
    });
    Tag.toString = () => 'Tag';

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: false, inverse: 'people' }),
    });
    Person.toString = () => 'Person';

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    run(() => {
      store.push({
        data: [
          {
            type: 'tag',
            id: '1',
            attributes: {
              name: 'whatever',
            },
            relationships: {
              people: {
                data: [
                  {
                    id: '2',
                    type: 'person',
                  },
                ],
              },
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'David J. Hamilton',
            },
          },
        ],
      });
    });

    return run(() => {
      let tag = store.peekRecord('tag', 1);
      tag.addObserver('people', () => {
        assert.ok(false, 'observer is not called');
      });
      tag.addObserver('people.[]', () => {
        assert.ok(false, 'observer is not called');
      });

      assert.deepEqual(
        tag.people.map((r) => r.name),
        ['David J. Hamilton'],
        'relationship is correct'
      );
    });
  });

  test('hasMany can be initially reified with null', function (assert) {
    assert.expect(1);

    const Tag = Model.extend({
      name: attr('string'),
      people: hasMany('person', { async: false, inverse: 'tag' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: false, inverse: 'people' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    run(() => {
      store.push({
        data: {
          type: 'tag',
          id: '1',
          attributes: {
            name: 'whatever',
          },
          relationships: {
            people: {
              data: null,
            },
          },
        },
      });
    });

    return run(() => {
      let tag = store.peekRecord('tag', 1);

      assert.strictEqual(tag.people.length, 0, 'relationship is correct');
    });
  });

  test('hasMany with explicit initial null works even when the inverse was set to not null', function (assert) {
    assert.expect(2);

    const Tag = Model.extend({
      name: attr('string'),
      people: hasMany('person', { async: false, inverse: 'tag' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: false, inverse: 'people' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    run(() => {
      // first we push in data with the relationship
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'David J. Hamilton',
          },
          relationships: {
            tag: {
              data: {
                type: 'tag',
                id: '1',
              },
            },
          },
        },
        included: [
          {
            type: 'tag',
            id: '1',
            attributes: {
              name: 'whatever',
            },
            relationships: {
              people: {
                data: [
                  {
                    type: 'person',
                    id: '1',
                  },
                ],
              },
            },
          },
        ],
      });

      // now we push in data for that record which says it has no relationships
      store.push({
        data: {
          type: 'tag',
          id: '1',
          attributes: {
            name: 'whatever',
          },
          relationships: {
            people: {
              data: null,
            },
          },
        },
      });
    });

    return run(() => {
      let tag = store.peekRecord('tag', 1);
      let person = store.peekRecord('person', 1);

      assert.strictEqual(person.tag, null, 'relationship is empty');
      assert.strictEqual(tag.people.length, 0, 'relationship is correct');
    });
  });

  test('hasMany with duplicates from payload', function (assert) {
    assert.expect(1);

    const Tag = Model.extend({
      name: attr('string'),
      people: hasMany('person', { async: false, inverse: 'tag' }),
    });

    Tag.toString = () => {
      return 'tag';
    };

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: false, inverse: 'people' }),
    });

    Person.toString = () => {
      return 'person';
    };

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    run(() => {
      // first we push in data with the relationship
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'David J. Hamilton',
          },
          relationships: {
            tag: {
              data: {
                type: 'tag',
                id: '1',
              },
            },
          },
        },
        included: [
          {
            type: 'tag',
            id: '1',
            attributes: {
              name: 'whatever',
            },
            relationships: {
              people: {
                data: [
                  {
                    type: 'person',
                    id: '1',
                  },
                  {
                    type: 'person',
                    id: '1',
                  },
                ],
              },
            },
          },
        ],
      });
    });

    run(() => {
      let tag = store.peekRecord('tag', 1);
      assert.strictEqual(tag.people.length, 1, 'relationship does not contain duplicates');
    });
  });

  test('many2many loads both sides #5140', function (assert) {
    assert.expect(3);

    const Tag = Model.extend({
      name: attr('string'),
      people: hasMany('person', { async: false, inverse: 'tags' }),
    });

    Tag.toString = () => {
      return 'tag';
    };

    const Person = Model.extend({
      name: attr('string'),
      tags: hasMany('tag', { async: false, inverse: 'people' }),
    });

    Person.toString = () => {
      return 'person';
    };

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    run(() => {
      // first we push in data with the relationship
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'David J. Hamilton',
            },
            relationships: {
              tags: [
                {
                  data: {
                    type: 'tag',
                    id: '1',
                  },
                },
                {
                  data: {
                    type: 'tag',
                    id: '2',
                  },
                },
              ],
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Gerald Dempsey Posey',
            },
            relationships: {
              tags: [
                {
                  data: {
                    type: 'tag',
                    id: '1',
                  },
                },
                {
                  data: {
                    type: 'tag',
                    id: '2',
                  },
                },
              ],
            },
          },
          {
            type: 'tag',
            id: '1',
            attributes: {
              name: 'whatever',
            },
            relationships: {
              people: {
                data: [
                  {
                    type: 'person',
                    id: '1',
                  },
                  {
                    type: 'person',
                    id: '2',
                  },
                ],
              },
            },
          },
          {
            type: 'tag',
            id: '2',
            attributes: {
              name: 'nothing',
            },
            relationships: {
              people: {
                data: [
                  {
                    type: 'person',
                    id: '1',
                  },
                  {
                    type: 'person',
                    id: '2',
                  },
                ],
              },
            },
          },
        ],
      });
    });

    run(() => {
      let tag = store.peekRecord('tag', 1);
      assert.strictEqual(tag.people.length, 2, 'relationship does contain all data');
      let person1 = store.peekRecord('person', 1);
      assert.strictEqual(person1.tags.length, 2, 'relationship does contain all data');
      let person2 = store.peekRecord('person', 2);
      assert.strictEqual(person2.tags.length, 2, 'relationship does contain all data');
    });
  });

  test('hasMany with explicit null works even when the inverse was set to not null', function (assert) {
    assert.expect(3);

    const Tag = Model.extend({
      name: attr('string'),
      people: hasMany('person', { async: false, inverse: 'tag' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: false, inverse: 'people' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    run(() => {
      // first we push in data with the relationship
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'David J. Hamilton',
          },
          relationships: {
            tag: {
              data: {
                type: 'tag',
                id: '1',
              },
            },
          },
        },
        included: [
          {
            type: 'tag',
            id: '1',
            attributes: {
              name: 'whatever',
            },
            relationships: {
              people: {
                data: [
                  {
                    type: 'person',
                    id: '1',
                  },
                ],
              },
            },
          },
        ],
      });
    });

    run(() => {
      let person = store.peekRecord('person', 1);
      let tag = store.peekRecord('tag', 1);

      assert.strictEqual(person.tag, tag, 'relationship is not empty');
    });

    run(() => {
      // now we push in data for that record which says it has no relationships
      store.push({
        data: {
          type: 'tag',
          id: '1',
          attributes: {
            name: 'whatever',
          },
          relationships: {
            people: {
              data: null,
            },
          },
        },
      });
    });

    return run(() => {
      let person = store.peekRecord('person', 1);
      let tag = store.peekRecord('tag', 1);

      assert.strictEqual(person.tag, null, 'relationship is now empty');
      assert.strictEqual(tag.people.length, 0, 'relationship is correct');
    });
  });

  test('hasMany tolerates reflexive self-relationships', function (assert) {
    assert.expect(1);

    const Person = Model.extend({
      name: attr(),
      trueFriends: hasMany('person', { async: false, inverse: 'trueFriends' }),
    });

    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    run(() => {
      store.push({
        data: {
          id: '1',
          type: 'person',
          attributes: {
            name: 'Edward II',
          },
          relationships: {
            trueFriends: {
              data: [
                {
                  id: '1',
                  type: 'person',
                },
              ],
            },
          },
        },
      });
    });

    let eddy = store.peekRecord('person', 1);
    assert.deepEqual(
      eddy.trueFriends.map((r) => r.name),
      ['Edward II'],
      'hasMany supports reflexive self-relationships'
    );
  });

  test('hasMany lazily loads async relationships', function (assert) {
    assert.expect(5);

    const Tag = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: 'tags' }),
    });

    const Pet = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: 'pets' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tags: hasMany('tag', { async: true, inverse: 'person' }),
      pets: hasMany('pet', { async: false, inverse: 'person' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:pet', Pet);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      if (type === Tag && id === '12') {
        return { data: { id: '12', type: 'tag', attributes: { name: 'oohlala' } } };
      } else {
        assert.ok(false, 'findRecord() should not be called with these values');
      }
    };
    adapter.shouldBackgroundReloadRecord = () => false;

    run(() => {
      store.push({
        data: [
          {
            type: 'tag',
            id: '5',
            attributes: {
              name: 'friendly',
            },
          },
          {
            type: 'tag',
            id: '2',
            attributes: {
              name: 'smarmy',
            },
          },
          {
            type: 'pet',
            id: '4',
            attributes: {
              name: 'fluffy',
            },
          },
          {
            type: 'pet',
            id: '7',
            attributes: {
              name: 'snowy',
            },
          },
          {
            type: 'pet',
            id: '12',
            attributes: {
              name: 'cerberus',
            },
          },
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Tom Dale',
            },
            relationships: {
              tags: {
                data: [{ type: 'tag', id: '5' }],
              },
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Yehuda Katz',
            },
            relationships: {
              tags: {
                data: [{ type: 'tag', id: '12' }],
              },
            },
          },
        ],
      });
    });

    return run(() => {
      let wycats;
      store
        .findRecord('person', 2)
        .then(function (person) {
          wycats = person;

          assert.strictEqual(get(wycats, 'name'), 'Yehuda Katz', 'precond - retrieves person record from store');

          return hash({
            wycats,
            tags: wycats.tags,
          });
        })
        .then((records) => {
          assert.strictEqual(get(records.tags, 'length'), 1, 'the list of tags should have the correct length');
          assert.strictEqual(get(records.tags.at(0), 'name'), 'oohlala', 'the first tag should be a Tag');

          assert.strictEqual(records.tags.at(0), records.tags.at(0), 'the returned object is always the same');
          assert.strictEqual(
            records.tags.at(0),
            store.peekRecord('tag', 12),
            'relationship objects are the same as objects retrieved directly'
          );

          return get(wycats, 'tags');
        })
        .then((tags) => {
          let newTag = store.createRecord('tag');
          tags.push(newTag);
        });
    });
  });

  test('should be able to retrieve the type for a hasMany relationship without specifying a type from its metadata', function (assert) {
    const Tag = Model.extend({});

    const Person = Model.extend({
      tags: hasMany('tag', { async: false, inverse: null }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    assert.strictEqual(
      store.modelFor('person').typeForRelationship('tags', store),
      Tag,
      'returns the relationship type'
    );
  });

  test('should be able to retrieve the type for a hasMany relationship specified using a string from its metadata', function (assert) {
    const Tag = Model.extend({});

    const Person = Model.extend({
      tags: hasMany('tag', { async: false, inverse: null }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    assert.strictEqual(
      store.modelFor('person').typeForRelationship('tags', store),
      Tag,
      'returns the relationship type'
    );
  });

  test('should be able to retrieve the type for a belongsTo relationship without specifying a type from its metadata', function (assert) {
    const Tag = Model.extend({});

    const Person = Model.extend({
      tag: belongsTo('tag', { async: false, inverse: null }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    assert.strictEqual(
      store.modelFor('person').typeForRelationship('tag', store),
      Tag,
      'returns the relationship type'
    );
  });

  test('should be able to retrieve the type for a belongsTo relationship specified using a string from its metadata', function (assert) {
    const Tag = Model.extend({
      name: attr('string'),
    });

    const Person = Model.extend({
      tags: belongsTo('tag', { async: false, inverse: null }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    assert.strictEqual(
      store.modelFor('person').typeForRelationship('tags', store),
      Tag,
      'returns the relationship type'
    );
  });

  test('relationships work when declared with a string path', function (assert) {
    assert.expect(2);

    const Person = Model.extend({
      name: attr('string'),
      tags: hasMany('tag', { async: false, inverse: null }),
    });

    const Tag = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:tag', Tag);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    run(() => {
      store.push({
        data: [
          {
            type: 'tag',
            id: '5',
            attributes: {
              name: 'friendly',
            },
          },
          {
            type: 'tag',
            id: '2',
            attributes: {
              name: 'smarmy',
            },
          },
          {
            type: 'tag',
            id: '12',
            attributes: {
              name: 'oohlala',
            },
          },
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Tom Dale',
            },
            relationships: {
              tags: {
                data: [
                  { type: 'tag', id: '5' },
                  { type: 'tag', id: '2' },
                ],
              },
            },
          },
        ],
      });
    });

    return run(() => {
      return store.findRecord('person', 1).then((person) => {
        assert.strictEqual(get(person, 'name'), 'Tom Dale', 'precond - retrieves person record from store');
        assert.strictEqual(get(person, 'tags.length'), 2, 'the list of tags should have the correct length');
      });
    });
  });

  test('hasMany relationships work when the data hash has not been loaded', function (assert) {
    assert.expect(8);

    const Tag = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: 'tags' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tags: hasMany('tag', { async: true, inverse: 'person' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.coalesceFindRequests = true;
    adapter.findMany = function (store, type, ids, snapshots) {
      assert.strictEqual(type, Tag, 'type should be Tag');
      assert.deepEqual(ids, ['5', '2'], 'ids should be 5 and 2');

      return {
        data: [
          { id: '5', type: 'tag', attributes: { name: 'friendly' } },
          { id: '2', type: 'tag', attributes: { name: 'smarmy' } },
        ],
      };
    };

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(type, Person, 'type should be Person');
      assert.strictEqual(id, '1', 'id should be 1');

      return {
        data: {
          id: '1',
          type: 'person',
          attributes: { name: 'Tom Dale' },
          relationships: {
            tags: {
              data: [
                { id: '5', type: 'tag' },
                { id: '2', type: 'tag' },
              ],
            },
          },
        },
      };
    };

    return run(() => {
      return store
        .findRecord('person', 1)
        .then((person) => {
          assert.strictEqual(get(person, 'name'), 'Tom Dale', 'The person is now populated');

          return run(() => person.tags);
        })
        .then((tags) => {
          assert.strictEqual(get(tags, 'length'), 2, 'the tags object still exists');
          assert.strictEqual(get(tags.at(0), 'name'), 'friendly', 'Tom Dale is now friendly');
          assert.true(get(tags.at(0), 'isLoaded'), 'Tom Dale is now loaded');
        });
    });
  });

  test('it is possible to add a new item to a relationship', function (assert) {
    assert.expect(2);

    const Tag = Model.extend({
      name: attr('string'),
      people: belongsTo('person', { async: false, inverse: 'tags' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tags: hasMany('tag', { async: false, inverse: 'people' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    run(() => {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Tom Dale',
            },
            relationships: {
              tags: {
                data: [{ type: 'tag', id: '1' }],
              },
            },
          },
          {
            type: 'tag',
            id: '1',
            attributes: {
              name: 'ember',
            },
          },
        ],
      });
    });

    return run(() => {
      return store.findRecord('person', 1).then((person) => {
        let tag = get(person, 'tags').at(0);

        assert.strictEqual(get(tag, 'name'), 'ember', 'precond - relationships work');

        tag = store.createRecord('tag', { name: 'js' });
        get(person, 'tags').push(tag);

        assert.strictEqual(get(person, 'tags').at(1), tag, 'newly added relationship works');
      });
    });
  });

  test('new items added to a hasMany relationship are not cleared by a delete', function (assert) {
    assert.expect(4);

    const Person = Model.extend({
      name: attr('string'),
      pets: hasMany('pet', { async: false, inverse: null }),
    });

    const Pet = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: null }),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:pet', Pet);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = () => {
      return EmberPromise.resolve({ data: null });
    };

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Chris Thoburn',
          },
          relationships: {
            pets: {
              data: [{ type: 'pet', id: '1' }],
            },
          },
        },
        included: [
          {
            type: 'pet',
            id: '1',
            attributes: {
              name: 'Shenanigans',
            },
          },
          {
            type: 'pet',
            id: '2',
            attributes: {
              name: 'Rambunctious',
            },
          },
          {
            type: 'pet',
            id: '3',
            attributes: {
              name: 'Rebel',
            },
          },
        ],
      });
    });

    const person = store.peekRecord('person', '1');
    const pets = run(() => person.pets);

    const shen = pets.at(0);
    const rambo = store.peekRecord('pet', '2');
    const rebel = store.peekRecord('pet', '3');

    assert.strictEqual(get(shen, 'name'), 'Shenanigans', 'precond - relationships work');
    assert.deepEqual(
      pets.map((p) => get(p, 'id')),
      ['1'],
      'precond - relationship has the correct pets to start'
    );

    run(() => {
      pets.push(rambo, rebel);
    });

    assert.deepEqual(
      pets.map((p) => get(p, 'id')),
      ['1', '2', '3'],
      'precond2 - relationship now has the correct three pets'
    );

    run(() => {
      return shen.destroyRecord({});
    });

    assert.deepEqual(
      pets.map((p) => get(p, 'id')),
      ['2', '3'],
      'relationship now has the correct two pets'
    );
  });

  todo('[push hasMany] new items added to a hasMany relationship are not cleared by a store.push', function (assert) {
    assert.expect(5);

    const Person = Model.extend({
      name: attr('string'),
      pets: hasMany('pet', { async: false, inverse: null }),
    });

    const Pet = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: null }),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:pet', Pet);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = () => {
      return EmberPromise.resolve({ data: null });
    };

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Chris Thoburn',
          },
          relationships: {
            pets: {
              data: [{ type: 'pet', id: '1' }],
            },
          },
        },
        included: [
          {
            type: 'pet',
            id: '1',
            attributes: {
              name: 'Shenanigans',
            },
          },
          {
            type: 'pet',
            id: '2',
            attributes: {
              name: 'Rambunctious',
            },
          },
          {
            type: 'pet',
            id: '3',
            attributes: {
              name: 'Rebel',
            },
          },
        ],
      });
    });

    const person = store.peekRecord('person', '1');
    const pets = run(() => person.pets);

    const shen = pets.at(0);
    const rebel = store.peekRecord('pet', '3');

    assert.strictEqual(get(shen, 'name'), 'Shenanigans', 'precond - relationships work');
    assert.deepEqual(
      pets.map((p) => get(p, 'id')),
      ['1'],
      'precond - relationship has the correct pets to start'
    );

    run(() => {
      pets.push(rebel);
    });

    assert.deepEqual(
      pets.map((p) => get(p, 'id')),
      ['1', '3'],
      'precond2 - relationship now has the correct two pets'
    );

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          relationships: {
            pets: {
              data: [{ type: 'pet', id: '2' }],
            },
          },
        },
      });
    });

    let hasManyCanonical = person.hasMany('pets').hasManyRelationship.remoteState;

    assert.todo.deepEqual(
      pets.map((p) => get(p, 'id')),
      ['2', '3'],
      'relationship now has the correct current pets'
    );
    assert.deepEqual(
      hasManyCanonical.map((p) => get(p, 'id')),
      ['2'],
      'relationship now has the correct canonical pets'
    );
  });

  todo('[push hasMany] items removed from a hasMany relationship are not cleared by a store.push', function (assert) {
    assert.expect(5);

    const Person = Model.extend({
      name: attr('string'),
      pets: hasMany('pet', { async: false, inverse: null }),
    });

    const Pet = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: null }),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:pet', Pet);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = () => {
      return EmberPromise.resolve({ data: null });
    };

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Chris Thoburn',
          },
          relationships: {
            pets: {
              data: [
                { type: 'pet', id: '1' },
                { type: 'pet', id: '3' },
              ],
            },
          },
        },
        included: [
          {
            type: 'pet',
            id: '1',
            attributes: {
              name: 'Shenanigans',
            },
          },
          {
            type: 'pet',
            id: '2',
            attributes: {
              name: 'Rambunctious',
            },
          },
          {
            type: 'pet',
            id: '3',
            attributes: {
              name: 'Rebel',
            },
          },
        ],
      });
    });

    const person = store.peekRecord('person', '1');
    const pets = person.pets;

    const shen = pets.at(0);
    const rebel = store.peekRecord('pet', '3');

    assert.strictEqual(shen.name, 'Shenanigans', 'precond - relationships work');
    assert.deepEqual(
      pets.map((p) => p.id),
      ['1', '3'],
      'precond - relationship has the correct pets to start'
    );

    pets.splice(pets.indexOf(rebel), 1);

    assert.deepEqual(
      pets.map((p) => get(p, 'id')),
      ['1'],
      'precond2 - relationship now has the correct pet'
    );

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          relationships: {
            pets: {
              data: [
                { type: 'pet', id: '2' },
                { type: 'pet', id: '3' },
              ],
            },
          },
        },
      });
    });

    let hasManyCanonical = person.hasMany('pets').hasManyRelationship.remoteState;

    assert.todo.deepEqual(
      pets.map((p) => get(p, 'id')),
      ['2'],
      'relationship now has the correct current pets'
    );
    assert.deepEqual(
      hasManyCanonical.map((p) => get(p, 'id')),
      ['2', '3'],
      'relationship now has the correct canonical pets'
    );
  });

  test('new items added to an async hasMany relationship are not cleared by a delete', function (assert) {
    assert.expect(7);

    const Person = Model.extend({
      name: attr('string'),
      pets: hasMany('pet', { async: true, inverse: null }),
    });

    const Pet = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: null }),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:pet', Pet);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = () => {
      return EmberPromise.resolve({ data: null });
    };

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Chris Thoburn',
          },
          relationships: {
            pets: {
              data: [{ type: 'pet', id: '1' }],
            },
          },
        },
        included: [
          {
            type: 'pet',
            id: '1',
            attributes: {
              name: 'Shenanigans',
            },
          },
          {
            type: 'pet',
            id: '2',
            attributes: {
              name: 'Rambunctious',
            },
          },
          {
            type: 'pet',
            id: '3',
            attributes: {
              name: 'Rebel',
            },
          },
        ],
      });
    });

    return run(() => {
      const person = store.peekRecord('person', '1');
      const petsProxy = run(() => person.pets);

      return petsProxy.then((pets) => {
        const shen = pets.at(0);
        const rambo = store.peekRecord('pet', '2');
        const rebel = store.peekRecord('pet', '3');

        assert.strictEqual(get(shen, 'name'), 'Shenanigans', 'precond - relationships work');
        assert.deepEqual(
          pets.map((p) => get(p, 'id')),
          ['1'],
          'precond - relationship has the correct pet to start'
        );
        assert.strictEqual(get(petsProxy, 'length'), 1, 'precond - proxy has only one pet to start');

        pets.push(rambo, rebel);

        assert.deepEqual(
          pets.map((p) => get(p, 'id')),
          ['1', '2', '3'],
          'precond2 - relationship now has the correct three pets'
        );
        assert.strictEqual(get(petsProxy, 'length'), 3, 'precond2 - proxy now reflects three pets');

        return shen.destroyRecord({}).then(() => {
          assert.deepEqual(
            pets.map((p) => get(p, 'id')),
            ['2', '3'],
            'relationship now has the correct two pets'
          );
          assert.strictEqual(get(petsProxy, 'length'), 2, 'proxy now reflects two pets');
        });
      });
    });
  });

  test('new items added to a belongsTo relationship are not cleared by a delete', function (assert) {
    assert.expect(4);

    const Person = Model.extend({
      name: attr('string'),
      dog: belongsTo('dog', { async: false, inverse: null }),
    });

    const Dog = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:dog', Dog);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = () => {
      return EmberPromise.resolve({ data: null });
    };

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Chris Thoburn',
          },
          relationships: {
            dog: {
              data: { type: 'dog', id: '1' },
            },
          },
        },
        included: [
          {
            type: 'dog',
            id: '1',
            attributes: {
              name: 'Shenanigans',
            },
          },
          {
            type: 'dog',
            id: '2',
            attributes: {
              name: 'Rambunctious',
            },
          },
        ],
      });
    });

    const person = store.peekRecord('person', '1');
    let dog = run(() => person.dog);
    const shen = store.peekRecord('dog', '1');
    const rambo = store.peekRecord('dog', '2');

    assert.strictEqual(dog, shen, 'precond - the belongsTo points to the correct dog');
    assert.strictEqual(get(dog, 'name'), 'Shenanigans', 'precond - relationships work');

    run(() => {
      person.set('dog', rambo);
    });

    dog = person.dog;
    assert.strictEqual(dog, rambo, 'precond2 - relationship was updated');

    return run(() => {
      return shen.destroyRecord({}).then(() => {
        dog = person.dog;
        assert.strictEqual(dog, rambo, 'The currentState of the belongsTo was preserved after the delete');
      });
    });
  });

  test('new items added to an async belongsTo relationship are not cleared by a delete', function (assert) {
    assert.expect(4);

    const Person = Model.extend({
      name: attr('string'),
      dog: belongsTo('dog', { async: true, inverse: null }),
    });

    const Dog = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:dog', Dog);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = () => {
      return EmberPromise.resolve({ data: null });
    };

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Chris Thoburn',
          },
          relationships: {
            dog: {
              data: { type: 'dog', id: '1' },
            },
          },
        },
        included: [
          {
            type: 'dog',
            id: '1',
            attributes: {
              name: 'Shenanigans',
            },
          },
          {
            type: 'dog',
            id: '2',
            attributes: {
              name: 'Rambunctious',
            },
          },
        ],
      });
    });

    return run(() => {
      const person = store.peekRecord('person', '1');
      const shen = store.peekRecord('dog', '1');
      const rambo = store.peekRecord('dog', '2');

      return person.dog.then((dog) => {
        assert.strictEqual(dog, shen, 'precond - the belongsTo points to the correct dog');
        assert.strictEqual(get(dog, 'name'), 'Shenanigans', 'precond - relationships work');

        person.set('dog', rambo);

        dog = person.dog.content;

        assert.strictEqual(dog, rambo, 'precond2 - relationship was updated');

        return shen.destroyRecord({}).then(() => {
          dog = person.dog.content;
          assert.strictEqual(dog, rambo, 'The currentState of the belongsTo was preserved after the delete');
        });
      });
    });
  });

  test('deleting an item that is the current state of a belongsTo clears currentState', function (assert) {
    assert.expect(4);

    const Person = Model.extend({
      name: attr('string'),
      dog: belongsTo('dog', { async: false, inverse: null }),
    });

    const Dog = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:dog', Dog);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = () => {
      return EmberPromise.resolve({ data: null });
    };

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Chris Thoburn',
          },
          relationships: {
            dog: {
              data: { type: 'dog', id: '1' },
            },
          },
        },
        included: [
          {
            type: 'dog',
            id: '1',
            attributes: {
              name: 'Shenanigans',
            },
          },
          {
            type: 'dog',
            id: '2',
            attributes: {
              name: 'Rambunctious',
            },
          },
        ],
      });
    });

    const person = store.peekRecord('person', '1');
    let dog = run(() => person.dog);
    const shen = store.peekRecord('dog', '1');
    const rambo = store.peekRecord('dog', '2');

    assert.strictEqual(dog, shen, 'precond - the belongsTo points to the correct dog');
    assert.strictEqual(get(dog, 'name'), 'Shenanigans', 'precond - relationships work');

    run(() => {
      person.set('dog', rambo);
    });

    dog = person.dog;
    assert.strictEqual(dog, rambo, 'precond2 - relationship was updated');

    return run(() => {
      return rambo.destroyRecord({}).then(() => {
        dog = person.dog;
        assert.strictEqual(dog, null, 'The current state of the belongsTo was clearer');
      });
    });
  });

  test('hasMany.at(0).unloadRecord should not break that hasMany', function (assert) {
    const Person = Model.extend({
      cars: hasMany('car', { async: false, inverse: null }),
      name: attr(),
    });

    Person.toString = () => {
      return 'person';
    };

    const Car = Model.extend({
      name: attr(),
    });

    Car.toString = () => {
      return 'car';
    };

    this.owner.register('model:person', Person);
    this.owner.register('model:car', Car);

    let store = this.owner.lookup('service:store');

    run(() => {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'marvin',
            },
            relationships: {
              cars: {
                data: [
                  { type: 'car', id: '1' },
                  { type: 'car', id: '2' },
                ],
              },
            },
          },
          { type: 'car', id: '1', attributes: { name: 'a' } },
          { type: 'car', id: '2', attributes: { name: 'b' } },
        ],
      });
    });

    let person = store.peekRecord('person', 1);
    let cars = person.cars;

    assert.strictEqual(cars.length, 2);

    run(() => {
      cars.at(0).unloadRecord();
      assert.strictEqual(cars.length, 1); // unload now..
      assert.strictEqual(person.cars.length, 1); // unload now..
    });

    assert.strictEqual(cars.length, 1); // unload now..
    assert.strictEqual(person.cars.length, 1); // unload now..
  });

  /*
    This test, when passing, affirms that a known limitation of ember-data still exists.

    When pushing new data into the store, ember-data is currently incapable of knowing whether
    a relationship has been persisted. In order to update relationship state effectively, ember-data
    blindly "flushes canonical" state, removing any `currentState` changes. A delete that sideloads
    the parent record's hasMany is a situation in which this limitation will be encountered should other
    local changes to the relationship still exist.
   */
  test('[ASSERTS KNOWN LIMITATION STILL EXISTS] returning new hasMany relationship info from a delete clears local state', function (assert) {
    assert.expect(4);

    const Person = Model.extend({
      name: attr('string'),
      pets: hasMany('pet', { async: false, inverse: null }),
    });

    const Pet = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: null }),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:pet', Pet);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = () => {
      return EmberPromise.resolve({
        data: null,
        included: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Chris Thoburn',
            },
            relationships: {
              pets: {
                data: [{ type: 'pet', id: '2' }],
              },
            },
          },
        ],
      });
    };

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Chris Thoburn',
          },
          relationships: {
            pets: {
              data: [
                { type: 'pet', id: '1' },
                { type: 'pet', id: '2' },
              ],
            },
          },
        },
        included: [
          {
            type: 'pet',
            id: '1',
            attributes: {
              name: 'Shenanigans',
            },
          },
          {
            type: 'pet',
            id: '2',
            attributes: {
              name: 'Rambunctious',
            },
          },
          {
            type: 'pet',
            id: '3',
            attributes: {
              name: 'Rebel',
            },
          },
        ],
      });
    });

    const person = store.peekRecord('person', '1');
    const pets = run(() => person.pets);

    const shen = store.peekRecord('pet', '1');
    const rebel = store.peekRecord('pet', '3');

    assert.strictEqual(get(shen, 'name'), 'Shenanigans', 'precond - relationships work');
    assert.deepEqual(
      pets.map((p) => get(p, 'id')),
      ['1', '2'],
      'precond - relationship has the correct pets to start'
    );

    run(() => {
      pets.push(rebel);
    });

    assert.deepEqual(
      pets.map((p) => get(p, 'id')),
      ['1', '2', '3'],
      'precond2 - relationship now has the correct three pets'
    );

    return run(() => {
      return shen.destroyRecord({}).then(() => {
        // were ember-data to now preserve local edits during a relationship push, this would be '2'
        assert.deepEqual(
          pets.map((p) => get(p, 'id')),
          ['2'],
          'relationship now has only one pet, we lost the local change'
        );
      });
    });
  });

  test('possible to replace items in a relationship using setObjects w/ Ember Enumerable Array/Object as the argument (GH-2533)', function (assert) {
    assert.expect(DEPRECATE_ARRAY_LIKE ? 3 : 2);

    const Tag = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: 'tags' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tags: hasMany('tag', { async: false, inverse: 'person' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
          relationships: {
            tags: {
              data: [{ type: 'tag', id: '1' }],
            },
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Sylvain Mina',
          },
          relationships: {
            tags: {
              data: [{ type: 'tag', id: '2' }],
            },
          },
        },
        {
          type: 'tag',
          id: '1',
          attributes: {
            name: 'ember',
          },
        },
        {
          type: 'tag',
          id: '2',
          attributes: {
            name: 'ember-data',
          },
        },
      ],
    });

    let tom = store.peekRecord('person', '1');
    let sylvain = store.peekRecord('person', '2');
    // Test that since sylvain.tags instanceof ManyArray,
    // adding records on Relationship iterates correctly.
    if (DEPRECATE_ARRAY_LIKE) {
      tom.tags.setObjects(sylvain.tags);
      assert.expectDeprecation({ id: 'ember-data:deprecate-array-like' });
    } else {
      tom.tags.length = 0;
      tom.tags.push(...sylvain.tags);
    }

    assert.strictEqual(tom.tags.length, 1);
    assert.strictEqual(tom.tags.at(0), store.peekRecord('tag', 2));
  });

  deprecatedTest(
    'Replacing `has-many` with non-array will throw assertion',
    { id: 'ember-data:deprecate-array-like', until: '5.0' },
    function (assert) {
      assert.expect(1);

      const Tag = Model.extend({
        name: attr('string'),
        person: belongsTo('person', { async: false, inverse: 'tags' }),
      });

      const Person = Model.extend({
        name: attr('string'),
        tags: hasMany('tag', { async: false, inverse: 'person' }),
      });

      this.owner.register('model:tag', Tag);
      this.owner.register('model:person', Person);

      let store = this.owner.lookup('service:store');

      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Tom Dale',
            },
            relationships: {
              tags: {
                data: [{ type: 'tag', id: '1' }],
              },
            },
          },
          {
            type: 'tag',
            id: '1',
            attributes: {
              name: 'ember',
            },
          },
          {
            type: 'tag',
            id: '2',
            attributes: {
              name: 'ember-data',
            },
          },
        ],
      });

      let tom = store.peekRecord('person', '1');
      let tag = store.peekRecord('tag', '2');
      assert.expectAssertion(() => {
        tom.tags.setObjects(tag);
      }, /Assertion Failed: ManyArray.setObjects expects to receive an array as its argument/);
    }
  );

  test('it is possible to remove an item from a relationship', async function (assert) {
    assert.expect(2);

    const Tag = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: 'tags' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tags: hasMany('tag', { async: false, inverse: 'person' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
        relationships: {
          tags: {
            data: [{ type: 'tag', id: '1' }],
          },
        },
      },

      included: [
        {
          type: 'tag',
          id: '1',
          attributes: {
            name: 'ember',
          },
        },
      ],
    });

    let tag = person.tags.at(0);

    assert.strictEqual(tag.name, 'ember', 'precond - relationships work');

    person.tags.splice(0, 1);

    assert.strictEqual(person.tags.length, 0, 'object is removed from the relationship');
  });

  test('it is possible to add an item to a relationship, remove it, then add it again', function (assert) {
    const Tag = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: 'tags' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tags: hasMany('tag', { async: false, inverse: 'person' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    let person = store.createRecord('person');
    let tag1 = store.createRecord('tag');
    let tag2 = store.createRecord('tag');
    let tag3 = store.createRecord('tag');
    let tags = person.tags;

    run(() => {
      tags.push(tag1, tag2, tag3);
      tags.splice(tags.indexOf(tag2), 1);
    });

    assert.strictEqual(tags.at(0), tag1);
    assert.strictEqual(tags.at(1), tag3);
    assert.strictEqual(person.tags.length, 2, 'object is removed from the relationship');

    run(() => {
      tags.unshift(tag2);
    });

    assert.strictEqual(person.tags.length, 3, 'object is added back to the relationship');
    assert.strictEqual(tags.at(0), tag2);
    assert.strictEqual(tags.at(1), tag1);
    assert.strictEqual(tags.at(2), tag3);
  });

  test('hasMany is async by default', function (assert) {
    const Tag = Model.extend({
      name: attr('string'),
      people: hasMany('person', { async: true, inverse: 'tag' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: false, inverse: 'people' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let tag = store.createRecord('tag');

    assert.ok(tag.people instanceof PromiseManyArray, 'people should be an async relationship');
  });

  test('hasMany is stable', function (assert) {
    const Tag = Model.extend({
      name: attr('string'),
      people: hasMany('person', { async: true, inverse: 'tag' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: false, inverse: 'people' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let tag = store.createRecord('tag');
    let people = tag.people;
    let peopleCached = tag.people;

    assert.strictEqual(people, peopleCached);

    tag.notifyPropertyChange('people');
    let notifiedPeople = tag.people;

    assert.strictEqual(people, notifiedPeople);

    return EmberPromise.all([people]);
  });

  test('hasMany proxy is destroyed', async function (assert) {
    const Tag = Model.extend({
      name: attr('string'),
      people: hasMany('person', { async: true, inverse: 'tag' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: false, inverse: 'people' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let tag = store.createRecord('tag');
    let peopleProxy = tag.people;
    let people = await peopleProxy;

    tag.unloadRecord();
    assert.true(people.isDestroying, 'people is destroying sync after unloadRecord');
    assert.true(peopleProxy.isDestroying, 'peopleProxy is destroying after the run post unloadRecord');
    assert.true(peopleProxy.isDestroyed, 'peopleProxy is destroyed after the run post unloadRecord');

    await settled();

    assert.true(people.isDestroyed, 'people is destroyed after unloadRecord');
  });

  test('findHasMany - can push the same record in twice and fetch the link', async function (assert) {
    assert.expect(5);
    const { owner } = this;

    owner.register(
      'adapter:post',
      class extends EmberObject {
        shouldBackgroundReloadRecord() {
          return false;
        }
        async findHasMany() {
          assert.ok(true, 'findHasMany called');
          return {
            data: [
              { id: '1', type: 'comment', attributes: { name: 'FIRST' } },
              { id: '2', type: 'comment', attributes: { name: 'Rails is unagi' } },
              { id: '3', type: 'comment', attributes: { name: 'What is omakase?' } },
            ],
          };
        }
      }
    );

    owner.register(
      'model:post',
      class extends Model {
        @attr name;
        @hasMany('comment', { async: true, inverse: null }) comments;
      }
    );
    owner.register(
      'model:comment',
      class extends Model {
        @attr name;
      }
    );

    const store = owner.lookup('service:store');

    // preload post:1 with a related link
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments',
            },
          },
        },
      },
    });

    // update post:1 with same related link
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is still omakase',
        },
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments',
            },
          },
        },
      },
    });

    let post = store.peekRecord('post', '1');

    const promise = post.comments;
    const promise2 = post.comments;
    assert.strictEqual(promise, promise2, 'we return the same PromiseManyArray each time');
    const comments = await promise;

    assert.true(promise.isFulfilled, 'comments promise is fulfilled');
    assert.strictEqual(comments.length, 3, 'The correct records are in the array');
    const promise3 = post.comments;
    assert.strictEqual(promise, promise3, 'we return the same PromiseManyArray each time');
  });

  test('fetch records with chained async has-many, ensure the leafs are retrieved', async function (assert) {
    assert.expect(8);
    const { owner } = this;

    owner.register(
      'adapter:application',
      class extends EmberObject {
        coalesceFindRequests = true;
        shouldBackgroundReloadRecord() {
          return false;
        }
        async findRecord() {
          assert.ok(true, 'findRecord called');
          return {
            data: {
              type: 'post-author',
              id: '1',
              relationships: {
                posts: {
                  data: [
                    { type: 'authored-post', id: '1' },
                    { type: 'authored-post', id: '2' },
                  ],
                },
              },
            },
          };
        }

        async findMany() {
          assert.ok(true, 'findMany called');
          return {
            data: [
              {
                type: 'authored-post',
                id: '1',
                attributes: {
                  name: 'A post',
                },
                relationships: {
                  author: {
                    data: { type: 'post-author', id: '1' },
                  },
                  comments: {
                    links: {
                      related: './comments',
                    },
                  },
                },
              },
              {
                type: 'authored-post',
                id: '2',
                attributes: {
                  name: 'A second post',
                },
                relationships: {
                  author: {
                    data: { type: 'post-author', id: '1' },
                  },
                  comments: {
                    links: {
                      related: './comments',
                    },
                  },
                },
              },
            ],
          };
        }

        async findHasMany() {
          assert.ok('findHasMany called');
          return {
            data: [
              {
                type: 'post-comment',
                id: '1',
                attributes: {
                  body: 'Some weird words',
                },
              },
              {
                type: 'post-comment',
                id: '2',
                attributes: {
                  body: 'Some mean words',
                },
              },
              {
                type: 'post-comment',
                id: '3',
                attributes: {
                  body: 'Some kind words',
                },
              },
            ],
          };
        }
      }
    );

    owner.register(
      'model:post-author',
      class extends Model {
        @attr name;
        @hasMany('authored-post', { async: true, inverse: 'author' }) posts;
      }
    );
    owner.register(
      'model:authored-post',
      class extends Model {
        @attr name;
        @belongsTo('post-author', { async: false, inverse: 'posts' }) author;
        @hasMany('post-comment', { async: true, inverse: 'post' }) comments;
      }
    );
    owner.register(
      'model:post-comment',
      class extends Model {
        @attr body;
        @belongsTo('authored-post', { async: true, inverse: 'comments' }) post;
      }
    );

    const store = owner.lookup('service:store');

    const user = await store.findRecord('post-author', '1');
    const posts = await user.posts;
    assert.strictEqual(posts.length, 2, 'we loaded two posts');
    const firstPost = posts.at(0);
    const firstPostCommentsPromise = firstPost.comments;
    const originalPromise = firstPostCommentsPromise.promise;
    firstPost.comments; // trigger an extra access
    const firstPostComments = await firstPostCommentsPromise;
    firstPost.comments; // trigger an extra access
    assert.true(firstPostCommentsPromise.isFulfilled, 'comments relationship is fulfilled');
    assert.strictEqual(firstPostCommentsPromise.promise, originalPromise, 'we did not re-trigger the property');
    assert.strictEqual(firstPostComments.length, 3, 'we loaded three comments');
    firstPost.comments; // trigger an extra access
    assert.true(firstPostCommentsPromise.isFulfilled, 'comments relationship is fulfilled');
  });

  test('ManyArray is lazy', async function (assert) {
    let peopleDidChange = 0;
    const Tag = Model.extend({
      name: attr('string'),
      people: hasMany('person', { async: true, inverse: 'tag' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: false, inverse: 'people' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let tag = store.createRecord('tag');
    tag.hasMany('people').hasManyRelationship;
    const support = LEGACY_SUPPORT.get(tag);
    const sync = support._syncArray;
    support._syncArray = function () {
      peopleDidChange++;
      return sync.apply(this, arguments);
    };

    const peoplePromise = tag.people; // access async relationship
    assert.strictEqual(peopleDidChange, 0, 'expect hasMany to initially populate');

    let people = await peoplePromise;

    assert.strictEqual(peopleDidChange, 0, 'expect hasMany to not sync before access after fetch completes');
    assert.strictEqual(people.length, 0, 'we have the right number of people');
    assert.strictEqual(
      peopleDidChange,
      0,
      'expect people hasMany to not dirty after fetch completes, as we did not hit network'
    );

    let person = store.createRecord('person');

    assert.strictEqual(peopleDidChange, 0, 'expect people hasMany to not sync before access');
    people = await tag.people;
    assert.strictEqual(people.length, 0, 'we have the right number of people');
    assert.strictEqual(peopleDidChange, 0, 'expect people hasMany to not sync after access');
    people.push(person);
    assert.strictEqual(peopleDidChange, 0, 'expect hasMany to not sync after push of new related data');
    assert.strictEqual(people.length, 1, 'we have the right number of people');
    assert.strictEqual(peopleDidChange, 1, 'expect hasMany to sync on access after push');
  });

  test('fetch hasMany loads full relationship after a parent and child have been loaded', function (assert) {
    assert.expect(4);

    const Tag = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: true, inverse: 'tags' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tags: hasMany('tag', { async: true, inverse: 'person' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findHasMany = function (store, snapshot, url, relationship) {
      assert.strictEqual(relationship.key, 'tags', 'relationship should be tags');

      return {
        data: [
          { id: '1', type: 'tag', attributes: { name: 'first' } },
          { id: '2', type: 'tag', attributes: { name: 'second' } },
          { id: '3', type: 'tag', attributes: { name: 'third' } },
        ],
      };
    };

    adapter.findRecord = function (store, type, id, snapshot) {
      if (type === Person) {
        return {
          data: {
            id: '1',
            type: 'person',
            attributes: { name: 'Watson' },
            relationships: {
              tags: { links: { related: 'person/1/tags' } },
            },
          },
        };
      } else if (type === Tag) {
        return {
          data: {
            id: '2',
            type: 'tag',
            attributes: { name: 'second' },
            relationships: {
              person: {
                data: { id: '1', type: 'person' },
              },
            },
          },
        };
      } else {
        assert.true(false, 'wrong type');
      }
    };

    return run(() => {
      return store.findRecord('person', 1).then((person) => {
        assert.strictEqual(get(person, 'name'), 'Watson', 'The person is now loaded');

        // when I remove this findRecord the test passes
        return store.findRecord('tag', 2).then((tag) => {
          assert.strictEqual(get(tag, 'name'), 'second', 'The tag is now loaded');

          return run(() =>
            person.tags.then((tags) => {
              assert.strictEqual(get(tags, 'length'), 3, 'the tags are all loaded');
            })
          );
        });
      });
    });
  });

  testInDebug('throws assertion if of not set with an array', function (assert) {
    const Person = Model.extend();
    const Tag = Model.extend({
      people: hasMany('person', { async: true, inverse: null }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let tag = store.createRecord('tag');
    let person = store.createRecord('person');

    run(() => {
      assert.expectAssertion(() => {
        tag.set('people', person);
      }, /You must pass an array of records to set a hasMany relationship/);
    });
  });

  deprecatedTest(
    'checks if passed array only contains instances of Model',
    { id: 'ember-data:deprecate-promise-proxies', count: 4, until: '5.0' },
    async function (assert) {
      const Person = Model.extend();
      const Tag = Model.extend({
        people: hasMany('person', { async: true, inverse: null }),
      });

      this.owner.register('model:tag', Tag);
      this.owner.register('model:person', Person);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.findRecord = function () {
        return {
          data: {
            type: 'person',
            id: '1',
          },
        };
      };

      let tag = store.createRecord('tag');
      let person = store.findRecord('person', '1');
      await person;

      tag.people = [person];

      assert.expectAssertion(() => {
        tag.people = [person, {}];
      }, /All elements of a hasMany relationship must be instances of Model/);
    }
  );
});
