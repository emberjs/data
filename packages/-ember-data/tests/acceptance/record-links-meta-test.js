import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupRenderingTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store from '@ember-data/store';

class ModelWithCollision extends Model {
  @attr name;
  @attr meta;
  @attr links;
}

class ModelWithoutCollision extends Model {
  @attr name;
}

class TestAdapter extends JSONAPIAdapter {
  findRecord(store, { modelName }, id) {
    let data = {
      id,
      type: modelName,
      attributes: {
        name: 'Contraption',
      },
      links: {
        self: 'http://example.com/api/with-collisions/1',
      },
      meta: {
        count: 8,
      },
    };

    if (modelName === 'with-collision') {
      data.attributes.links = 'no-links';
      data.attributes.meta = 996;
    }
    return resolve({
      data,
    });
  }
}

module('acceptance/record-links-meta', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('service:store', Store);
    owner.register('model:with-collision', ModelWithCollision);
    owner.register('model:without-collision', ModelWithoutCollision);
    owner.register('adapter:application', TestAdapter);
    owner.register('serializer:application', JSONAPISerializer);
  });

  test('JSONAPISerializer preserves the links and meta', async function (assert) {
    let store = this.owner.lookup('service:store');

    let adapter = store.adapterFor('application');
    let serializer = store.serializerFor('application');
    let model = store.modelFor('with-collision');

    let data = await adapter.findRecord(store, model, 'id-1');

    let result = serializer.normalizeResponse(store, model, data, 'id-1', 'findRecord');

    assert.deepEqual(
      result.data.links,
      {
        self: 'http://example.com/api/with-collisions/1',
      },
      'top level resource links are preserved'
    );
    assert.deepEqual(result.data.attributes.links, 'no-links', 'attribute members named "links" are preserved');

    assert.deepEqual(
      result.data.meta,
      {
        count: 8,
      },
      'top level resource meta is preserved'
    );

    assert.deepEqual(result.data.attributes.meta, 996, 'attribute members named "meta" are preserved');
  });

  test('can access links and meta when there are no collisions with attributes', async function (assert) {
    let store = this.owner.lookup('service:store');

    let result = await store.findRecord('without-collision', 'id-1');

    assert.deepEqual(
      result.links,
      {
        self: 'http://example.com/api/with-collisions/1',
      },
      'links are accessible'
    );

    assert.deepEqual(
      result.meta,
      {
        count: 8,
      },
      'meta is accessible'
    );
  });

  test('links and meta are overwridden by attributes', async function (assert) {
    //TODO
  });

  // todo test meta and links included in `included` :)
  // meta and links in a relationship resource gets ignored
});
