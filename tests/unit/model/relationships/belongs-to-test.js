import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

const { get, run } = Ember;

module('unit/model/relationships - DS.belongsTo');

test('belongsTo lazily loads relationships as needed', function(assert) {
  assert.expect(5);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;

  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    store.push({
      data: [{
        type: 'tag',
        id: '5',
        attributes: {
          name: 'friendly'
        }
      }, {
        type: 'tag',
        id: '2',
        attributes: {
          name: 'smarmy'
        }
      }, {
        type: 'tag',
        id: '12',
        attributes: {
          name: 'oohlala'
        }
      }, {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          tag: {
            data: { type: 'tag', id: '5' }
          }
        }
      }]
    });
  });

  return run(() => {
    return store.findRecord('person', 1).then(person => {
      assert.equal(get(person, 'name'), 'Tom Dale', 'precond - retrieves person record from store');

      assert.equal(get(person, 'tag') instanceof Tag, true, 'the tag property should return a tag');
      assert.equal(get(person, 'tag.name'), 'friendly', 'the tag shuld have name');

      assert.strictEqual(get(person, 'tag'), get(person, 'tag'), 'the returned object is always the same');
      assert.asyncEqual(get(person, 'tag'), store.findRecord('tag', 5), 'relationship object is the same as object retrieved directly');
    });
  });
});

test('belongsTo does not notify when it is initially reified', function(assert) {
  assert.expect(1);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });
  Tag.toString = () => 'Tag';

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });
  Person.toString = () => 'Person';

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;

  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    store.push({
      data: [{
        type: 'tag',
        id: 1,
        attributes: {
          name: 'whatever'
        }
      }, {
        type: 'person',
        id: 2,
        attributes: {
          name: 'David J. Hamilton'
        },
        relationships: {
          tag: {
            data: {
              type: 'tag',
              id: '1'
            }
          }
        }
      }]
    });
  });

  return run(() => {
    let person = store.peekRecord('person', 2);
    person.addObserver('tag', () => {
      assert.ok(false, 'observer is not called');
    })

    assert.equal(person.get('tag.name'), 'whatever', 'relationship is correct');
  });
});

test('async belongsTo relationships work when the data hash has not been loaded', function(assert) {
  assert.expect(5);

  const Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: true })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;

  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (type === Person) {
      assert.equal(id, 1, 'id should be 1');

      return { data: { id: 1, type: 'person', attributes: { name: 'Tom Dale' }, relationships: { tag: { data: { id: 2, type: 'tag' } } } } };
    } else if (type === Tag) {
      assert.equal(id, 2, 'id should be 2');

      return { data: { id: 2, type: 'tag', attributes: { name: 'friendly' } } };
    }
  };

  return run(() => {
    return store.findRecord('person', 1).then(person => {
      assert.equal(get(person, 'name'), 'Tom Dale', 'The person is now populated');

      return run(() => {
        return get(person, 'tag');
      });
    }).then(tag => {
      assert.equal(get(tag, 'name'), 'friendly', 'Tom Dale is now friendly');
      assert.equal(get(tag, 'isLoaded'), true, 'Tom Dale is now loaded');
    });
  });
});

test('async belongsTo relationships work when the data hash has already been loaded', function(assert) {
  assert.expect(3);

  const Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: true })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  run(() => {
    store.push({
      data: [{
        type: 'tag',
        id: '2',
        attributes: {
          name: 'friendly'
        }
      }, {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          tag: {
            data: { type: 'tag', id: '2' }
          }
        }
      }]
    });
  });

  return run(() => {
    let person = store.peekRecord('person', 1);
    assert.equal(get(person, 'name'), 'Tom Dale', 'The person is now populated');
    return run(() => {
      return get(person, 'tag');
    }).then(tag => {
      assert.equal(get(tag, 'name'), 'friendly', 'Tom Dale is now friendly');
      assert.equal(get(tag, 'isLoaded'), true, 'Tom Dale is now loaded');
    });
  });
});

test('when response to saving a belongsTo is a success but includes changes that reset the users change', function(assert) {
  const Tag = DS.Model.extend();
  const User = DS.Model.extend({ tag: DS.belongsTo() });
  let env = setupStore({ user: User, tag: Tag });
  let { store } = env;

  run(() => {
    store.push({
      data: [
        { type: 'user',
          id: '1',
          relationships: {
            tag: {
              data: { type: 'tag', id: '1' }
            }
          }
        },
        { type: 'tag', id: '1' },
        { type: 'tag', id: '2' }
      ]
    });
  });

  let user = store.peekRecord('user', '1');

  run(() => user.set('tag', store.peekRecord('tag', '2')));

  env.adapter.updateRecord = function() {
    return {
      data: {
        type: 'user',
        id: '1',
        relationships: {
          tag: {
            data: {
              id: '1',
              type: 'tag'
            }
          }
        }
      }
    };
  };

  return run(() => {
    return user.save().then(user => {
      assert.equal(user.get('tag.id'), '1', 'expected new server state to be applied');
    });
  });
});

test('calling createRecord and passing in an undefined value for a relationship should be treated as if null', function(assert) {
  assert.expect(1);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => store.createRecord('person', { id: 1, tag: undefined }));

  return run(() => {
    return store.findRecord('person', 1).then(person => {
      assert.strictEqual(person.get('tag'), null, 'undefined values should return null relationships');
    });
  });
});

