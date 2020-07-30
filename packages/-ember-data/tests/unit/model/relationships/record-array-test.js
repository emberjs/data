import { A } from '@ember/array';
import { get, set } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import { RECORD_ARRAY_MANAGER_IDENTIFIERS } from '@ember-data/canary-features';
import { recordIdentifierFor } from '@ember-data/store';

if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
  module('unit/model/relationships - RecordArray', function(hooks) {
    setupTest(hooks);

    test('updating the content of a RecordArray updates its content', async function(assert) {
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
        content: A(records.map(r => recordIdentifierFor(r)).slice(0, 2)),
        store: store,
        modelName: 'tag',
      });

      let tag = tags.objectAt(0);
      assert.equal(get(tag, 'name'), 'friendly', `precond - we're working with the right tags`);

      set(
        tags,
        'content',
        A(
          records
            .map(r => r._internalModel)
            .slice(1, 3)
            .map(im => im.identifier)
        )
      );

      tag = tags.objectAt(0);
      assert.equal(get(tag, 'name'), 'smarmy', 'the lookup was updated');
    });

    test('can create child record from a hasMany relationship', async function(assert) {
      assert.expect(3);

      const Tag = DS.Model.extend({
        name: DS.attr('string'),
        person: DS.belongsTo('person', { async: false }),
      });

      const Person = DS.Model.extend({
        name: DS.attr('string'),
        tags: DS.hasMany('tag', { async: false }),
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
      person.get('tags').createRecord({ name: 'cool' });

      assert.equal(get(person, 'name'), 'Tom Dale', 'precond - retrieves person record from store');
      assert.equal(get(person, 'tags.length'), 1, 'tag is added to the parent record');
      assert.equal(
        get(person, 'tags')
          .objectAt(0)
          .get('name'),
        'cool',
        'tag values are passed along'
      );
    });
  });
} else {
  module('unit/model/relationships - RecordArray', function(hooks) {
    setupTest(hooks);

    test('updating the content of a RecordArray updates its content', function(assert) {
      let Tag = DS.Model.extend({
        name: DS.attr('string'),
      });

      this.owner.register('model:tag', Tag);

      let store = this.owner.lookup('service:store');
      let tags;
      let internalModels;

      run(() => {
        internalModels = store._push({
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
          content: A(internalModels.slice(0, 2)),
          store: store,
          modelName: 'tag',
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
        person: DS.belongsTo('person', { async: false }),
      });

      const Person = DS.Model.extend({
        name: DS.attr('string'),
        tags: DS.hasMany('tag', { async: false }),
      });

      this.owner.register('model:tag', Tag);
      this.owner.register('model:person', Person);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.shouldBackgroundReloadRecord = () => false;

      run(() => {
        store.push({
          data: {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Tom Dale',
            },
          },
        });
      });

      return run(() => {
        return store.findRecord('person', 1).then(person => {
          person.get('tags').createRecord({ name: 'cool' });

          assert.equal(get(person, 'name'), 'Tom Dale', 'precond - retrieves person record from store');
          assert.equal(get(person, 'tags.length'), 1, 'tag is added to the parent record');
          assert.equal(
            get(person, 'tags')
              .objectAt(0)
              .get('name'),
            'cool',
            'tag values are passed along'
          );
        });
      });
    });
  });
}
