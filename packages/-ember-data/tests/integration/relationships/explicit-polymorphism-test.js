import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';

class FrameworkClass {
  constructor(args) {
    Object.assign(this, args);
  }

  static create(args) {
    return new this(args);
  }
}

module('Integration | Relationships | Explicit Polymorphism', function (hooks) {
  setupTest(hooks);

  test('a polymorphic belongsTo relationship with a null inverse may point at any type', async function (assert) {
    const { owner } = this;
    const store = owner.lookup('service:store');

    owner.register(
      'model:tag',
      class extends Model {
        @attr name;
        @belongsTo('taggable', { async: false, inverse: null, polymorphic: true }) tagged;
      }
    );
    owner.register(
      'model:comment',
      class extends Model {
        @attr name;
      }
    );
    owner.register(
      'model:post',
      class extends Model {
        @attr name;
      }
    );

    owner.register(
      'adapter:application',
      class extends FrameworkClass {
        findRecord(store, schema, id, snapshot) {
          return {
            data: {
              type: 'comment',
              id,
              attributes: {
                name: 'My Comment',
              },
            },
          };
        }
      }
    );
    owner.register(
      'serializer:application',
      class extends FrameworkClass {
        normalizeResponse(_, __, data) {
          return data;
        }
      }
    );

    const tag = store.push({
      data: {
        type: 'tag',
        id: '1',
        attributes: { name: 'My Tag' },
        relationships: {
          tagged: {
            data: { type: 'comment', id: '1' },
          },
        },
      },
    });

    assert.strictEqual(tag.name, 'My Tag', 'We pushed the Tag');
    assert.strictEqual(tag.belongsTo('tagged').id(), '1', 'we have the data for the relationship');

    await store.findRecord('comment', '1');

    assert.strictEqual(tag.tagged.id, '1', 'we have the loaded comment');
    assert.strictEqual(tag.tagged.name, 'My Comment', 'Comment is correct');
    assert.strictEqual(tag.tagged.constructor.modelName, 'comment', 'model name is correct');
    const identifier = recordIdentifierFor(tag.tagged);
    assert.strictEqual(identifier.type, 'comment', 'identifier type is correct');

    // update the value
    const post = store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: { name: 'My Post' },
      },
    });
    tag.tagged = post;
    assert.strictEqual(tag.tagged.id, '1', 'we have the loaded post');
    assert.strictEqual(tag.tagged.name, 'My Post', 'Post is correct');
    assert.strictEqual(tag.tagged.constructor.modelName, 'post', 'model name is correct');
    const identifier2 = recordIdentifierFor(tag.tagged);
    assert.strictEqual(identifier2.type, 'post', 'identifier type is correct');
  });

  test('a polymorphic belongsTo relationship with a specified inverse may only point at types that are correctly configured', async function (assert) {
    const { owner } = this;
    const store = owner.lookup('service:store');

    owner.register(
      'model:taggable',
      class extends Model {
        @belongsTo('tag', { async: false, inverse: 'tagged', as: 'taggable' }) tag;
      }
    );
    owner.register(
      'model:tag',
      class extends Model {
        @attr name;
        @belongsTo('taggable', { async: false, inverse: 'tag', polymorphic: true }) tagged;
      }
    );
    owner.register(
      'model:comment',
      class extends Model {
        @attr name;
        @belongsTo('tag', { async: false, inverse: 'tagged', as: 'taggable' }) tag;
      }
    );
    owner.register(
      'model:post',
      class extends Model {
        @attr name;
        @belongsTo('tag', { async: false, inverse: 'tagged', as: 'taggable' }) tag;
      }
    );

    const post = store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: { name: 'My Post' },
        relationships: {
          tag: {
            data: { type: 'tag', id: '1' },
          },
        },
      },
      included: [
        {
          type: 'tag',
          id: '1',
          attributes: { name: 'My Tag' },
          relationships: {
            tagged: {
              data: { type: 'post', id: '1' },
            },
          },
        },
      ],
    });
    const tag = store.peekRecord('tag', '1');

    assert.strictEqual(post.tag, tag, 'post can have a tag');

    const comment = store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: { name: 'My Comment' },
        relationships: {
          tag: {
            data: { type: 'tag', id: '1' },
          },
        },
      },
    });

    assert.strictEqual(comment.tag, tag, 'the tag now belongs to comment');
    assert.strictEqual(post.tag, null, 'post now has no tag');
  });

  test('a polymorphic belongsTo relationship with a specified inverse may initially specify the abstract type as a related record', async function (assert) {
    const { owner } = this;
    const store = owner.lookup('service:store');

    owner.register(
      'model:taggable',
      class extends Model {
        @belongsTo('tag', { async: false, inverse: 'tagged', as: 'taggable' }) tag;
      }
    );
    owner.register(
      'model:tag',
      class extends Model {
        @attr name;
        @belongsTo('taggable', { async: true, inverse: 'tag', polymorphic: true }) tagged;
      }
    );
    owner.register(
      'model:comment',
      class extends Model {
        @attr name;
        @belongsTo('tag', { async: false, inverse: 'tagged', as: 'taggable' }) tag;
      }
    );
    owner.register(
      'model:post',
      class extends Model {
        @attr name;
        @belongsTo('tag', { async: false, inverse: 'tagged', as: 'taggable' }) tag;
      }
    );
    owner.register(
      'adapter:application',
      class extends FrameworkClass {
        findRecord(store, schema, id, snapshot) {
          return {
            data: {
              type: 'comment',
              id,
              attributes: {
                name: 'My Comment',
              },
            },
          };
        }
      }
    );
    owner.register(
      'serializer:application',
      class extends FrameworkClass {
        normalizeResponse(_, __, data) {
          return data;
        }
      }
    );

    const tag = store.push({
      data: {
        type: 'tag',
        id: '1',
        attributes: { name: 'My Tag' },
        relationships: {
          tagged: {
            data: { type: 'taggable', id: '1' },
          },
        },
      },
    });
    const tagged = await tag.tagged;
    const comment = store.peekRecord('comment', '1');

    assert.strictEqual(tagged.name, 'My Comment', 'we have the right comment');
    assert.strictEqual(tagged, comment, 'abstract type can be used to fetch real type');
  });
});
