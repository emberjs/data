import { A } from '@ember/array';
import { get, set } from '@ember/object';

import { module, test } from 'qunit';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import { recordIdentifierFor } from '@ember-data/store';

module('unit/model/relationships - RecordArray', function (hooks) {
  setupTest(hooks);

  test('updating the content of a RecordArray updates its content', async function (assert) {
    let Tag = DS.Model.extend({
      name: DS.attr('string'),
    });

    this.owner.register('model:tag', Tag);

    let store = this.owner.lookup('service:store');
    let tags;

    let records = store.push({
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
      ],
    });
    tags = DS.RecordArray.create({
      content: A(records.map((r) => recordIdentifierFor(r)).slice(0, 2)),
      store: store,
      modelName: 'tag',
    });

    let tag = tags.objectAt(0);
    assert.strictEqual(get(tag, 'name'), 'friendly', `precond - we're working with the right tags`);

    set(tags, 'content', A(records.map(recordIdentifierFor).slice(1, 3)));

    tag = tags.objectAt(0);
    assert.strictEqual(get(tag, 'name'), 'smarmy', 'the lookup was updated');
  });

  test('can create child record from a hasMany relationship', async function (assert) {
    assert.expect(3);

    const Tag = DS.Model.extend({
      name: DS.attr('string'),
      person: DS.belongsTo('person', { async: false, inverse: 'tags' }),
    });

    const Person = DS.Model.extend({
      name: DS.attr('string'),
      tags: DS.hasMany('tag', { async: false, inverse: 'person' }),
    });

    this.owner.register('model:tag', Tag);
    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
      },
    });

    let person = await store.findRecord('person', 1);
    person.tags.createRecord({ name: 'cool' });

    assert.strictEqual(get(person, 'name'), 'Tom Dale', 'precond - retrieves person record from store');
    assert.strictEqual(get(person, 'tags.length'), 1, 'tag is added to the parent record');
    assert.strictEqual(get(person, 'tags').objectAt(0).name, 'cool', 'tag values are passed along');
  });
});
