import { get } from '@ember/object';

import { module, test } from 'qunit';
import { Promise } from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('unit/model/relationships - DS.belongsTo', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

  test('belongsTo lazily loads relationships as needed', async function(assert) {
    assert.expect(5);

    const Tag = DS.Model.extend({
      name: DS.attr('string'),
      people: DS.hasMany('person', { async: false }),
    });

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      tag: DS.belongsTo('tag', { async: false }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

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
            tag: {
              data: { type: 'tag', id: '5' },
            },
          },
        },
      ],
    });

    const person = await store.findRecord('person', 1);
    assert.equal(get(person, 'name'), 'Tom Dale', 'precond - retrieves person record from store');

    assert.equal(get(person, 'tag') instanceof Tag, true, 'the tag property should return a tag');
    assert.equal(get(person, 'tag.name'), 'friendly', 'the tag shuld have name');

    assert.strictEqual(get(person, 'tag'), get(person, 'tag'), 'the returned object is always the same');
    assert.asyncEqual(
      get(person, 'tag'),
      store.findRecord('tag', 5),
      'relationship object is the same as object retrieved directly'
    );
  });

  test('belongsTo does not notify when it is initially reified', async function(assert) {
    assert.expect(1);

    const Tag = DS.Model.extend({
      name: DS.attr('string'),
      people: DS.hasMany('person', { async: false }),
    });
    Tag.toString = () => 'Tag';

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      tag: DS.belongsTo('tag', { async: false }),
    });
    Person.toString = () => 'Person';

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    store.push({
      data: [
        {
          type: 'tag',
          id: 1,
          attributes: {
            name: 'whatever',
          },
        },
        {
          type: 'person',
          id: 2,
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
      ],
    });

    let person = store.peekRecord('person', 2);

    let tagDidChange = () => assert.ok(false, 'observer is not called');

    person.addObserver('tag', tagDidChange);

    assert.equal(person.get('tag.name'), 'whatever', 'relationship is correct');

    // This needs to be removed so it is not triggered when test context is torn down
    person.removeObserver('tag', tagDidChange);
  });

  test('async belongsTo relationships work when the data hash has not been loaded', async function(assert) {
    assert.expect(5);

    const Tag = DS.Model.extend({
      name: DS.attr('string'),
    });

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      tag: DS.belongsTo('tag', { async: true }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function(store, type, id, snapshot) {
      if (type === Person) {
        assert.equal(id, 1, 'id should be 1');

        return {
          data: {
            id: 1,
            type: 'person',
            attributes: { name: 'Tom Dale' },
            relationships: { tag: { data: { id: 2, type: 'tag' } } },
          },
        };
      } else if (type === Tag) {
        assert.equal(id, 2, 'id should be 2');

        return { data: { id: 2, type: 'tag', attributes: { name: 'friendly' } } };
      }
    };

    let person = await store.findRecord('person', 1);
    assert.equal(get(person, 'name'), 'Tom Dale', 'The person is now populated');

    let tag = await get(person, 'tag');
    assert.equal(get(tag, 'name'), 'friendly', 'Tom Dale is now friendly');
    assert.equal(get(tag, 'isLoaded'), true, 'Tom Dale is now loaded');
  });

  test('async belongsTo relationships are not grouped with coalesceFindRequests=false', async function(assert) {
    assert.expect(6);

    const Tag = DS.Model.extend({
      name: DS.attr('string'),
    });

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      tag: DS.belongsTo('tag', { async: true }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.coalesceFindRequests = false;

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
          relationships: {
            tag: {
              data: { type: 'tag', id: '3' },
            },
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Bob Dylan',
          },
          relationships: {
            tag: {
              data: { type: 'tag', id: '4' },
            },
          },
        },
      ],
    });

    adapter.findMany = function() {
      throw new Error('findMany should not be called');
    };

    adapter.findRecord = function(store, type, id) {
      assert.equal(type.modelName, 'tag', 'modelName is tag');

      if (id === '3') {
        return Promise.resolve({
          data: {
            id: '3',
            type: 'tag',
            attributes: { name: 'friendly' },
          },
        });
      } else if (id === '4') {
        return Promise.resolve({
          data: {
            id: '4',
            type: 'tag',
            attributes: { name: 'nice' },
          },
        });
      }
    };

    let persons = [store.peekRecord('person', '1'), store.peekRecord('person', '2')];
    let [tag1, tag2] = await Promise.all(persons.map(person => get(person, 'tag')));

    assert.equal(get(tag1, 'name'), 'friendly', 'Tom Dale is now friendly');
    assert.equal(get(tag1, 'isLoaded'), true, "Tom Dale's tag is now loaded");

    assert.equal(get(tag2, 'name'), 'nice', 'Bob Dylan is now nice');
    assert.equal(get(tag2, 'isLoaded'), true, "Bob Dylan's tag is now loaded");
  });

  test('async belongsTo relationships are grouped with coalesceFindRequests=true', async function(assert) {
    assert.expect(6);

    const Tag = DS.Model.extend({
      name: DS.attr('string'),
    });

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      tag: DS.belongsTo('tag', { async: true }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.coalesceFindRequests = true;

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
          relationships: {
            tag: {
              data: { type: 'tag', id: '3' },
            },
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Bob Dylan',
          },
          relationships: {
            tag: {
              data: { type: 'tag', id: '4' },
            },
          },
        },
      ],
    });

    adapter.findMany = function(store, type, ids, snapshots) {
      assert.equal(type.modelName, 'tag', 'modelName is tag');
      assert.deepEqual(ids, ['3', '4'], 'it coalesces the find requests correctly');

      return Promise.resolve({
        data: [
          {
            id: '3',
            type: 'tag',
            attributes: { name: 'friendly' },
          },
          {
            id: '4',
            type: 'tag',
            attributes: { name: 'nice' },
          },
        ],
      });
    };

    adapter.findRecord = function() {
      throw new Error('findRecord should not be called');
    };

    let persons = [store.peekRecord('person', '1'), store.peekRecord('person', '2')];
    let [tag1, tag2] = await Promise.all(persons.map(person => get(person, 'tag')));

    assert.equal(get(tag1, 'name'), 'friendly', 'Tom Dale is now friendly');
    assert.equal(get(tag1, 'isLoaded'), true, "Tom Dale's tag is now loaded");

    assert.equal(get(tag2, 'name'), 'nice', 'Bob Dylan is now nice');
    assert.equal(get(tag2, 'isLoaded'), true, "Bob Dylan's tag is now loaded");
  });

  test('async belongsTo relationships work when the data hash has already been loaded', async function(assert) {
    assert.expect(3);

    const Tag = DS.Model.extend({
      name: DS.attr('string'),
    });

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      tag: DS.belongsTo('tag', { async: true }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    store.push({
      data: [
        {
          type: 'tag',
          id: '2',
          attributes: {
            name: 'friendly',
          },
        },
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
          relationships: {
            tag: {
              data: { type: 'tag', id: '2' },
            },
          },
        },
      ],
    });

    let person = await store.peekRecord('person', 1);
    assert.equal(get(person, 'name'), 'Tom Dale', 'The person is now populated');
    let tag = await get(person, 'tag');
    assert.equal(get(tag, 'name'), 'friendly', 'Tom Dale is now friendly');
    assert.equal(get(tag, 'isLoaded'), true, 'Tom Dale is now loaded');
  });

  test('when response to saving a belongsTo is a success but includes changes that reset the users change', async function(assert) {
    const Tag = DS.Model.extend();
    const User = DS.Model.extend({ tag: DS.belongsTo() });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:user', User);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    store.push({
      data: [
        {
          type: 'user',
          id: '1',
          relationships: {
            tag: {
              data: { type: 'tag', id: '1' },
            },
          },
        },
        { type: 'tag', id: '1' },
        { type: 'tag', id: '2' },
      ],
    });

    let user = store.peekRecord('user', '1');

    user.set('tag', store.peekRecord('tag', '2'));

    adapter.updateRecord = function() {
      return {
        data: {
          type: 'user',
          id: '1',
          relationships: {
            tag: {
              data: {
                id: '1',
                type: 'tag',
              },
            },
          },
        },
      };
    };

    user = await user.save();
    assert.equal(user.get('tag.id'), '1', 'expected new server state to be applied');
  });

  test('can create and save a new belongsTo relationship', async function(assert) {
    const Tag = DS.Model.extend();
    const User = DS.Model.extend({ tag: DS.belongsTo() });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:user', User);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    store.push({
      data: [
        {
          type: 'user',
          id: '1',
          relationships: {
            tag: {
              data: { type: 'tag', id: '1' },
            },
          },
        },
        { type: 'tag', id: '1' },
      ],
    });

    let user = store.peekRecord('user', '1');
    assert.equal(user.get('tag.id'), '1', 'has original tag relationship');

    let tag2 = store.createRecord('tag', { id: '2' });

    user.tag = tag2;
    assert.equal(user.get('tag.id'), '2', 'expected client state to be applied');

    tag2 = await user.tag;

    adapter.updateRecord = function() {
      return {
        data: {
          type: 'user',
          id: '1',
          relationships: {
            tag: {
              data: {
                id: '2',
                type: 'tag',
              },
            },
          },
        },
      };
    };

    await user.save();
    assert.equal(user.get('tag.id'), '2', 'expected new server state to be applied');
  });

  test('calling createRecord and passing in an undefined value for a relationship should be treated as if null', async function(assert) {
    assert.expect(1);

    const Tag = DS.Model.extend({
      name: DS.attr('string'),
      person: DS.belongsTo('person', { async: false }),
    });

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      tag: DS.belongsTo('tag', { async: false }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    store.createRecord('person', { id: '1', tag: undefined });

    let person = await store.findRecord('person', '1');
    assert.strictEqual(person.get('tag'), null, 'undefined values should return null relationships');
  });

  test('When finding a hasMany relationship the inverse belongsTo relationship is available immediately', async function(assert) {
    const Occupation = DS.Model.extend({
      description: DS.attr('string'),
      person: DS.belongsTo('person', { async: false }),
    });

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      occupations: DS.hasMany('occupation', { async: true }),
    });

    this.owner.register('model:occupation', Occupation);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    adapter.findMany = function(store, type, ids, snapshots) {
      assert.equal(snapshots[0].belongsTo('person').id, '1');
      return {
        data: [
          { id: 5, type: 'occupation', attributes: { description: 'fifth' } },
          { id: 2, type: 'occupation', attributes: { description: 'second' } },
        ],
      };
    };

    adapter.coalesceFindRequests = true;

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
        relationships: {
          occupations: {
            data: [
              { type: 'occupation', id: '5' },
              { type: 'occupation', id: '2' },
            ],
          },
        },
      },
    });

    let person = await store.findRecord('person', 1);
    assert.equal(get(person, 'isLoaded'), true, 'isLoaded should be true');
    assert.equal(get(person, 'name'), 'Tom Dale', 'the person is still Tom Dale');

    let occupations = await get(person, 'occupations');
    assert.equal(get(occupations, 'length'), 2, 'the list of occupations should have the correct length');

    assert.equal(get(occupations.objectAt(0), 'description'), 'fifth', 'the occupation is the fifth');
    assert.equal(get(occupations.objectAt(0), 'isLoaded'), true, 'the occupation is now loaded');
  });

  test('When finding a belongsTo relationship the inverse belongsTo relationship is available immediately', async function(assert) {
    assert.expect(1);

    const Occupation = DS.Model.extend({
      description: DS.attr('string'),
      person: DS.belongsTo('person', { async: false }),
    });

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      occupation: DS.belongsTo('occupation', { async: true }),
    });

    this.owner.register('model:occupation', Occupation);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function(store, type, id, snapshot) {
      assert.equal(snapshot.belongsTo('person').id, '1');
      return { data: { id: 5, type: 'occupation', attributes: { description: 'fifth' } } };
    };

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
        relationships: {
          occupation: {
            data: { type: 'occupation', id: '5' },
          },
        },
      },
    });

    await store.peekRecord('person', 1).get('occupation');
  });

  test('belongsTo supports relationships to models with id 0', async function(assert) {
    assert.expect(5);

    const Tag = DS.Model.extend({
      name: DS.attr('string'),
      people: DS.hasMany('person', { async: false }),
    });

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      tag: DS.belongsTo('tag', { async: false }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    store.push({
      data: [
        {
          type: 'tag',
          id: '0',
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
            tag: {
              data: { type: 'tag', id: '0' },
            },
          },
        },
      ],
    });

    let person = await store.findRecord('person', 1);
    assert.equal(get(person, 'name'), 'Tom Dale', 'precond - retrieves person record from store');

    assert.equal(get(person, 'tag') instanceof Tag, true, 'the tag property should return a tag');
    assert.equal(get(person, 'tag.name'), 'friendly', 'the tag should have name');

    assert.strictEqual(get(person, 'tag'), get(person, 'tag'), 'the returned object is always the same');
    assert.asyncEqual(
      get(person, 'tag'),
      store.findRecord('tag', 0),
      'relationship object is the same as object retrieved directly'
    );
  });

  testInDebug('belongsTo gives a warning when provided with a serialize option', async function(assert) {
    const Hobby = DS.Model.extend({
      name: DS.attr('string'),
    });

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      hobby: DS.belongsTo('hobby', { serialize: true, async: true }),
    });

    this.owner.register('model:hobby', Hobby);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    store.push({
      data: [
        {
          type: 'hobby',
          id: '1',
          attributes: {
            name: 'fishing',
          },
        },
        {
          type: 'hobby',
          id: '2',
          attributes: {
            name: 'coding',
          },
        },
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
          relationships: {
            hobby: {
              data: { type: 'hobby', id: '1' },
            },
          },
        },
      ],
    });

    let person = await store.findRecord('person', 1);
    assert.expectWarning(() => {
      get(person, 'hobby');
    }, /You provided a serialize option on the "hobby" property in the "person" class, this belongs in the serializer. See Serializer and it's implementations/);
  });

  testInDebug('belongsTo gives a warning when provided with an embedded option', async function(assert) {
    const Hobby = DS.Model.extend({
      name: DS.attr('string'),
    });

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      hobby: DS.belongsTo('hobby', { embedded: true, async: true }),
    });

    this.owner.register('model:hobby', Hobby);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    store.push({
      data: [
        {
          type: 'hobby',
          id: '1',
          attributes: {
            name: 'fishing',
          },
        },
        {
          type: 'hobby',
          id: '2',
          attributes: {
            name: 'coding',
          },
        },
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
          relationships: {
            hobby: {
              data: { type: 'hobby', id: '1' },
            },
          },
        },
      ],
    });

    let person = await store.findRecord('person', 1);
    assert.expectWarning(() => {
      get(person, 'hobby');
    }, /You provided an embedded option on the "hobby" property in the "person" class, this belongs in the serializer. See EmbeddedRecordsMixin/);
  });

  test('belongsTo should be async by default', async function(assert) {
    const Tag = DS.Model.extend({
      name: DS.attr('string'),
      people: DS.hasMany('person', { async: false }),
    });

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      tag: DS.belongsTo('tag'),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    let person = store.createRecord('person');

    assert.ok(person.get('tag') instanceof DS.PromiseObject, 'tag should be an async relationship');
  });
});
