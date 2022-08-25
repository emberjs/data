import { get } from '@ember/object';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

module('unit/model/relationships - RecordArray', function (hooks) {
  setupTest(hooks);

  test('can create child record from a hasMany relationship', async function (assert) {
    assert.expect(3);

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
    assert.strictEqual(get(person, 'tags').at(0).name, 'cool', 'tag values are passed along');
  });
});
