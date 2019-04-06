import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import RESTAdapter from 'ember-data/adapters/rest';
import attr from 'ember-data/attr';
import Model from 'ember-data/model';
import { resolve } from 'rsvp';

module('RESTAdapter - fetch', function(hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function() {
    let { owner } = this;
    owner.register(
      'adapter:application',
      RESTAdapter.extend({
        useFetch: true,
      })
    );
    store = owner.lookup('service:store');
  });

  test('findAll - returning an array populates the array (useFetch)', async function(assert) {
    let { owner } = this;
    owner.register('model:post', Model.extend({ name: attr() }));
    let passedUrl, passedVerb, passedHash;

    let adapter = store.adapterFor('application');
    adapter._fetchRequest = hash => {
      passedHash = hash;
      passedUrl = passedHash.url;
      passedVerb = passedHash.method;
      return resolve({
        text() {
          return resolve(
            JSON.stringify({
              posts: [{ id: 1, name: 'Rails is omakase' }, { id: 2, name: 'The Parley Letter' }],
            })
          );
        },
        ok: true,
        status: 200,
      });
    };

    return store.findAll('post').then(posts => {
      assert.equal(passedUrl, '/posts');
      assert.equal(passedVerb, 'GET');
      assert.deepEqual(passedHash.data, {});

      let post1 = store.peekRecord('post', 1);
      let post2 = store.peekRecord('post', 2);

      assert.deepEqual(
        post1.getProperties('id', 'name'),
        { id: '1', name: 'Rails is omakase' },
        'Post 1 is loaded'
      );

      assert.deepEqual(
        post2.getProperties('id', 'name'),
        { id: '2', name: 'The Parley Letter' },
        'Post 2 is loaded'
      );

      assert.equal(posts.get('length'), 2, 'The posts are in the array');
      assert.equal(posts.get('isLoaded'), true, 'The RecordArray is loaded');
      assert.deepEqual(posts.toArray(), [post1, post2], 'The correct records are in the array');
    });
  });
});
