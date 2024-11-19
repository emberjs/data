import { get } from '@ember/object';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('integration/reload - Reloading Records', function (hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function () {
    class Person extends Model {
      @attr()
      updatedAt;
      @attr()
      name;
      @attr()
      firstName;
      @attr()
      lastName;
    }

    const { owner } = this;
    owner.register('model:person', Person);
    owner.register(
      'serializer:application',
      JSONAPISerializer.extend({
        normalizeResponse(_, __, jsonApiPayload) {
          return jsonApiPayload;
        },
      })
    );
    store = owner.lookup('service:store');
  });

  test("When a single record is requested, the adapter's find method should be called unless it's loaded.", async function (assert) {
    let count = 0;
    const reloadOptions = {
      adapterOptions: {
        makeSnazzy: true,
      },
    };

    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord() {
          return false;
        },

        findRecord(store, type, id, snapshot) {
          if (count === 0) {
            count++;
            return Promise.resolve({ data: { id: id, type: 'person', attributes: { name: 'Tom Dale' } } });
          } else if (count === 1) {
            assert.strictEqual(
              snapshot.adapterOptions,
              reloadOptions.adapterOptions,
              'We passed adapterOptions via reload'
            );
            count++;
            return Promise.resolve({
              data: { id: id, type: 'person', attributes: { name: 'Braaaahm Dale' } },
            });
          } else {
            assert.ok(false, 'Should not get here');
          }
        },
      })
    );

    const person = await store.findRecord('person', '1');

    assert.strictEqual(get(person, 'name'), 'Tom Dale', 'The person is loaded with the right name');
    assert.true(get(person, 'isLoaded'), 'The person is now loaded');

    const promise = person.reload(reloadOptions);

    assert.true(get(person, 'isReloading'), 'The person is now reloading');

    await promise;

    assert.false(get(person, 'isReloading'), 'The person is no longer reloading');
    assert.strictEqual(get(person, 'name'), 'Braaaahm Dale', 'The person is now updated with the right name');

    // ensure we won't call adapter.findRecord again
    await store.findRecord('person', '1');
  });

  test('When a record is reloaded and fails, it can try again', async function (assert) {
    const tom = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
      },
    });
    let count = 0;

    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord() {
          return false;
        },

        findRecord() {
          assert.true(tom.isReloading, 'Tom is reloading');
          if (count++ === 0) {
            return Promise.reject();
          } else {
            return Promise.resolve({
              data: { id: '1', type: 'person', attributes: { name: 'Thomas Dale' } },
            });
          }
        },
      })
    );

    try {
      await tom.reload();
      assert.ok(false, 'we should throw an error');
    } catch (e) {
      assert.strictEqual(e.message, 'Request Rejected with an Unknown Error', 'correct error message');
    }

    assert.true(tom.isError, 'Tom is now errored');
    assert.false(tom.isReloading, 'Tom is no longer reloading');

    const person = await tom.reload();

    assert.strictEqual(person, tom, 'The resolved value is the record');
    assert.false(tom.isError, 'Tom is no longer errored');
    assert.false(tom.isReloading, 'Tom is no longer reloading');
    assert.strictEqual(tom.name, 'Thomas Dale', 'the updates apply');
  });

  test('When a record is loaded a second time, isLoaded stays true', async function (assert) {
    assert.expect(3);
    function getTomDale() {
      return {
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
        },
      };
    }

    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord() {
          return true;
        },

        findRecord(store, type, id, snapshot) {
          assert.ok(true, 'We should call findRecord');
          return Promise.resolve(getTomDale());
        },
      })
    );

    function isLoadedDidChange() {
      // This observer should never fire
      assert.ok(false, 'We should not trigger the isLoaded observer');
      // but if it does we should still have the same isLoaded state
      assert.true(get(this, 'isLoaded'), 'The person is still loaded after change');
    }

    store.push(getTomDale());

    const person = await store.findRecord('person', '1');

    person.addObserver('isLoaded', isLoadedDidChange);
    assert.true(get(person, 'isLoaded'), 'The person is loaded');

    // Reload the record
    store.push(getTomDale());

    assert.true(get(person, 'isLoaded'), 'The person is still loaded after load');

    person.removeObserver('isLoaded', isLoadedDidChange);
  });

  test('When a record is reloaded, its async hasMany relationships still work', async function (assert) {
    class Person extends Model {
      @attr()
      name;
      @hasMany('tag', { async: true, inverse: null })
      tags;
    }
    class Tag extends Model {
      @attr()
      name;
    }

    this.owner.unregister('model:person');
    this.owner.register('model:person', Person);
    this.owner.register('model:tag', Tag);

    const tagsById = { 1: 'hipster', 2: 'hair' };

    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord() {
          return false;
        },

        findRecord(store, type, id, snapshot) {
          switch (type.modelName) {
            case 'person':
              return Promise.resolve({
                data: {
                  id: '1',
                  type: 'person',
                  attributes: { name: 'Tom' },
                  relationships: {
                    tags: {
                      data: [
                        { id: '1', type: 'tag' },
                        { id: '2', type: 'tag' },
                      ],
                    },
                  },
                },
              });
            case 'tag':
              return Promise.resolve({ data: { id: id, type: 'tag', attributes: { name: tagsById[id] } } });
          }
        },
      })
    );

    let person = await store.findRecord('person', '1');

    const tom = person;
    assert.strictEqual(person.name, 'Tom', 'precond');

    let tags = await person.tags;

    assert.deepEqual(
      tags.map((r) => r.name),
      ['hipster', 'hair']
    );

    person = await tom.reload();
    assert.strictEqual(person.name, 'Tom', 'precond');

    tags = await person.tags;

    assert.deepEqual(
      tags.map((r) => r.name),
      ['hipster', 'hair'],
      'The tags are still there'
    );
  });

  module('Reloading via relationship reference and { type, id }', function () {
    test('When a sync belongsTo relationship has been loaded, it can still be reloaded via the reference', async function (assert) {
      assert.expect(2);
      class Pet extends Model {
        @belongsTo('person', { async: false, inverse: null })
        owner;
        @attr()
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register(
        'adapter:application',
        JSONAPIAdapter.extend({
          findRecord() {
            assert.ok('We called findRecord');
            return Promise.resolve({
              data: {
                type: 'person',
                id: '1',
                attributes: {
                  name: 'Chris',
                },
              },
            });
          },
        })
      );

      const shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owner: {
              data: { type: 'person', id: '1' },
            },
          },
        },
        included: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Chris',
            },
          },
        ],
      });

      const ownerRef = shen.belongsTo('owner');
      const owner = shen.owner;
      const ownerViaRef = await ownerRef.reload();

      assert.strictEqual(owner, ownerViaRef, 'We received the same reference via reload');
    });

    test('When a sync belongsTo relationship has not been loaded, it can still be reloaded via the reference', async function (assert) {
      assert.expect(2);
      class Pet extends Model {
        @belongsTo('person', { async: false, inverse: null })
        owner;
        @attr()
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register(
        'adapter:application',
        JSONAPIAdapter.extend({
          findRecord() {
            assert.ok('We called findRecord');
            return Promise.resolve({
              data: {
                type: 'person',
                id: '1',
                attributes: {
                  name: 'Chris',
                },
              },
            });
          },
        })
      );

      const shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owner: {
              data: { type: 'person', id: '1' },
            },
          },
        },
      });

      const ownerRef = shen.belongsTo('owner');
      const ownerViaRef = await ownerRef.reload();
      const owner = shen.owner;

      assert.strictEqual(owner, ownerViaRef, 'We received the same reference via reload');
    });

    test('When a sync hasMany relationship has been loaded, it can still be reloaded via the reference', async function (assert) {
      assert.expect(2);
      class Pet extends Model {
        @hasMany('person', { async: false, inverse: null })
        owners;
        @attr()
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register(
        'adapter:application',
        JSONAPIAdapter.extend({
          findRecord() {
            assert.ok('We called findRecord');
            return Promise.resolve({
              data: {
                type: 'person',
                id: '1',
                attributes: {
                  name: 'Chris',
                },
              },
            });
          },
        })
      );

      const shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owners: {
              data: [{ type: 'person', id: '1' }],
            },
          },
        },
        included: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Chris',
            },
          },
        ],
      });

      const ownersRef = shen.hasMany('owners');
      const owners = shen.owners;
      const ownersViaRef = await ownersRef.reload();

      assert.strictEqual(owners.at(0), ownersViaRef.at(0), 'We received the same reference via reload');
    });

    test('When a sync hasMany relationship has not been loaded, it can still be reloaded via the reference', async function (assert) {
      assert.expect(2);
      class Pet extends Model {
        @hasMany('person', { async: false, inverse: null })
        owners;
        @attr()
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register(
        'adapter:application',
        JSONAPIAdapter.extend({
          findRecord() {
            assert.ok('We called findRecord');
            return Promise.resolve({
              data: {
                type: 'person',
                id: '1',
                attributes: {
                  name: 'Chris',
                },
              },
            });
          },
        })
      );

      const shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owners: {
              data: [{ type: 'person', id: '1' }],
            },
          },
        },
      });

      const ownersRef = shen.hasMany('owners');
      const ownersViaRef = await ownersRef.reload();
      const owners = shen.owners;

      assert.strictEqual(owners.at(0), ownersViaRef.at(0), 'We received the same reference via reload');
    });
  });

  module('Reloading via relationship reference and links', function () {
    test('When a sync belongsTo relationship has been loaded, it can still be reloaded via the reference', async function (assert) {
      assert.expect(2);
      class Pet extends Model {
        @belongsTo('person', { async: false, inverse: null })
        owner;
        @attr()
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register(
        'adapter:application',
        JSONAPIAdapter.extend({
          findBelongsTo() {
            assert.ok('We called findRecord');
            return Promise.resolve({
              data: {
                type: 'person',
                id: '1',
                attributes: {
                  name: 'Chris',
                },
              },
            });
          },
        })
      );

      const shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owner: {
              data: { type: 'person', id: '1' },
              links: {
                related: './owner',
              },
            },
          },
        },
        included: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Chris',
            },
          },
        ],
      });

      const ownerRef = shen.belongsTo('owner');
      const owner = shen.owner;
      const ownerViaRef = await ownerRef.reload();

      assert.strictEqual(owner, ownerViaRef, 'We received the same reference via reload');
    });

    test('When a sync belongsTo relationship has not been loaded, it can still be reloaded via the reference', async function (assert) {
      assert.expect(2);
      class Pet extends Model {
        @belongsTo('person', { async: false, inverse: null })
        owner;
        @attr()
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register(
        'adapter:application',
        JSONAPIAdapter.extend({
          findBelongsTo() {
            assert.ok('We called findRecord');
            return Promise.resolve({
              data: {
                type: 'person',
                id: '1',
                attributes: {
                  name: 'Chris',
                },
              },
            });
          },
        })
      );

      const shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owner: {
              data: { type: 'person', id: '1' },
              links: {
                related: './owner',
              },
            },
          },
        },
      });

      const ownerRef = shen.belongsTo('owner');
      const ownerViaRef = await ownerRef.reload();
      const owner = shen.owner;

      assert.strictEqual(owner, ownerViaRef, 'We received the same reference via reload');
    });

    test('When a sync hasMany relationship has been loaded, it can still be reloaded via the reference', async function (assert) {
      assert.expect(2);
      class Pet extends Model {
        @hasMany('person', { async: false, inverse: null })
        owners;
        @attr()
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register(
        'adapter:application',
        JSONAPIAdapter.extend({
          findHasMany() {
            assert.ok('We called findRecord');
            return Promise.resolve({
              data: [
                {
                  type: 'person',
                  id: '1',
                  attributes: {
                    name: 'Chris',
                  },
                },
              ],
            });
          },
        })
      );

      const shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owners: {
              data: [{ type: 'person', id: '1' }],
              links: {
                related: './owners',
              },
            },
          },
        },
        included: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Chris',
            },
          },
        ],
      });

      const ownersRef = shen.hasMany('owners');
      const owners = shen.owners;
      const ownersViaRef = await ownersRef.reload();

      assert.strictEqual(owners.at(0), ownersViaRef.at(0), 'We received the same reference via reload');
    });

    test('When a sync hasMany relationship has not been loaded, it can still be reloaded via the reference', async function (assert) {
      assert.expect(2);
      class Pet extends Model {
        @hasMany('person', { async: false, inverse: null })
        owners;
        @attr()
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register(
        'adapter:application',
        JSONAPIAdapter.extend({
          findHasMany() {
            assert.ok('We called findRecord');
            return Promise.resolve({
              data: [
                {
                  type: 'person',
                  id: '1',
                  attributes: {
                    name: 'Chris',
                  },
                },
              ],
            });
          },
        })
      );

      const shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owners: {
              data: [{ type: 'person', id: '1' }],
              links: {
                related: './owners',
              },
            },
          },
        },
      });

      const ownersRef = shen.hasMany('owners');
      const ownersViaRef = await ownersRef.reload();
      const owners = shen.owners;

      assert.strictEqual(owners.at(0), ownersViaRef.at(0), 'We received the same reference via reload');
    });
  });
});
