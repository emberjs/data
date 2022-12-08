import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';

module('@ember-data/store | Schemas', function (hooks) {
  setupTest(hooks);

  test('Schema.eachTransformedAttribute works as expected on legacy Model', async function (assert) {
    class User extends Model {
      @attr firstName;
      @attr lastName;
      @attr('string') nickname;
      @attr('email') email;
      @attr('enum') role;
      @attr('number') age;
    }
    const { owner } = this;
    owner.register('model:user', User);
    const store = owner.lookup('service:store');

    const schema = store.modelFor('user');
    const expected = [
      ['nickname', 'string'],
      ['email', 'email'],
      ['role', 'enum'],
      ['age', 'number'],
    ];
    const actual = [];
    schema.eachTransformedAttribute(function (name, type) {
      actual.push([name, type]);
    });
    assert.strictEqual(actual.length, expected.length, 'we have the correct number of attributes');
    assert.deepEqual(actual, expected, 'We have the correct attributes');
  });

  test('Schema.eachTransformedAttribute works as expected on Shim Model', async function (assert) {
    class User extends Model {
      @attr firstName;
      @attr lastName;
      @attr('string') nickname;
      @attr('email') email;
      @attr('enum') role;
      @attr('number') age;
    }
    const { owner } = this;
    owner.register('model:user', User);
    const store = owner.lookup('service:store');

    store._forceShim = true;
    const schema = store.modelFor('user');
    store._forceShim = false;
    const expected = [
      ['nickname', 'string'],
      ['email', 'email'],
      ['role', 'enum'],
      ['age', 'number'],
    ];
    const actual = [];
    schema.eachTransformedAttribute(function (name, type) {
      actual.push([name, type]);
    });
    assert.strictEqual(actual.length, expected.length, 'we have the correct number of attributes');
    assert.deepEqual(actual, expected, 'We have the correct attributes');
  });
});
