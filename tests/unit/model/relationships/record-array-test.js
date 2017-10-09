import { A } from '@ember/array';
import { set, get } from '@ember/object';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

module('unit/model/relationships - RecordArray');

test('updating the content of a RecordArray updates its content', function(assert) {
  let Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  let env = setupStore({ tag: Tag });
  let store = env.store;
  let tags;
  let internalModels;

  run(() => {
    internalModels = store._push({
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
      }]
    });
    tags = DS.RecordArray.create({
      content: A(internalModels.slice(0, 2)),
      store: store,
      modelName: 'tag'
    });
  });

  let tag = tags.objectAt(0);
  assert.equal(get(tag, 'name'), 'friendly', `precond - we're working with the right tags`);

  run(() => set(tags, 'content', A(internalModels.slice(1, 3))));

  tag = tags.objectAt(0);
  assert.equal(get(tag, 'name'), 'smarmy', 'the lookup was updated');
});

test('can create child record from a hasMany relationship', function(assert) {
  assert.expect(3);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;

  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        }
      }
    });
  });

  return run(() => {
    return store.findRecord('person', 1).then(person => {
      person.get('tags').createRecord({ name: 'cool' });

      assert.equal(get(person, 'name'), 'Tom Dale', 'precond - retrieves person record from store');
      assert.equal(get(person, 'tags.length'), 1, 'tag is added to the parent record');
      assert.equal(get(person, 'tags').objectAt(0).get('name'), 'cool', 'tag values are passed along');
    });
  });
});
