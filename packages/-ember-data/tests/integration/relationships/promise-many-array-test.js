import { A } from '@ember/array';
import { w } from '@ember/string';

import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import Model, { attr, hasMany } from '@ember-data/model';

module('PromiseManyArray side-affected by EmberArray', (hooks) => {
  setupRenderingTest(hooks);

  test('PromiseManyArray is not side-affected by EmberArray', async function (assert) {
    const { owner } = this;
    class Person extends Model {
      @attr('string') name;
    }
    class Group extends Model {
      @hasMany('person', { inverse: null }) members;
    }
    owner.register('model:person', Person);
    owner.register('model:group', Group);
    const store = owner.lookup('service:store');
    const members = w('Bob John Michael Larry Lucy').map((name) => store.createRecord('person', { name }));
    const group = store.createRecord('group', { members });

    const replaceFn = group.members.replace;
    assert.strictEqual(group.members.length, 5, 'initial length is correct');

    group.members.replace(0, 1);
    assert.strictEqual(group.members.length, 4, 'updated length is correct');

    A(group.members);

    assert.strictEqual(replaceFn, group.members.replace, 'we have the same function for replace');
    group.members.replace(0, 1);
    assert.strictEqual(group.members.length, 3, 'updated length is correct');
  });
});
