import { resolve, reject } from 'rsvp';
import { run } from '@ember/runloop';
import { get } from '@ember/object';
import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import Store from 'ember-data/store';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import JSONAPISerializer from 'ember-data/serializers/json-api';
import Model from 'ember-data/model';
import { attr, belongsTo, hasMany } from '@ember-decorators/data';

module('integration/reload - Reloading Records', function(hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function() {
    class Person extends Model {
      @attr
      updatedAt;
      @attr
      name;
      @attr
      firstName;
      @attr
      lastName;
    }

    let { owner } = this;
    owner.register('service:store', Store);
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

  test("When a single record is requested, the adapter's find method should be called unless it's loaded.", async function(assert) {
    let count = 0;
    let reloadOptions = {
      adapterOptions: {
        makeSnazzy: true,
      },
    };

    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord() { return false; },

        findRecord(store, type, id, snapshot) {
          if (count === 0) {
            count++;
            return resolve({ data: { id: id, type: 'person', attributes: { name: 'Tom Dale' } } });
          } else if (count === 1) {
            assert.equal(
              snapshot.adapterOptions,
              reloadOptions.adapterOptions,
              'We passed adapterOptions via reload'
            );
            count++;
            return resolve({ data: { id: id, type: 'person', attributes: { name: 'Braaaahm Dale' } } });
          } else {
            assert.ok(false, 'Should not get here');
          }
        }
      })
    );

    let person = await store.findRecord('person', '1');

    assert.equal(get(person, 'name'), 'Tom Dale', 'The person is loaded with the right name');
    assert.equal(get(person, 'isLoaded'), true, 'The person is now loaded');

    let promise = person.reload(reloadOptions);

    assert.equal(get(person, 'isReloading'), true, 'The person is now reloading');

    await promise;

    assert.equal(get(person, 'isReloading'), false, 'The person is no longer reloading');
    assert.equal(
      get(person, 'name'),
      'Braaaahm Dale',
      'The person is now updated with the right name'
    );

    // ensure we won't call adapter.findRecord again
    await store.findRecord('person', '1');
  });

  test('When a record is reloaded and fails, it can try again', async function(assert) {
    let tom = store.push({
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
        shouldBackgroundReloadRecord() { return true; },

        findRecord() {
          assert.equal(tom.get('isReloading'), true, 'Tom is reloading');
          if (count++ === 0) {
            return reject();
          } else {
            return resolve({ data: { id: 1, type: 'person', attributes: { name: 'Thomas Dale' } } });
          }
        }
      })
    );

    await tom.reload().catch(() => {
      assert.ok(true, 'we throw an error');
    });

    assert.equal(tom.get('isError'), true, 'Tom is now errored');
    assert.equal(tom.get('isReloading'), false, 'Tom is no longer reloading');

    let person = await tom.reload();

    assert.equal(person, tom, 'The resolved value is the record');
    assert.equal(tom.get('isError'), false, 'Tom is no longer errored');
    assert.equal(tom.get('isReloading'), false, 'Tom is no longer reloading');
    assert.equal(tom.get('name'), 'Thomas Dale', 'the updates apply');
  });

  test('When a record is loaded a second time, isLoaded stays true', async function(assert) {
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
      }
    };

    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord() { return true; },

        findRecord(store, type, id, snapshot) {
          assert.ok(true, 'We should call findRecord');
          return resolve(getTomDale());
        }
      })
    );

    function isLoadedDidChange() {
      // This observer should never fire
      assert.ok(false, 'We should not trigger the isLoaded observer');
      // but if it does we should still have the same isLoaded state
      assert.equal(get(this, 'isLoaded'), true, 'The person is still loaded after change');
    }

    store.push(getTomDale());

    let person = await store.findRecord('person', '1');

    person.addObserver('isLoaded', isLoadedDidChange);
    assert.equal(get(person, 'isLoaded'), true, 'The person is loaded');

    // Reload the record
    store.push(getTomDale());

    assert.equal(get(person, 'isLoaded'), true, 'The person is still loaded after load');

    person.removeObserver('isLoaded', isLoadedDidChange);
  });

  test('When a record is reloaded, its async hasMany relationships still work', async function(assert) {
    class Person extends Model {
      @attr
      name;
      @hasMany('tag', { async: true, inverse: null })
      tags;
    }
    class Tag extends Model {
      @attr
      name;
    }

    this.owner.unregister('model:person');
    this.owner.register('model:person', Person);
    this.owner.register('model:tag', Tag);

    let tagsById = { 1: 'hipster', 2: 'hair' };

    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord() { return false; },

        findRecord(store, type, id, snapshot) {
          switch (type.modelName) {
            case 'person':
              return resolve({
                data: {
                  id: '1',
                  type: 'person',
                  attributes: { name: 'Tom' },
                  relationships: {
                    tags: {
                      data: [{ id: '1', type: 'tag' }, { id: '2', type: 'tag' }],
                    },
                  },
                },
              });
            case 'tag':
              return resolve({ data: { id: id, type: 'tag', attributes: { name: tagsById[id] } } });
          }
        }
      })
    );

    let tom;
    let person = await store.findRecord('person', '1');

    tom = person;
    assert.equal(person.get('name'), 'Tom', 'precond');

    let tags = await person.get('tags');

    assert.deepEqual(tags.mapBy('name'), ['hipster', 'hair']);

    person = await tom.reload();
    assert.equal(person.get('name'), 'Tom', 'precond');

    tags = await person.get('tags');

    assert.deepEqual(tags.mapBy('name'), ['hipster', 'hair'], 'The tags are still there');
  });

  module('Reloading via relationship reference and { type, id }', function() {
    test('When a sync belongsTo relationship has been loaded, it can still be reloaded via the reference', async function(assert) {
      assert.expect(2);
      class Pet extends Model {
        @belongsTo('person', { async: false, inverse: null })
        owner;
        @attr
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register('adapter:application', JSONAPIAdapter.extend({
        findRecord() {
          assert.ok('We called findRecord');
          return resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: {
                name: 'Chris'
              }
            }
          });
        }
      }));

      let shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owner: {
              data: { type: 'person', id: '1' }
            }
          }
        },
        included: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Chris'
            }
          }
        ]
      });

      let ownerRef = shen.belongsTo('owner');
      let owner = shen.get('owner');
      let ownerViaRef = await ownerRef.reload();

      assert.ok(owner === ownerViaRef, 'We received the same reference via reload');
    });

    test('When a sync belongsTo relationship has not been loaded, it can still be reloaded via the reference', async function(assert) {
      assert.expect(2);
      class Pet extends Model {
        @belongsTo('person', { async: false, inverse: null })
        owner;
        @attr
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register('adapter:application', JSONAPIAdapter.extend({
        findRecord() {
          assert.ok('We called findRecord');
          return resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: {
                name: 'Chris'
              }
            }
          });
        }
      }));

      let shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owner: {
              data: { type: 'person', id: '1' }
            }
          }
        }
      });

      let ownerRef = shen.belongsTo('owner');
      let ownerViaRef = await ownerRef.reload();
      let owner = shen.get('owner');

      assert.ok(owner === ownerViaRef, 'We received the same reference via reload');
    });

    test('When a sync hasMany relationship has been loaded, it can still be reloaded via the reference', async function(assert) {
      assert.expect(2);
      class Pet extends Model {
        @hasMany('person', { async: false, inverse: null })
        owners;
        @attr
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register('adapter:application', JSONAPIAdapter.extend({
        findRecord() {
          assert.ok('We called findRecord');
          return resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: {
                name: 'Chris'
              }
            }
          });
        }
      }));

      let shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owners: {
              data: [{ type: 'person', id: '1' }]
            }
          }
        },
        included: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Chris'
            }
          }
        ]
      });

      let ownersRef = shen.hasMany('owners');
      let owners = shen.get('owners');
      let ownersViaRef = await ownersRef.reload();

      assert.ok(owners.objectAt(0) === ownersViaRef.objectAt(0), 'We received the same reference via reload');
    });

    test('When a sync hasMany relationship has not been loaded, it can still be reloaded via the reference', async function(assert) {
      assert.expect(2);
      class Pet extends Model {
        @hasMany('person', { async: false, inverse: null })
        owners;
        @attr
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register('adapter:application', JSONAPIAdapter.extend({
        findRecord() {
          assert.ok('We called findRecord');
          return resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: {
                name: 'Chris'
              }
            }
          });
        }
      }));

      let shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owners: {
              data: [{ type: 'person', id: '1' }]
            }
          }
        }
      });

      let ownersRef = shen.hasMany('owners');
      let ownersViaRef = await ownersRef.reload();
      let owners = shen.get('owners');

      assert.ok(owners.objectAt(0) === ownersViaRef.objectAt(0), 'We received the same reference via reload');
    });
  });

  module('Reloading via relationship reference and links', function() {
    test('When a sync belongsTo relationship has been loaded, it can still be reloaded via the reference', async function(assert) {
      assert.expect(2);
      class Pet extends Model {
        @belongsTo('person', { async: false, inverse: null })
        owner;
        @attr
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register('adapter:application', JSONAPIAdapter.extend({
        findBelongsTo() {
          assert.ok('We called findRecord');
          return resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: {
                name: 'Chris'
              }
            }
          });
        }
      }));

      let shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owner: {
              data: { type: 'person', id: '1' },
              links: {
                related: './owner'
              }
            }
          }
        },
        included: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Chris'
            }
          }
        ]
      });

      let ownerRef = shen.belongsTo('owner');
      let owner = shen.get('owner');
      let ownerViaRef = await ownerRef.reload();

      assert.ok(owner === ownerViaRef, 'We received the same reference via reload');
    });

    test('When a sync belongsTo relationship has not been loaded, it can still be reloaded via the reference', async function(assert) {
      assert.expect(2);
      class Pet extends Model {
        @belongsTo('person', { async: false, inverse: null })
        owner;
        @attr
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register('adapter:application', JSONAPIAdapter.extend({
        findBelongsTo() {
          assert.ok('We called findRecord');
          return resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: {
                name: 'Chris'
              }
            }
          });
        }
      }));

      let shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owner: {
              data: { type: 'person', id: '1' },
              links: {
                related: './owner'
              }
            }
          }
        }
      });

      let ownerRef = shen.belongsTo('owner');
      let ownerViaRef = await ownerRef.reload();
      let owner = shen.get('owner');

      assert.ok(owner === ownerViaRef, 'We received the same reference via reload');
    });

    test('When a sync hasMany relationship has been loaded, it can still be reloaded via the reference', async function(assert) {
      assert.expect(2);
      class Pet extends Model {
        @hasMany('person', { async: false, inverse: null })
        owners;
        @attr
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register('adapter:application', JSONAPIAdapter.extend({
        findHasMany() {
          assert.ok('We called findRecord');
          return resolve({
            data: [{
              type: 'person',
              id: '1',
              attributes: {
                name: 'Chris'
              }
            }]
          });
        }
      }));

      let shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owners: {
              data: [{ type: 'person', id: '1' }],
              links: {
                related: './owners'
              }
            }
          }
        },
        included: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Chris'
            }
          }
        ]
      });

      let ownersRef = shen.hasMany('owners');
      let owners = shen.get('owners');
      let ownersViaRef = await ownersRef.reload();

      assert.ok(owners.objectAt(0) === ownersViaRef.objectAt(0), 'We received the same reference via reload');
    });

    test('When a sync hasMany relationship has not been loaded, it can still be reloaded via the reference', async function(assert) {
      assert.expect(2);
      class Pet extends Model {
        @hasMany('person', { async: false, inverse: null })
        owners;
        @attr
        name;
      }

      this.owner.register('model:pet', Pet);
      this.owner.register('adapter:application', JSONAPIAdapter.extend({
        findHasMany() {
          assert.ok('We called findRecord');
          return resolve({
            data: [{
              type: 'person',
              id: '1',
              attributes: {
                name: 'Chris'
              }
            }]
          });
        }
      }));

      let shen = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owners: {
              data: [{ type: 'person', id: '1' }],
              links: {
                related: './owners'
              }
            }
          }
        }
      });

      let ownersRef = shen.hasMany('owners');
      let ownersViaRef = await ownersRef.reload();
      let owners = shen.get('owners');

      assert.ok(owners.objectAt(0) === ownersViaRef.objectAt(0), 'We received the same reference via reload');
    });
  });
});
