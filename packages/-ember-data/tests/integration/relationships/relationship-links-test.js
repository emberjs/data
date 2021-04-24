import EmberObject from '@ember/object';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr, hasMany } from '@ember-data/model';
import Store from '@ember-data/store';

module('JSON:API links access on relationships', function (hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function () {
    const { owner } = this;
    owner.register('service:store', Store);
    store = owner.lookup('service:store');
  });

  test('We can access links from a hasMany', async function (assert) {
    class ApplicationAdapter extends EmberObject {
      findRecord() {}
      findHasMany() {
        return resolve({
          data: [],
        });
      }
      shouldBackgroundReloadRecord() {
        return false;
      }
      shouldReloadRecord() {
        return false;
      }
    }
    class User extends Model {
      @attr name;
      @hasMany('tool', { inverse: null, async: true })
      tools;
    }
    class Tool extends Model {
      @attr name;
    }
    class ApplicationSerializer extends EmberObject {
      normalizeResponse(_, __, data) {
        return data;
      }
    }
    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', ApplicationSerializer);
    this.owner.register('model:user', User);
    this.owner.register('model:tool', Tool);

    const user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: '@runspired',
        },
        relationships: {
          tools: {
            links: {
              self: '/the/original/path',
              related: '/the/related/link',
              first: '/the/related/link?page=1',
              prev: null,
              last: '/the/related/link?page=3',
              next: '/the/related/link?page=2',
            },
          },
        },
      },
    });

    // Test we have access via the HasManyReference
    const toolsRef = user.hasMany('tools');
    let links = toolsRef.links();
    assert.true(!!links, 'We have a links value on the relationship HasManyReference');
    assert.strictEqual(links.related, '/the/related/link', 'The related link is correctly available');
    assert.strictEqual(links.first, '/the/related/link?page=1', 'The first link is correctly available');
    assert.strictEqual(links.last, '/the/related/link?page=3', 'The last link is correctly available');
    assert.strictEqual(links.prev, null, 'The prev link is correctly available');
    assert.strictEqual(links.next, '/the/related/link?page=2', 'The next link is correctly available');
    assert.strictEqual(links.self, '/the/original/path', 'The self link is correctly available');

    // Test we have access via the ManyArray
    const toolsRel = await user.tools;
    links = toolsRel.links;
    assert.true(!!links, 'We have a links value on the relationship ManyArray');
    assert.strictEqual(links.related, '/the/related/link', 'The related link is correctly available');
    assert.strictEqual(links.first, '/the/related/link?page=1', 'The first link is correctly available');
    assert.strictEqual(links.last, '/the/related/link?page=3', 'The last link is correctly available');
    assert.strictEqual(links.prev, null, 'The prev link is correctly available');
    assert.strictEqual(links.next, '/the/related/link?page=2', 'The next link is correctly available');
    assert.strictEqual(links.self, '/the/original/path', 'The self link is correctly available');
  });

  test('We preserve { href } link objects', async function (assert) {
    class ApplicationAdapter extends EmberObject {
      findRecord() {}
      findHasMany() {
        return resolve({
          data: [],
        });
      }
      shouldBackgroundReloadRecord() {
        return false;
      }
      shouldReloadRecord() {
        return false;
      }
    }
    class User extends Model {
      @attr name;
      @hasMany('tool', { inverse: null, async: true })
      tools;
    }
    class Tool extends Model {
      @attr name;
    }
    class ApplicationSerializer extends EmberObject {
      normalizeResponse(_, __, data) {
        return data;
      }
    }
    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', ApplicationSerializer);
    this.owner.register('model:user', User);
    this.owner.register('model:tool', Tool);

    const user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: '@runspired',
        },
        relationships: {
          tools: {
            links: {
              self: { href: '/the/original/path' },
              related: { href: '/the/related/link' },
              first: { href: '/the/related/link?page=1' },
              prev: null,
              last: { href: '/the/related/link?page=3' },
              next: { href: '/the/related/link?page=2' },
            },
          },
        },
      },
    });

    // Test we have access via the HasManyReference
    const toolsRef = user.hasMany('tools');
    let links = toolsRef.links();
    assert.true(!!links, 'We have a links value on the relationship HasManyReference');
    assert.deepEqual(links.related, { href: '/the/related/link' }, 'The related link is correctly available');
    assert.deepEqual(links.first, { href: '/the/related/link?page=1' }, 'The first link is correctly available');
    assert.deepEqual(links.last, { href: '/the/related/link?page=3' }, 'The last link is correctly available');
    assert.deepEqual(links.prev, null, 'The prev link is correctly available');
    assert.deepEqual(links.next, { href: '/the/related/link?page=2' }, 'The next link is correctly available');
    assert.deepEqual(links.self, { href: '/the/original/path' }, 'The self link is correctly available');

    // Test we have access via the ManyArray
    const toolsRel = await user.tools;
    links = toolsRel.links;
    assert.true(!!links, 'We have a links value on the relationship ManyArray');
    assert.deepEqual(links.related, { href: '/the/related/link' }, 'The related link is correctly available');
    assert.deepEqual(links.first, { href: '/the/related/link?page=1' }, 'The first link is correctly available');
    assert.deepEqual(links.last, { href: '/the/related/link?page=3' }, 'The last link is correctly available');
    assert.deepEqual(links.prev, null, 'The prev link is correctly available');
    assert.deepEqual(links.next, { href: '/the/related/link?page=2' }, 'The next link is correctly available');
    assert.deepEqual(links.self, { href: '/the/original/path' }, 'The self link is correctly available');
  });

  test('We unwrap the { href } link object when related link is accessed directly', async function (assert) {
    class ApplicationAdapter extends EmberObject {
      findRecord() {}
      findHasMany() {
        return resolve({
          data: [],
        });
      }
      shouldBackgroundReloadRecord() {
        return false;
      }
      shouldReloadRecord() {
        return false;
      }
    }
    class User extends Model {
      @attr name;
      @hasMany('tool', { inverse: null, async: true })
      tools;
    }
    class Tool extends Model {
      @attr name;
    }
    class ApplicationSerializer extends EmberObject {
      normalizeResponse(_, __, data) {
        return data;
      }
    }
    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', ApplicationSerializer);
    this.owner.register('model:user', User);
    this.owner.register('model:tool', Tool);

    const user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: '@runspired',
        },
        relationships: {
          tools: {
            links: {
              related: { href: '/the/related/link' },
            },
          },
        },
      },
    });

    // Test we have access via the HasManyReference
    const toolsRef = user.hasMany('tools');
    let links = toolsRef.links();
    assert.true(!!links, 'We have a links value on the relationship HasManyReference');
    assert.deepEqual(links.related, { href: '/the/related/link' }, 'The related link is correctly available');

    let link = toolsRef.link();
    assert.strictEqual(link, '/the/related/link', 'The related link is unwrapped when accessed directly');

    // Test we have access via the ManyArray
    const toolsRel = await user.tools;
    links = toolsRel.links;
    assert.true(!!links, 'We have a links value on the relationship ManyArray');
    assert.deepEqual(links.related, { href: '/the/related/link' }, 'The related link is correctly available');
  });

  test('Links in the top-level of a relationship-document update the relationship links', async function (assert) {
    class ApplicationAdapter extends EmberObject {
      findRecord() {}
      findHasMany() {
        return resolve({
          data: [],
          links: {
            self: { href: '/some/other/path' },
            related: { href: '/the/new/related/link?page=3' },
            first: { href: '/the/new/related/link?page=1' },
            prev: { href: '/the/new/related/link?page=2' },
            last: { href: '/the/new/related/link?page=5' },
            next: { href: '/the/new/related/link?page=4' },
          },
        });
      }
      shouldBackgroundReloadRecord() {
        return false;
      }
      shouldReloadRecord() {
        return false;
      }
    }
    class User extends Model {
      @attr name;
      @hasMany('tool', { inverse: null, async: true })
      tools;
    }
    class Tool extends Model {
      @attr name;
    }
    class ApplicationSerializer extends EmberObject {
      normalizeResponse(_, __, data) {
        return data;
      }
    }
    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', ApplicationSerializer);
    this.owner.register('model:user', User);
    this.owner.register('model:tool', Tool);

    const user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: '@runspired',
        },
        relationships: {
          tools: {
            links: {
              self: { href: '/the/original/path' },
              related: { href: '/the/related/link' },
              first: { href: '/the/related/link?page=1' },
              prev: null,
              last: { href: '/the/related/link?page=3' },
              next: { href: '/the/related/link?page=2' },
            },
          },
        },
      },
    });

    // Test we have access via the HasManyReference
    const toolsRef = user.hasMany('tools');
    let links = toolsRef.links();
    assert.true(!!links, 'We have a links value on the relationship HasManyReference');
    assert.deepEqual(links.related, { href: '/the/related/link' }, 'The related link is correctly available');
    assert.deepEqual(links.first, { href: '/the/related/link?page=1' }, 'The first link is correctly available');
    assert.deepEqual(links.last, { href: '/the/related/link?page=3' }, 'The last link is correctly available');
    assert.deepEqual(links.prev, null, 'The prev link is correctly available');
    assert.deepEqual(links.next, { href: '/the/related/link?page=2' }, 'The next link is correctly available');
    assert.deepEqual(links.self, { href: '/the/original/path' }, 'The self link is correctly available');

    // Test we have access via the PromiseManyArray
    links = user.tools.links;
    assert.deepEqual(links.related, { href: '/the/related/link' }, 'The related link is correctly available');
    assert.deepEqual(links.first, { href: '/the/related/link?page=1' }, 'The first link is correctly available');
    assert.deepEqual(links.last, { href: '/the/related/link?page=3' }, 'The last link is correctly available');
    assert.deepEqual(links.prev, null, 'The prev link is correctly available');
    assert.deepEqual(links.next, { href: '/the/related/link?page=2' }, 'The next link is correctly available');
    assert.deepEqual(links.self, { href: '/the/original/path' }, 'The self link is correctly available');

    // Make a request that returns top-level relationship links
    const toolsRel = await user.tools;

    links = toolsRef.links();
    assert.true(!!links, 'We have a links value on the relationship HasManyReference');
    assert.deepEqual(
      links.related,
      { href: '/the/new/related/link?page=3' },
      'The related link is correctly available'
    );
    assert.deepEqual(links.first, { href: '/the/new/related/link?page=1' }, 'The first link is correctly available');
    assert.deepEqual(links.last, { href: '/the/new/related/link?page=5' }, 'The last link is correctly available');
    assert.deepEqual(links.prev, { href: '/the/new/related/link?page=2' }, 'The prev link is correctly available');
    assert.deepEqual(links.next, { href: '/the/new/related/link?page=4' }, 'The next link is correctly available');
    assert.deepEqual(links.self, { href: '/some/other/path' }, 'The self link is correctly available');

    // Test we have access via the ManyArray
    links = toolsRel.links;
    assert.true(!!links, 'We have a links value on the relationship ManyArray');
    assert.deepEqual(
      links.related,
      { href: '/the/new/related/link?page=3' },
      'The related link is correctly available'
    );
    assert.deepEqual(links.first, { href: '/the/new/related/link?page=1' }, 'The first link is correctly available');
    assert.deepEqual(links.last, { href: '/the/new/related/link?page=5' }, 'The last link is correctly available');
    assert.deepEqual(links.prev, { href: '/the/new/related/link?page=2' }, 'The prev link is correctly available');
    assert.deepEqual(links.next, { href: '/the/new/related/link?page=4' }, 'The next link is correctly available');
    assert.deepEqual(links.self, { href: '/some/other/path' }, 'The self link is correctly available');
  });
});
