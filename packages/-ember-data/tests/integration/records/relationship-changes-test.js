import EmberObject, { get, set } from '@ember/object';
import { alias } from '@ember/object/computed';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import { gte } from 'ember-compatibility-helpers';
import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

const Author = Model.extend({
  name: attr('string'),
});

const Post = Model.extend({
  author: belongsTo(),
});

const Person = Model.extend({
  firstName: attr('string'),
  lastName: attr('string'),
  siblings: hasMany('person'),
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

const sibling3 = {
  type: 'person',
  id: '3',
  attributes: {
    firstName: 'Snakezn',
    lastName: 'Ladderz',
  },
};

const sibling3Ref = {
  type: 'person',
  id: '3',
};

const sibling4 = {
  type: 'person',
  id: '4',
  attributes: {
    firstName: 'Hamsterzn',
    lastName: 'Gerbilz',
  },
};

const sibling4Ref = {
  type: 'person',
  id: '4',
};

const sibling5 = {
  type: 'person',
  id: '5',
  attributes: {
    firstName: 'Donkeyzn',
    lastName: 'Llamaz',
  },
};

const sibling5Ref = {
  type: 'person',
  id: '5',
};

module('integration/records/relationship-changes - Relationship changes', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:author', Author);
    this.owner.register('model:person', Person);
    this.owner.register('model:post', Post);

    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

  if (!gte('4.0.0')) {
    test('Calling push with relationship triggers observers once if the relationship was empty and is added to', function (assert) {
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
                data: [],
              },
            },
          },
        });
        person = store.peekRecord('person', 'wat');
      });

      run(() => {
        person.addObserver('siblings.[]', function () {
          observerCount++;
        });
        // prime the pump
        person.get('siblings');
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
        assert.ok(observerCount >= 1, 'siblings observer should be triggered at least once');
      });
    });
  }

  test('Calling push with relationship recalculates computed alias property if the relationship was empty and is added to', function (assert) {
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
      let cpResult = get(obj, 'siblings').toArray();
      assert.strictEqual(cpResult.length, 1, 'siblings cp should have recalculated');
      obj.destroy();
    });
  });

  test('Calling push with relationship recalculates computed alias property to firstObject if the relationship was empty and is added to', function (assert) {
    assert.expect(1);

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
  });

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
      person.get('siblings');
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
      person.get('siblings');
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
      person.get('siblings');
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
      person.get('siblings');
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

  if (!gte('4.0.0')) {
    test('Calling push with relationship triggers willChange and didChange with detail when appending', async function (assert) {
      assert.expectDeprecation(
        async () => {
          let store = this.owner.lookup('service:store');

          let willChangeCount = 0;
          let didChangeCount = 0;

          let observer = {
            arrayWillChange(array, start, removing, adding) {
              willChangeCount++;
              assert.strictEqual(start, 1, 'willChange.start');
              assert.strictEqual(removing, 0, 'willChange.removing');
              assert.strictEqual(adding, 1, 'willChange.adding');
            },

            arrayDidChange(array, start, removed, added) {
              didChangeCount++;
              assert.strictEqual(start, 1, 'didChange.start');
              assert.strictEqual(removed, 0, 'didChange.removed');
              assert.strictEqual(added, 1, 'didChange.added');
            },
          };

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

          let person = store.peekRecord('person', 'wat');
          let siblings = await person.siblings;

          // flush initial state since
          // nothing is consuming us.
          // else the test will fail because we will
          // (correctly) not notify the array observer
          // as there is still a pending notification
          siblings.length;

          siblings.addArrayObserver(observer);

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

          assert.strictEqual(willChangeCount, 1, 'willChange observer should be triggered once');
          assert.strictEqual(didChangeCount, 1, 'didChange observer should be triggered once');

          siblings.removeArrayObserver(observer);
        },
        { id: 'array-observers', count: 2, when: { ember: '>=3.26.0' } }
      );
    });
    test('Calling push with relationship triggers willChange and didChange with detail when truncating', async function (assert) {
      assert.expectDeprecation(
        async () => {
          let store = this.owner.lookup('service:store');

          let willChangeCount = 0;
          let didChangeCount = 0;

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

          let person = store.peekRecord('person', 'wat');
          let siblings = person.get('siblings');

          // flush initial state since
          // nothing is consuming us.
          // else the test will fail because we will
          // (correctly) not notify the array observer
          // as there is still a pending notification
          siblings.length;

          let observer = {
            arrayWillChange(array, start, removing, adding) {
              willChangeCount++;
              assert.strictEqual(start, 1);
              assert.strictEqual(removing, 1);
              assert.strictEqual(adding, 0);
            },

            arrayDidChange(array, start, removed, added) {
              didChangeCount++;
              assert.strictEqual(start, 1);
              assert.strictEqual(removed, 1);
              assert.strictEqual(added, 0);
            },
          };

          siblings.addArrayObserver(observer);

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

          assert.strictEqual(willChangeCount, 1, 'willChange observer should be triggered once');
          assert.strictEqual(didChangeCount, 1, 'didChange observer should be triggered once');

          siblings.removeArrayObserver(observer);
        },
        { id: 'array-observers', count: 2, when: { ember: '>=3.26.0' } }
      );
    });

    test('Calling push with relationship triggers willChange and didChange with detail when inserting at front', async function (assert) {
      assert.expectDeprecation(
        async () => {
          let store = this.owner.lookup('service:store');

          let willChangeCount = 0;
          let didChangeCount = 0;

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
                    data: [sibling2Ref],
                  },
                },
              },
              included: [sibling2],
            });
          });
          let person = store.peekRecord('person', 'wat');

          let observer = {
            arrayWillChange(array, start, removing, adding) {
              willChangeCount++;
              assert.strictEqual(start, 0, 'change will start at the beginning');
              assert.strictEqual(removing, 0, 'we have no removals');
              assert.strictEqual(adding, 1, 'we have one insertion');
            },

            arrayDidChange(array, start, removed, added) {
              didChangeCount++;
              assert.strictEqual(start, 0, 'change did start at the beginning');
              assert.strictEqual(removed, 0, 'change had no removals');
              assert.strictEqual(added, 1, 'change had one insertion');
            },
          };

          const siblingsProxy = person.siblings;
          const siblings = await siblingsProxy;

          // flush initial state since
          // nothing is consuming us.
          // else the test will fail because we will
          // (correctly) not notify the array observer
          // as there is still a pending notification
          siblingsProxy.length;

          siblingsProxy.addArrayObserver(observer);

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
            included: [sibling1],
          });

          assert.strictEqual(willChangeCount, 1, 'willChange observer should be triggered once');
          assert.strictEqual(didChangeCount, 1, 'didChange observer should be triggered once');
          assert.deepEqual(
            siblings.map((i) => i.id),
            ['1', '2'],
            'We have the correct siblings'
          );

          siblingsProxy.removeArrayObserver(observer);
        },
        { id: 'array-observers', count: 2, when: { ember: '>=3.26.0' } }
      );
    });

    test('Calling push with relationship triggers willChange and didChange with detail when inserting in middle', function (assert) {
      assert.expectDeprecation(
        async () => {
          let store = this.owner.lookup('service:store');

          let willChangeCount = 0;
          let didChangeCount = 0;

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
                    data: [sibling1Ref, sibling3Ref],
                  },
                },
              },
              included: [sibling1, sibling3],
            });
          });
          let person = store.peekRecord('person', 'wat');
          let observer = {
            arrayWillChange(array, start, removing, adding) {
              willChangeCount++;
              assert.strictEqual(start, 1);
              assert.strictEqual(removing, 0);
              assert.strictEqual(adding, 1);
            },
            arrayDidChange(array, start, removed, added) {
              didChangeCount++;
              assert.strictEqual(start, 1);
              assert.strictEqual(removed, 0);
              assert.strictEqual(added, 1);
            },
          };

          let siblings = run(() => person.get('siblings'));

          // flush initial state since
          // nothing is consuming us.
          // else the test will fail because we will
          // (correctly) not notify the array observer
          // as there is still a pending notification
          siblings.length;

          siblings.addArrayObserver(observer);

          run(() => {
            store.push({
              data: {
                type: 'person',
                id: 'wat',
                attributes: {},
                relationships: {
                  siblings: {
                    data: [sibling1Ref, sibling2Ref, sibling3Ref],
                  },
                },
              },
              included: [sibling2],
            });
          });

          assert.strictEqual(willChangeCount, 1, 'willChange observer should be triggered once');
          assert.strictEqual(didChangeCount, 1, 'didChange observer should be triggered once');

          siblings.removeArrayObserver(observer);
        },
        { id: 'array-observers', count: 2, when: { ember: '>=3.26.0' } }
      );
    });

    test('Calling push with relationship triggers willChange and didChange with detail when replacing different length in middle', function (assert) {
      assert.expectDeprecation(
        async () => {
          let store = this.owner.lookup('service:store');

          let willChangeCount = 0;
          let didChangeCount = 0;

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
                    data: [sibling1Ref, sibling2Ref, sibling3Ref],
                  },
                },
              },
              included: [sibling1, sibling2, sibling3],
            });
          });

          let person = store.peekRecord('person', 'wat');
          let observer = {
            arrayWillChange(array, start, removing, adding) {
              willChangeCount++;
              assert.strictEqual(start, 1);
              assert.strictEqual(removing, 1);
              assert.strictEqual(adding, 2);
            },

            arrayDidChange(array, start, removed, added) {
              didChangeCount++;
              assert.strictEqual(start, 1);
              assert.strictEqual(removed, 1);
              assert.strictEqual(added, 2);
            },
          };

          let siblings = run(() => person.get('siblings'));
          // flush initial state since
          // nothing is consuming us.
          // else the test will fail because we will
          // (correctly) not notify the array observer
          // as there is still a pending notification
          siblings.length;
          siblings.addArrayObserver(observer);

          run(() => {
            store.push({
              data: {
                type: 'person',
                id: 'wat',
                attributes: {},
                relationships: {
                  siblings: {
                    data: [sibling1Ref, sibling4Ref, sibling5Ref, sibling3Ref],
                  },
                },
              },
              included: [sibling4, sibling5],
            });
          });

          assert.strictEqual(willChangeCount, 1, 'willChange observer should be triggered once');
          assert.strictEqual(didChangeCount, 1, 'didChange observer should be triggered once');

          siblings.removeArrayObserver(observer);
        },
        { id: 'array-observers', count: 2, when: { ember: '>=3.26.0' } }
      );
    });

    test('Calling push with updated belongsTo relationship trigger observer', function (assert) {
      assert.expect(1);

      let store = this.owner.lookup('service:store');
      let observerCount = 0;

      run(() => {
        let post = store.push({
          data: {
            type: 'post',
            id: '1',
            relationships: {
              author: {
                data: { type: 'author', id: '2' },
              },
            },
          },
          included: [
            {
              id: 2,
              type: 'author',
            },
          ],
        });

        post.get('author');

        post.addObserver('author', function () {
          observerCount++;
        });

        store.push({
          data: {
            type: 'post',
            id: '1',
            relationships: {
              author: {
                data: { type: 'author', id: '3' },
              },
            },
          },
        });
      });

      assert.strictEqual(observerCount, 1, 'author observer should be triggered once');
    });

    test('Calling push with same belongsTo relationship does not trigger observer', function (assert) {
      assert.expect(1);

      let store = this.owner.lookup('service:store');
      let observerCount = 0;

      run(() => {
        let post = store.push({
          data: {
            type: 'post',
            id: '1',
            relationships: {
              author: {
                data: { type: 'author', id: '2' },
              },
            },
          },
        });

        post.addObserver('author', function () {
          observerCount++;
        });

        store.push({
          data: {
            type: 'post',
            id: '1',
            relationships: {
              author: {
                data: { type: 'author', id: '2' },
              },
            },
          },
        });
      });

      assert.strictEqual(observerCount, 0, 'author observer should not be triggered');
    });
  }
});
