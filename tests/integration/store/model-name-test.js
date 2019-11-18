import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { computed } from '@ember/object';
import Service, { inject } from '@ember/service';
import DS from 'ember-data';

module('@ember-data/model klass.modelName', function(hooks) {
  setupTest(hooks);

  test('Extending a model properly sets the modelName', function(assert) {
    const { owner } = this;
    let Animal = DS.Model.extend({
      species: DS.attr(),
    });

    let Pet = DS.Model.extend({
      name: DS.attr(),
    });

    let AnimalHelper = Service.extend({
      store: inject(),
      name: DS.attr(),
      animalModelName: Ember.computed('animal.constructor.modelName', function() {
        return this.animal.constructor.modelName;
      }),
    });

    owner.register('model:animal', Animal);
    owner.register('model:pet', Pet);
    owner.register('service:animal-helper', AnimalHelper);
    owner.register('sercice:store', DS.Store);
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
    assert.strictEqual(animalHelper.get('animalModelName'), 'animal', 'We got the modelName');

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
      assert.strictEqual(
        animalHelper.get('animalModelName'),
        'animal',
        'AnimalHelper has the right modelName'
      );
    } catch (e) {
      assert.ok(
        false,
        `Failed to add fido to the store, likely encountered an unexpected MandatorySetter. Full error below:\n\n${e.message}`
      );
    }
  });
});
