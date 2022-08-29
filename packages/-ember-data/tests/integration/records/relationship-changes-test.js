import EmberObject, { get, set } from '@ember/object';
import { alias } from '@ember/object/computed';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';

const Author = Model.extend({
  name: attr('string'),
});

const Post = Model.extend({
  author: belongsTo('author', { async: true, inverse: null }),
});

const Person = Model.extend({
  firstName: attr('string'),
  lastName: attr('string'),
  siblings: hasMany('person', { async: true, inverse: 'siblings' }),
});

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

  deprecatedTest(
    'Calling push with relationship recalculates computed alias property if the relationship was empty and is added to',
    { id: 'ember-data:deprecate-promise-many-array-behaviors', until: '5.0', count: 1 },
    function (assert) {
      assert.expect(1);

      let store = this.owner.lookup('service:store');

      let Obj = EmberObject.extend({
        person: null,
        siblings: alias('person.siblings'),
      });

      const obj = Obj.create();

      run(() => {
        store.push({
          data: {
            type: 'person',
            id: 'wat',
            attributes: {
              firstName: 'Yehuda',
              lastName: 'Katz',
            },
            relationships: {
              siblings: {
                data: [],
              },
            },
          },
        });
        set(obj, 'person', store.peekRecord('person', 'wat'));
      });

      run(() => {
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
          included: [sibling1],
        });
      });

      run(() => {
        let cpResult = get(obj, 'siblings').slice();
        assert.strictEqual(cpResult.length, 1, 'siblings cp should have recalculated');
        obj.destroy();
      });
    }
  );

  deprecatedTest(
    'Calling push with relationship recalculates computed alias property to firstObject if the relationship was empty and is added to',
    { id: 'ember-data:deprecate-promise-many-array-behaviors', until: '5.0', count: 1 },
    function (assert) {
      assert.expect(2);

      let store = this.owner.lookup('service:store');

      let Obj = EmberObject.extend({
        person: null,
        firstSibling: alias('person.siblings.firstObject'),
      });

      const obj = Obj.create();

      run(() => {
        store.push({
          data: {
            type: 'person',
            id: 'wat',
            attributes: {
              firstName: 'Yehuda',
              lastName: 'Katz',
            },
            relationships: {
              siblings: {
                data: [],
              },
            },
          },
        });
        set(obj, 'person', store.peekRecord('person', 'wat'));
      });

      run(() => {
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
          included: [sibling1],
        });
      });

      run(() => {
        let cpResult = get(obj, 'firstSibling');
        assert.strictEqual(get(cpResult, 'id'), '1', 'siblings cp should have recalculated');
        obj.destroy();
      });
      assert.expectDeprecation({ id: 'ember-data:deprecate-array-like' });
    }
  );

  test('Calling push with relationship triggers observers once if the relationship was not empty and was added to', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let person = null;
    let observerCount = 0;

    run(() => {
      store.push({
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
      person = store.peekRecord('person', 'wat');
    });

    run(() => {
      person.addObserver('siblings.[]', function () {
        observerCount++;
      });
      // prime the pump
      person.siblings;
    });

    run(() => {
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
    });

    run(() => {
      assert.ok(observerCount >= 1, 'siblings observer should be triggered at least once');
    });
  });

  test('Calling push with relationship triggers observers once if the relationship was made shorter', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let person = null;
    let observerCount = 0;

    run(() => {
      store.push({
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
      person = store.peekRecord('person', 'wat');
    });

    run(() => {
      person.addObserver('siblings.[]', function () {
        observerCount++;
      });
      // prime the pump
      person.siblings;
    });

    run(() => {
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
    });

    run(() => {
      assert.ok(observerCount >= 1, 'siblings observer should be triggered at least once');
    });
  });

  test('Calling push with relationship triggers observers once if the relationship was reordered', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let person = null;
    let observerCount = 0;

    run(() => {
      store.push({
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
      person = store.peekRecord('person', 'wat');
    });

    run(() => {
      person.addObserver('siblings.[]', function () {
        observerCount++;
      });
      // prime the pump
      person.siblings;
    });

    run(() => {
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
    });

    run(() => {
      assert.ok(observerCount >= 1, 'siblings observer should be triggered at least once');
    });
  });

  test('Calling push with relationship does not trigger observers if the relationship was not changed', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let person = null;
    let observerCount = 0;

    run(() => {
      store.push({
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
      person = store.peekRecord('person', 'wat');
    });

    const observerMethod = function () {
      observerCount++;
    };

    run(() => {
      // prime the pump
      person.siblings;
      person.addObserver('siblings.[]', observerMethod);
    });

    run(() => {
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
    });

    run(() => {
      assert.strictEqual(observerCount, 0, 'siblings observer should not be triggered');
    });

    person.removeObserver('siblings.[]', observerMethod);
  });
});