test('When finding a hasMany relationship the inverse belongsTo relationship is available immediately', function(assert) {
  const Occupation = DS.Model.extend({
    description: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    occupations: DS.hasMany('occupation', { async: true })
  });

  let env = setupStore({ occupation: Occupation, person: Person });
  let { store } = env;
  env.adapter.shouldBackgroundReloadRecord = () => false;

  env.adapter.findMany = function(store, type, ids, snapshots) {
    assert.equal(snapshots[0].belongsTo('person').id, '1');
    return { data: [
      { id: 5, type: 'occupation', attributes: { description: "fifth" } },
      { id: 2, type: 'occupation', attributes: { description: "second" } }
    ]};
  };

  env.adapter.coalesceFindRequests = true;

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          occupations: {
            data: [
              { type: 'occupation', id: '5' },
              { type: 'occupation', id: '2' }
            ]
          }
        }
      }
    });
  });

  return run(() => {
    return store.findRecord('person', 1).then(person => {
      assert.equal(get(person, 'isLoaded'), true, 'isLoaded should be true');
      assert.equal(get(person, 'name'), 'Tom Dale', 'the person is still Tom Dale');

      return get(person, 'occupations');
    }).then(occupations => {
      assert.equal(get(occupations, 'length'), 2, 'the list of occupations should have the correct length');

      assert.equal(get(occupations.objectAt(0), 'description'), 'fifth', 'the occupation is the fifth');
      assert.equal(get(occupations.objectAt(0), 'isLoaded'), true, 'the occupation is now loaded');
    });
  });
});

test('When finding a belongsTo relationship the inverse belongsTo relationship is available immediately', function(assert) {
  assert.expect(1);

  const Occupation = DS.Model.extend({
    description: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    occupation: DS.belongsTo('occupation', { async: true })
  });

  let env = setupStore({ occupation: Occupation, person: Person });
  let store = env.store;

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(snapshot.belongsTo('person').id, '1');
    return { data: { id: 5, type: 'occupation', attributes: { description: 'fifth' } } };
  };

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          occupation: {
            data: { type: 'occupation', id: '5' }
          }
        }
      }
    });
  });

  run(() => store.peekRecord('person', 1).get('occupation'));
});

test('belongsTo supports relationships to models with id 0', function(assert) {
  assert.expect(5);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let store = env.store;

  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    store.push({
      data: [{
        type: 'tag',
        id: '0',
        attributes: {
          name: 'friendly'
        }
      }, {
        type: 'tag',
        id: '2',
        attributes: {
          name: 'smarmy'
        }
      }, {
        type: 'tag',
        id: '12',
        attributes: {
          name: 'oohlala'
        }
      }, {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          tag: {
            data: { type: 'tag', id: '0' }
          }
        }
      }]
    });
  });

  return run(() => {
    return store.findRecord('person', 1).then(person => {
      assert.equal(get(person, 'name'), 'Tom Dale', 'precond - retrieves person record from store');

      assert.equal(get(person, 'tag') instanceof Tag, true, 'the tag property should return a tag');
      assert.equal(get(person, 'tag.name'), "friendly", 'the tag should have name');

      assert.strictEqual(get(person, 'tag'), get(person, 'tag'), 'the returned object is always the same');
      assert.asyncEqual(get(person, 'tag'), store.findRecord('tag', 0), 'relationship object is the same as object retrieved directly');
    });
  });
});

testInDebug('belongsTo gives a warning when provided with a serialize option', function(assert) {
  const Hobby = DS.Model.extend({
    name: DS.attr('string')
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    hobby: DS.belongsTo('hobby', { serialize: true, async: true })
  });

  let env = setupStore({ hobby: Hobby, person: Person });
  let store = env.store;

  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    store.push({
      data: [{
        type: 'hobby',
        id: '1',
        attributes: {
          name: 'fishing'
        }
      }, {
        type: 'hobby',
        id: '2',
        attributes: {
          name: 'coding'
        }
      }, {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          hobby: {
            data: { type: 'hobby', id: '1' }
          }
        }
      }]
    });
  });

  return run(() => {
    return store.findRecord('person', 1).then(person =>{
      assert.expectWarning(() => {
        get(person, 'hobby');
      }, /You provided a serialize option on the "hobby" property in the "person" class, this belongs in the serializer. See DS.Serializer and it's implementations/);
    });
  });
});

testInDebug("belongsTo gives a warning when provided with an embedded option", function(assert) {
  const Hobby = DS.Model.extend({
    name: DS.attr('string')
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    hobby: DS.belongsTo('hobby', { embedded: true, async: true })
  });

  let env = setupStore({ hobby: Hobby, person: Person });
  let { store } = env;

  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    store.push({
      data: [{
        type: 'hobby',
        id: '1',
        attributes: {
          name: 'fishing'
        }
      }, {
        type: 'hobby',
        id: '2',
        attributes: {
          name: 'coding'
        }
      }, {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          hobby: {
            data: { type: 'hobby', id: '1' }
          }
        }
      }]
    });
  });

  return run(() => {
    return store.findRecord('person', 1).then(person => {
      assert.expectWarning(() => {
        get(person, 'hobby');
      }, /You provided an embedded option on the "hobby" property in the "person" class, this belongs in the serializer. See DS.EmbeddedRecordsMixin/);
    });
  });
});

test('DS.belongsTo should be async by default', function(assert) {
  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag')
  });

  let env = setupStore({ tag: Tag, person: Person });
  let { store }  = env;

  run(() => {
    let person = store.createRecord('person');

    assert.ok(person.get('tag') instanceof DS.PromiseObject, 'tag should be an async relationship');
  });
});
