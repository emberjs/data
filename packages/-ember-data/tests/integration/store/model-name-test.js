import { computed } from '@ember/object';
import Service, { inject } from '@ember/service';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import Store from '@ember-data/store';

function startsWith(str, substr) {
  if (typeof str.startsWith === 'function') {
    return str.startsWith(substr);
  }
  return str.indexOf(substr) === 0;
}

module('@ember-data/model klass.modelName', function (hooks) {
  setupTest(hooks);

  test('Extending a model properly sets the modelName', function (assert) {
    const { owner } = this;
    class Animal extends Model {
      @attr() species;
    }
    class Pet extends Animal {
      @attr() name;
    }
    class AnimalHelper extends Service {
      @inject store;

      @computed('animal.constructor.modelName')
      get animalModelName() {
        return this.animal.constructor.modelName;
      }
    }
    owner.register('model:animal', Animal);
    owner.register('model:pet', Pet);
    owner.register('service:animal-helper', AnimalHelper);
    owner.register('sercice:store', Store);
    const store = owner.lookup('service:store');
    const animalHelper = owner.lookup('service:animal-helper');

    // first we push the base class
    const snake = store.push({
      data: {
        type: 'animal',
        id: '1',
        attributes: { species: 'snake' },
      },
    });

    // then we do a thing that could install a MandatorySetter
    // on the modelName property on the `Animal` class.
    animalHelper.set('animal', snake);
    assert.strictEqual(snake.constructor.modelName, 'animal', 'Snake has the right modelName');
    assert.strictEqual(animalHelper.animalModelName, 'animal', 'We got the modelName');

    // ensure modelName is immutable
    try {
      snake.constructor.modelName = 'bear';
      assert.ok(false, 'expected modelName to be immutable');
    } catch (e) {
      assert.true(
        startsWith(e.message, `Cannot assign to read only property 'modelName' of `) ||
          // Firefox has a different message
          startsWith(e.message, `"modelName" is read-only`) ||
          // Safari aso has a different message
          startsWith(e.message, `Attempted to assign to readonly property`),
        `modelName is immutable: ${e.message}`
      );
    }

    // this will error if we installed a MandatorySetter
    // when we try to set the modelName property on the `Pet` class.
    try {
      const fido = store.push({
        data: {
          type: 'pet',
          id: '1',
          attribute: { species: 'dog', name: 'fido' },
        },
      });

      assert.strictEqual(fido.constructor.modelName, 'pet', 'Fido has the right modelName');
      assert.strictEqual(snake.constructor.modelName, 'animal', 'Snake has the right modelName');
      assert.strictEqual(animalHelper.animalModelName, 'animal', 'AnimalHelper has the right modelName');
    } catch (e) {
      assert.ok(
        false,
        `Failed to add fido to the store, likely encountered an unexpected MandatorySetter. Full error below:\n\n${e.message}`
      );
    }
  });
});
