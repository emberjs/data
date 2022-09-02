import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';

class FrameworkClass {
  constructor(args) {
    Object.assign(this, args);
  }

  static create(args) {
    return new this(args);
  }
}

module('Integration | Relationships | Explicit Polymorphic HasMany', function (hooks) {
  setupTest(hooks);

  test('a polymorphic hasMany relationship with a null inverse may point at any type', async function (assert) {
    const { owner } = this;
    const store = owner.lookup('service:store');

    owner.register(
      'model:tag',
      class extends Model {
        @attr name;
        @hasMany('taggable', { async: false, inverse: null, polymorphic: true }) tagged;
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
            data: [{ type: 'comment', id: '1' }],
          },
        },
      },
    });

    assert.strictEqual(tag.name, 'My Tag', 'We pushed the Tag');
    assert.deepEqual(tag.hasMany('tagged').ids(), ['1'], 'we have the data for the relationship');

    await store.findRecord('comment', '1');

    assert.strictEqual(tag.tagged[0].id, '1', 'we have the loaded comment');
    assert.strictEqual(tag.tagged[0].name, 'My Comment', 'Comment is correct');
    assert.strictEqual(tag.tagged[0].constructor.modelName, 'comment', 'model name is correct');
    const identifier = recordIdentifierFor(tag.tagged[0]);
    assert.strictEqual(identifier.type, 'comment', 'identifier type is correct');

    // update the value
    const post = store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: { name: 'My Post' },
      },
    });
    tag.tagged.push(post);
    assert.deepEqual(
      tag.tagged.map((v) => v.id),
      ['1', '1'],
      'we have the loaded post'
    );
    assert.deepEqual(
      tag.tagged.map((v) => v.constructor.modelName),
      ['comment', 'post'],
      'we have the loaded post'
    );
    assert.strictEqual(tag.tagged[1].name, 'My Post', 'Post is correct');
    const identifier2 = recordIdentifierFor(tag.tagged[1]);
    assert.strictEqual(identifier2.type, 'post', 'identifier type is correct');
  });

  test('a polymorphic hasMany relationship with a specified inverse may only point at types that are correctly configured', async function (assert) {
    const { owner } = this;
    const store = owner.lookup('service:store');

    owner.register(
      'model:taggable',
      class extends Model {
        @belongsTo('tag', { async: false, inverse: 'tagged', as: 'taggable' }) tag;
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
      'model:tag',
      class extends Model {
        @attr name;
        @hasMany('taggable', { async: false, inverse: 'tag', polymorphic: true }) tagged;
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
              data: [{ type: 'post', id: '1' }],
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

    assert.strictEqual(comment.tag, tag, 'the tag now also belongs to comment');
    assert.strictEqual(post.tag, tag, 'post still has the tag');
    assert.deepEqual(
      tag.tagged.map((v) => ({ type: v.constructor.modelName, id: v.id })),
      [
        { type: 'post', id: '1' },
        { type: 'comment', id: '1' },
      ],
      'We have the right tagged content'
    );
  });

  test('a polymorphic hasMany relationship with a specified inverse may initially specify the abstract type as a related record', async function (assert) {
    const { owner } = this;
    const store = owner.lookup('service:store');

    owner.register(
      'model:taggable',
      class extends Model {
        @belongsTo('tag', { async: false, inverse: 'tagged', as: 'taggable' }) tag;
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
      'model:tag',
      class extends Model {
        @attr name;
        @hasMany('taggable', { async: true, inverse: 'tag', polymorphic: true }) tagged;
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
            data: [{ type: 'taggable', id: '1' }],
          },
        },
      },
    });
    const tagged = await tag.tagged;
    const comment = store.peekRecord('comment', '1');

    assert.strictEqual(tagged[0].name, 'My Comment', 'we have the right comment');
    assert.strictEqual(tagged[0], comment, 'abstract type can be used to fetch real type');
    assert.strictEqual(tagged[0].constructor.modelName, 'comment', 'abstract type can be used to fetch real type');
  });

  test('polymorphic hasMany to polymorphic hasMany works as expected', async function (assert) {
    const { owner } = this;
    owner.register(
      'model:taggable',
      class extends Model {
        @hasMany('tag', { async: false, inverse: 'tagged', polymorphic: true, as: 'taggable' }) tags;
      }
    );
    owner.register(
      'model:comment',
      class extends Model {
        @attr text;
        @hasMany('tag', { async: false, inverse: 'tagged', polymorphic: true, as: 'taggable' }) tags;
      }
    );
    owner.register(
      'model:post',
      class extends Model {
        @attr title;
        @hasMany('tag', { async: false, inverse: 'tagged', polymorphic: true, as: 'taggable' }) tags;
      }
    );
    owner.register(
      'model:tag',
      class extends Model {
        @attr name;
        @hasMany('taggable', { async: false, inverse: 'tags', polymorphic: true, as: 'tag' }) tagged;
      }
    );
    owner.register(
      'model:label',
      class extends Model {
        @attr text;
        @hasMany('taggable', { async: false, inverse: 'tags', polymorphic: true, as: 'tag' }) tagged;
      }
    );
    const store = owner.lookup('service:store');

    const post = store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: { title: 'Rey is the best Dog' },
        relationships: {
          tags: {
            data: [{ type: 'label', id: '1' }],
          },
        },
      },
    });
    const tag = store.push({
      data: {
        type: 'tag',
        id: '1',
        attributes: { name: 'Friend' },
        relationships: {
          tagged: {
            data: [{ type: 'comment', id: '1' }],
          },
        },
      },
    });
    const comment = store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: { text: 'I agree, Rey is the best!' },
      },
    });
    const label = store.push({
      data: {
        type: 'label',
        id: '1',
        attributes: { text: 'Best Puppers' },
      },
    });

    assert.strictEqual(post.tags[0], label, 'post accepts label, and label accepts post');
    assert.strictEqual(tag.tagged[0], comment, 'tag accepts comment, and comment accepts tag');
    post.tags = [tag];

    assert.strictEqual(post.tags[0], tag, 'post accepts tag, and tag accepts post');
    assert.strictEqual(comment.tags[0], tag, 'comment still accepts tag, tag still accepts comment');
    assert.strictEqual(label.tagged.length, 0, 'label is not tagged');
    comment.tags = [label];

    assert.strictEqual(post.tags[0], tag, 'post accepts tag, and tag accepts post');
    assert.strictEqual(tag.tagged.length, 1, 'tag connects to just post');
    assert.strictEqual(label.tagged[0], comment, 'label accepts comment, comment accepts label');
    assert.strictEqual(tag.tagged[0], post, 'tag accepts post, post accepts tag');
  });

  test('a polymorphic hasMany relationship with a specified inverse can use an abstract-type defined via the schema service', async function (assert) {
    const { owner } = this;
    const store = owner.lookup('service:store');

    const AbstractSchemas = new Map([
      [
        'taggable',
        {
          tag: {
            kind: 'belongsTo',
            type: 'tag',
            name: 'tag',
            options: {
              async: false,
              inverse: 'tagged',
              as: 'taggable',
            },
          },
        },
      ],
    ]);

    class SchemaDelegator {
      constructor(schema) {
        this._schema = schema;
      }

      doesTypeExist(type) {
        if (AbstractSchemas.has(type)) {
          return true; // some apps may want `true`
        }
        return this._schema.doesTypeExist(type);
      }

      attributesDefinitionFor(identifier) {
        return this._schema.attributesDefinitionFor(identifier);
      }

      relationshipsDefinitionFor(identifier) {
        const schema = AbstractSchemas.get(identifier.type);
        return schema || this._schema.relationshipsDefinitionFor(identifier);
      }
    }
    const schema = store.getSchemaDefinitionService();
    store.registerSchemaDefinitionService(new SchemaDelegator(schema));

    owner.register(
      'model:tag',
      class extends Model {
        @attr name;
        @hasMany('taggable', { async: false, inverse: 'tag', polymorphic: true }) tagged;
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
              data: [{ type: 'post', id: '1' }],
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
    assert.strictEqual(post.tag, tag, 'post still has the right tag');
  });
});
