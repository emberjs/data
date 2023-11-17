import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

const Author = Model.extend({
  name: attr('string'),
});

const Post = Model.extend({
  author: belongsTo('author', { async: true, inverse: null }),
});

class Person extends Model {
  @attr('string') firstName;
  @attr('string') lastName;
  @hasMany('person', { async: true, inverse: 'siblings' }) siblings;
}

const sibling1 = {
  type: 'person',
  id: '1',
  attributes: {
    firstName: 'Dogzn',
    lastName: 'Katz',
  },
};

const sibling1Ref = {
  type: 'person',
  id: '1',
};

const sibling2 = {
  type: 'person',
  id: '2',
  attributes: {
    firstName: 'Katzn',
    lastName: 'Dogz',
  },
};

const sibling2Ref = {
  type: 'person',
  id: '2',
};

module('integration/records/relationship-changes - Relationship changes', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:author', Author);
    this.owner.register('model:person', Person);
    this.owner.register('model:post', Post);

    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('Calling push with relationship triggers observers once if the relationship was not empty and was added to', async function (assert) {
    assert.expect(2);

    const store = this.owner.lookup('service:store');
    let observerCount = 0;

    const person = store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz',
        },
        relationships: {
          siblings: {
            data: [sibling1Ref],
          },
        },
      },
      included: [sibling1],
    });

    person.addObserver('siblings.[]', function () {
      assert.ok(true, 'array observer fired');
      observerCount++;
    });

    // prime the pump
    await person.siblings;

    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {},
        relationships: {
          siblings: {
            data: [sibling1Ref, sibling2Ref],
          },
        },
      },
      included: [sibling2],
    });

    await settled();

    assert.ok(observerCount >= 1, 'siblings observer should be triggered at least once');
  });

  test('Calling push with relationship triggers observers once if the relationship was made shorter', async function (assert) {
    assert.expect(2);

    const store = this.owner.lookup('service:store');
    let observerCount = 0;

    const person = store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz',
        },
        relationships: {
          siblings: {
            data: [sibling1Ref],
          },
        },
      },
      included: [sibling1],
    });

    person.addObserver('siblings.[]', function () {
      assert.ok(true, 'array observer fired');
      observerCount++;
    });
    // prime the pump
    await person.siblings;

    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {},
        relationships: {
          siblings: {
            data: [],
          },
        },
      },
      included: [],
    });

    await settled();

    assert.ok(observerCount >= 1, 'siblings observer should be triggered at least once');
  });

  test('Calling push with relationship triggers observers once if the relationship was reordered', async function (assert) {
    assert.expect(2);

    const store = this.owner.lookup('service:store');
    let observerCount = 0;

    const person = store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz',
        },
        relationships: {
          siblings: {
            data: [sibling1Ref, sibling2Ref],
          },
        },
      },
      included: [sibling1, sibling2],
    });

    person.addObserver('siblings.[]', function () {
      assert.ok(true, 'we triggered');
      observerCount++;
    });
    // prime the pump
    await person.siblings;

    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {},
        relationships: {
          siblings: {
            data: [sibling2Ref, sibling1Ref],
          },
        },
      },
      included: [],
    });

    await settled();

    assert.ok(observerCount >= 1, 'siblings observer should be triggered at least once');
  });

  test('Calling push with relationship does not trigger observers if the relationship was not changed', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    let observerCount = 0;

    const person = store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz',
        },
        relationships: {
          siblings: {
            data: [sibling1Ref],
          },
        },
      },
      included: [sibling1],
    });

    const observerMethod = function () {
      observerCount++;
    };

    // prime the pump
    person.siblings;
    person.addObserver('siblings.[]', observerMethod);

    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {},
        relationships: {
          siblings: {
            data: [sibling1Ref],
          },
        },
      },
      included: [],
    });

    await settled();
    assert.strictEqual(observerCount, 0, 'siblings observer should not be triggered');

    person.removeObserver('siblings.[]', observerMethod);
  });
});
