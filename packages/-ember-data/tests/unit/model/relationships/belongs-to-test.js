import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { Promise } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('unit/model/relationships - belongsTo', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('belongsTo lazily loads relationships as needed', async function (assert) {
    assert.expect(5);

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
    const person = await store.findRecord('person', '1');
    assert.strictEqual(get(person, 'name'), 'Tom Dale', 'precond - retrieves person record from store');

    assert.true(person.tag instanceof Tag, 'the tag property should return a tag');
    assert.strictEqual(person.tag.name, 'friendly', 'the tag shuld have name');

    assert.strictEqual(person.tag, person.tag, 'the returned object is always the same');
    assert.strictEqual(
      person.tag,
      await store.findRecord('tag', 5),
      'relationship object is the same as object retrieved directly'
    );
  });

  test('belongsTo does not notify when it is initially reified', function (assert) {
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
          },
          {
            type: 'person',
            id: '2',
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
    });

    return run(() => {
      let person = store.peekRecord('person', 2);

      let tagDidChange = () => assert.ok(false, 'observer is not called');

      person.addObserver('tag', tagDidChange);

      assert.strictEqual(person.tag.name, 'whatever', 'relationship is correct');

      // This needs to be removed so it is not triggered when test context is torn down
      person.removeObserver('tag', tagDidChange);
    });
  });

  test('async belongsTo relationships work when the data hash has not been loaded', function (assert) {
    assert.expect(5);

    const Tag = Model.extend({
      name: attr('string'),
    });

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: true, inverse: null }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      if (type === Person) {
        assert.strictEqual(id, '1', 'id should be 1');

        return {
          data: {
            id: '1',
            type: 'person',
            attributes: { name: 'Tom Dale' },
            relationships: { tag: { data: { id: '2', type: 'tag' } } },
          },
        };
      } else if (type === Tag) {
        assert.strictEqual(id, '2', 'id should be 2');

        return { data: { id: '2', type: 'tag', attributes: { name: 'friendly' } } };
      }
    };

    return run(() => {
      return store
        .findRecord('person', 1)
        .then((person) => {
          assert.strictEqual(get(person, 'name'), 'Tom Dale', 'The person is now populated');

          return run(() => {
            return get(person, 'tag');
          });
        })
        .then((tag) => {
          assert.strictEqual(get(tag, 'name'), 'friendly', 'Tom Dale is now friendly');
          assert.true(get(tag, 'isLoaded'), 'Tom Dale is now loaded');
        });
    });
  });

  test('async belongsTo relationships are not grouped with coalesceFindRequests=false', async function (assert) {
    assert.expect(6);

    const Tag = Model.extend({
      name: attr('string'),
    });

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: true, inverse: null }),
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

    adapter.findMany = function () {
      throw new Error('findMany should not be called');
    };

    adapter.findRecord = function (store, type, id) {
      assert.strictEqual(type.modelName, 'tag', 'modelName is tag');

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
    let [tag1, tag2] = await Promise.all(persons.map((person) => get(person, 'tag')));

    assert.strictEqual(get(tag1, 'name'), 'friendly', 'Tom Dale is now friendly');
    assert.true(get(tag1, 'isLoaded'), "Tom Dale's tag is now loaded");

    assert.strictEqual(get(tag2, 'name'), 'nice', 'Bob Dylan is now nice');
    assert.true(get(tag2, 'isLoaded'), "Bob Dylan's tag is now loaded");
  });

  test('async belongsTo relationships are grouped with coalesceFindRequests=true', async function (assert) {
    assert.expect(6);

    const Tag = Model.extend({
      name: attr('string'),
    });

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: true, inverse: null }),
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

    adapter.findMany = function (store, type, ids, snapshots) {
      assert.strictEqual(type.modelName, 'tag', 'modelName is tag');
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

    adapter.findRecord = function () {
      throw new Error('findRecord should not be called');
    };

    let persons = [store.peekRecord('person', '1'), store.peekRecord('person', '2')];
    let [tag1, tag2] = await Promise.all(persons.map((person) => get(person, 'tag')));

    assert.strictEqual(get(tag1, 'name'), 'friendly', 'Tom Dale is now friendly');
    assert.true(get(tag1, 'isLoaded'), "Tom Dale's tag is now loaded");

    assert.strictEqual(get(tag2, 'name'), 'nice', 'Bob Dylan is now nice');
    assert.true(get(tag2, 'isLoaded'), "Bob Dylan's tag is now loaded");
  });

  test('async belongsTo relationships work when the data hash has already been loaded', function (assert) {
    assert.expect(3);

    const Tag = Model.extend({
      name: attr('string'),
    });

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: true, inverse: null }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    run(() => {
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
    });

    return run(() => {
      let person = store.peekRecord('person', 1);
      assert.strictEqual(get(person, 'name'), 'Tom Dale', 'The person is now populated');
      return run(() => {
        return get(person, 'tag');
      }).then((tag) => {
        assert.strictEqual(get(tag, 'name'), 'friendly', 'Tom Dale is now friendly');
        assert.true(get(tag, 'isLoaded'), 'Tom Dale is now loaded');
      });
    });
  });

  test('when response to saving a belongsTo is a success but includes changes that reset the users change', async function (assert) {
    const Tag = Model.extend({
      label: attr(),
    });
    const User = Model.extend({
      tag: belongsTo('tag', { async: false, inverse: null }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:user', User);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const [user, tag1, tag2] = store.push({
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
        { type: 'tag', id: '1', attributes: { label: 'A' } },
        { type: 'tag', id: '2', attributes: { label: 'B' } },
      ],
    });

    assert.strictEqual(tag1.label, 'A', 'tag1 is loaded');
    assert.strictEqual(tag2.label, 'B', 'tag2 is loaded');
    assert.strictEqual(user.tag.id, '1', 'user starts with tag1 as tag');

    user.set('tag', tag2);

    assert.strictEqual(user.tag.id, '2', 'user tag updated to tag2');

    adapter.updateRecord = function () {
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

    await user.save();
    assert.strictEqual(user.tag.id, '1', 'expected new server state to be applied');
  });

  test('calling createRecord and passing in an undefined value for a relationship should be treated as if null', function (assert) {
    assert.expect(1);

    const Tag = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: 'tag' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: false, inverse: 'person' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    store.createRecord('person', { id: '1', tag: undefined });

    return run(() => {
      return store.findRecord('person', '1').then((person) => {
        assert.strictEqual(person.tag, null, 'undefined values should return null relationships');
      });
    });
  });

  test('When finding a hasMany relationship the inverse belongsTo relationship is available immediately', function (assert) {
    const Occupation = Model.extend({
      description: attr('string'),
      person: belongsTo('person', { async: false, inverse: 'occupations' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      occupations: hasMany('occupation', { async: true, inverse: 'person' }),
    });

    this.owner.register('model:occupation', Occupation);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    adapter.findMany = function (store, type, ids, snapshots) {
      assert.strictEqual(snapshots[0].belongsTo('person').id, '1');
      return {
        data: [
          { id: '5', type: 'occupation', attributes: { description: 'fifth' } },
          { id: '2', type: 'occupation', attributes: { description: 'second' } },
        ],
      };
    };

    adapter.coalesceFindRequests = true;

    run(() => {
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
    });

    return run(() => {
      return store
        .findRecord('person', 1)
        .then((person) => {
          assert.true(get(person, 'isLoaded'), 'isLoaded should be true');
          assert.strictEqual(get(person, 'name'), 'Tom Dale', 'the person is still Tom Dale');

          return get(person, 'occupations');
        })
        .then((occupations) => {
          assert.strictEqual(get(occupations, 'length'), 2, 'the list of occupations should have the correct length');

          assert.strictEqual(get(occupations.at(0), 'description'), 'fifth', 'the occupation is the fifth');
          assert.true(get(occupations.at(0), 'isLoaded'), 'the occupation is now loaded');
        });
    });
  });

  test('When finding a belongsTo relationship the inverse belongsTo relationship is available immediately', function (assert) {
    assert.expect(1);

    const Occupation = Model.extend({
      description: attr('string'),
      person: belongsTo('person', { async: false, inverse: 'occupation' }),
    });

    const Person = Model.extend({
      name: attr('string'),
      occupation: belongsTo('occupation', { async: true, inverse: 'person' }),
    });

    this.owner.register('model:occupation', Occupation);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(snapshot.belongsTo('person').id, '1');
      return { data: { id: '5', type: 'occupation', attributes: { description: 'fifth' } } };
    };

    run(() => {
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
    });

    run(() => store.peekRecord('person', 1).occupation);
  });

  test('belongsTo supports relationships to models with id 0', async function (assert) {
    assert.expect(5);

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

    const person = await store.findRecord('person', '1');
    assert.strictEqual(person.name, 'Tom Dale', 'precond - retrieves person record from store');

    assert.true(person.tag instanceof Tag, 'the tag property should return a tag');
    assert.strictEqual(person.tag.name, 'friendly', 'the tag should have name');

    assert.strictEqual(person.tag, person.tag, 'the returned object is always the same');
    assert.strictEqual(
      person.tag,
      await store.findRecord('tag', 0),
      'relationship object is the same as object retrieved directly'
    );
  });

  testInDebug('belongsTo gives a warning when provided with a serialize option', function (assert) {
    const Hobby = Model.extend({
      name: attr('string'),
    });

    const Person = Model.extend({
      name: attr('string'),
      hobby: belongsTo('hobby', { serialize: true, async: true, inverse: null }),
    });

    this.owner.register('model:hobby', Hobby);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    run(() => {
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
    });

    return run(() => {
      return store.findRecord('person', 1).then((person) => {
        assert.expectWarning(() => {
          get(person, 'hobby');
        }, /You provided a serialize option on the "hobby" property in the "person" class, this belongs in the serializer. See Serializer and it's implementations/);
      });
    });
  });

  testInDebug('belongsTo gives a warning when provided with an embedded option', function (assert) {
    const Hobby = Model.extend({
      name: attr('string'),
    });

    const Person = Model.extend({
      name: attr('string'),
      hobby: belongsTo('hobby', { embedded: true, inverse: null, async: true }),
    });

    this.owner.register('model:hobby', Hobby);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    run(() => {
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
    });

    return run(() => {
      return store.findRecord('person', 1).then((person) => {
        assert.expectWarning(() => {
          get(person, 'hobby');
        }, /You provided an embedded option on the "hobby" property in the "person" class, this belongs in the serializer. See EmbeddedRecordsMixin/);
      });
    });
  });

  test('belongsTo should be async by default', async function (assert) {
    class Tag extends Model {
      @attr name;
      @hasMany('person', { async: false, inverse: 'tag' }) people;
    }

    const Person = Model.extend({
      name: attr('string'),
      tag: belongsTo('tag', { async: true, inverse: 'people' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    const theTag = store.push({ data: { type: 'tag', id: '1', attributes: { name: 'ember' } } });
    let person = store.createRecord('person', { tag: theTag });
    const personTag = person.tag;
    assert.ok(personTag.then, 'tag should be an async relationship');
    const tag = await personTag;
    assert.notStrictEqual(personTag, tag, 'we are not the proxy');
    assert.strictEqual(theTag, tag, 'we are the instance');
    assert.true(tag instanceof Tag, 'we are an instance of Tag');
  });
});
