import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import Store from 'ember-data/store';
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import { belongsTo, hasMany } from 'ember-data/relationships';

class Group extends Model {
  @belongsTo person;
}
class Pet extends Model {
  @belongsTo person;
}
class Car extends Model {
  @belongsTo person;
}
class Table extends Model {
  @belongsTo person;
}
class Person extends Model {
  @attr attrWithoutParens;
  @attr() attrWithParens;
  @attr('string') attrWithType;
  @attr({ defaultValue: `and if you don't keep your feet,` }) attrWithDefaultValue;
  @attr('string', { defaultValue: `there's no knowing where you might be swept off to.` })
  attrWithTypeAndDefaultValue;

  // belongsTo no parens
  @belongsTo group;
  // belongsTo One Arg
  @belongsTo('car') belongsToWithType;
  @belongsTo({ inverse: null }) pet;
  // belongsTo two Args
  @belongsTo('person', { inverse: 'belongsToWithTypeAndInverse' })
  belongsToWithTypeAndInverse;

  // hasMany no parens
  @hasMany tables;
  // hasMany one Arg
  @hasMany('pet')
  hasManyWithType;
  // hasMany two args
  @hasMany('person', { inverse: 'friends' }) hasManyWithTypeAndInverse;
}

module('Decorators', function(hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function() {
    let { owner } = this;
    owner.register('service:store', Store);
    owner.register('model:person', Person);
    owner.register('model:group', Group);
    owner.register('model:pet', Pet);
    owner.register('model:car', Car);
    owner.register('model:table', Table);
    store = owner.lookup('service:store');
  });

  test('@attr', async function(assert) {
    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          attrWithoutParens: `It's a dangerous business,`,
          attrWithParens: 'Frodo, going out your door.',
          attrWithType: 'You step onto the road,',
          attrWithDefaultValue: null,
          attrWithTypeAndDefaultValue: null,
        },
      },
    });

    let quote = `${person.attrWithoutParens} ${person.attrWithParens} ${person.attrWithType} ${
      person.attrWithDefaultValue
    } ${person.attrWithTypeAndDefaultValue}`;

    const fullQuote = `It's a dangerous business, Frodo, going out your door. You step onto the road, and if you don't keep your feet, there's no knowing where you might be swept off to.`;

    assert.equal(quote, fullQuote, 'Attrs work as expected');
  });

  test('@belongsTo', async function(assert) {
    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          group: { data: { type: 'group', id: '1' } },
          pet: { data: { type: 'pet', id: '1' } },
          belongsToWithType: { data: { type: 'car', id: '1' } },
          belongsToWithTypeAndInverse: { data: { type: 'person', id: '2' } },
        },
      },
      included: [
        {
          type: 'group',
          id: '1',
          relationships: {
            person: { data: { type: 'person', id: '1' } },
          },
        },
        {
          type: 'pet',
          id: '1',
          attributes: {},
        },
        {
          type: 'car',
          id: '1',
          relationships: {
            person: { data: { type: 'person', id: '1' } },
          },
        },
        {
          type: 'person',
          id: '2',
          relationships: {
            belongsToWithTypeAndInverse: { data: { type: 'person', id: '1' } },
          },
        },
      ],
    });
    const group = store.peekRecord('group', '1');
    const car = store.peekRecord('car', '1');
    const pet = store.peekRecord('pet', '1');
    const person2 = store.peekRecord('person', '2');

    const personGroup = await person.group;
    const personPet = await person.pet;
    const personCar = await person.belongsToWithType;
    const personPerson = await person.belongsToWithTypeAndInverse;

    assert.ok(
      personGroup === group,
      'We configured the relationship corectly without parens on the decorator'
    );
    assert.ok(
      personCar === car,
      'We configured the relationship correctly when the decorator is given the type'
    );
    assert.ok(
      personPet === pet,
      'We configured the relationship correctly when the decorator is given only the inverse'
    );
    assert.ok(
      personPerson === person2,
      'We configured the relationship correctly when the decorator is given a type and inverse'
    );
  });

  // test('@hasMany', async function() {});
});
