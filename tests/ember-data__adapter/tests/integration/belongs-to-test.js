import EmberObject from '@ember/object';

import Store from 'ember-data__adapter/services/store';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';
import { module, test } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

class MinimalSerializer extends EmberObject {
  normalizeResponse(_, __, data) {
    return data;
  }

  serialize(snapshot) {
    const json = {
      data: {
        id: snapshot.id,
        type: snapshot.modelName,
        attributes: snapshot.attributes(),
        relationships: {},
      },
    };

    snapshot.eachRelationship((key, relationship) => {
      if (relationship.kind === 'belongsTo') {
        this.serializeBelongsTo(snapshot, json, relationship);
      } else if (relationship.kind === 'hasMany') {
        this.serializeHasMany(snapshot, json, relationship);
      }
    });

    if (Object.keys(json.data.relationships).length === 0) {
      delete json.data.relationships;
    }

    return json;
  }

  // minimal implementation, not json-api compliant
  serializeBelongsTo(snapshot, json, relationship) {
    const key = relationship.name;
    const belongsTo = snapshot.belongsTo(key);

    if (belongsTo) {
      const value = {
        data: {
          id: belongsTo.id,
          type: belongsTo.modelName,
        },
      };
      json.data.relationships[key] = value;
    }
  }

  // minimal implementation, not json-api compliant
  serializeHasMany(snapshot, json, relationship) {
    const key = relationship.key;
    const hasMany = snapshot.hasMany(key);

    if (hasMany && hasMany.length) {
      const value = {
        data: hasMany.map((snap) => ({
          id: snap.id,
          type: snap.modelName,
        })),
      };
      json.data.relationships[key] = value;
    }
  }
}

class Post extends Model {
  @attr
  text;

  @hasMany('comments', { async: true, inverse: 'post' })
  comments;
}

class Comment extends Model {
  @attr
  text;

  @belongsTo('post', { async: true, inverse: 'comments' })
  post;
}

module('integration/belongs-to - Belongs To Tests', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', Store);
    this.owner.register('serializer:application', MinimalSerializer);
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
  });

  test('if a belongsTo relationship has a link but no data (findBelongsTo is defined)', async function (assert) {
    let findRecordCalled = 0;
    let findBelongsToCalled = 0;

    const initialRecord = {
      data: {
        id: '3',
        type: 'comment',
        attributes: {
          text: 'You rock',
        },
        relationships: {
          post: {
            links: {
              related: 'https://example.com/api/post/2',
            },
          },
        },
      },
    };

    const expectedResult = {
      data: {
        id: '2',
        type: 'post',
        attributes: {
          text: "I'm awesome",
        },
        relationships: {
          comments: {
            data: [
              {
                id: '3',
                type: 'comment',
              },
            ],
          },
        },
      },
    };

    const { owner } = this;
    const store = owner.lookup('service:store');

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    const expectedResultCopy = structuredClone(expectedResult);

    class TestFindBelongsToAdapter extends EmberObject {
      findRecord() {
        findRecordCalled++;
      }

      findBelongsTo(passedStore, snapshot, url, relationship) {
        findBelongsToCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findBelongsTo');

        const expectedURL = initialRecord.data.relationships.post.links.related;
        assert.equal(url, expectedURL, 'url is passed to findBelongsTo');
        assert.equal(relationship.key, 'post', 'relationship is passed to findBelongsTo');

        assert.equal(snapshot.modelName, 'comment', 'snapshot is passed to findBelongsTo with correct modelName');
        assert.equal(snapshot.id, '3', 'snapshot is passed to findBelongsTo with correct id');

        return Promise.resolve(expectedResultCopy);
      }
    }

    owner.register('adapter:application', TestFindBelongsToAdapter);

    const comment = store.push(initialRecord);

    const post = await comment.post;

    assert.equal(findRecordCalled, 0, 'findRecord is not called');
    assert.equal(findBelongsToCalled, 1, 'findBelongsTo is called once');
    assert.deepEqual(post.serialize(), expectedResult, 'findBelongsTo returns expected result');
  });

  testInDebug(
    'if a belongsTo relationship has a link but no data (findBelongsTo is undefined)',
    async function (assert) {
      const initialRecord = {
        data: {
          id: '3',
          type: 'comment',
          attributes: {
            text: 'You rock',
          },
          relationships: {
            post: {
              links: {
                related: 'https://example.com/api/post/2',
              },
            },
          },
        },
      };

      const { owner } = this;
      const store = owner.lookup('service:store');

      class TestFindBelongsToAdapter extends EmberObject {}

      owner.register('adapter:application', TestFindBelongsToAdapter);

      const comment = store.push(initialRecord);

      await assert.expectAssertion(async function () {
        await comment.post;
      }, /You tried to load a belongsTo relationship from a specified 'link' in the original payload but your adapter does not implement 'findBelongsTo'/);
    }
  );

  test('if a belongsTo relationship has data but not a link (findBelongsTo is defined)', async function (assert) {
    let findRecordCalled = 0;
    let findBelongsToCalled = 0;

    const initialRecord = {
      data: {
        id: '3',
        type: 'comment',
        attributes: {
          text: 'You rock',
        },
        relationships: {
          post: {
            data: {
              id: '2',
              type: 'post',
            },
          },
        },
      },
    };

    const expectedResult = {
      data: {
        id: '2',
        type: 'post',
        attributes: {
          text: "I'm awesome",
        },
        relationships: {
          comments: {
            data: [
              {
                id: '3',
                type: 'comment',
              },
            ],
          },
        },
      },
    };

    const { owner } = this;
    const store = owner.lookup('service:store');

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    const expectedResultCopy = structuredClone(expectedResult);

    class TestFindRecordAdapter extends EmberObject {
      findRecord(passedStore, type, id, snapshot) {
        findRecordCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findRecord');
        assert.equal(type, Post, 'model is passed to findRecord');
        assert.equal(id, '2', 'id is passed to findRecord');

        assert.equal(snapshot.modelName, 'post', 'snapshot is passed to findRecord with correct modelName');
        assert.equal(snapshot.id, '2', 'snapshot is passed to findRecord with correct id');

        return Promise.resolve(expectedResultCopy);
      }

      findBelongsTo() {
        findBelongsToCalled++;
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const comment = store.push(initialRecord);

    const post = await comment.post;

    assert.equal(findRecordCalled, 1, 'findRecord is called once');
    assert.equal(findBelongsToCalled, 0, 'findBelongsTo is not called');
    assert.deepEqual(post.serialize(), expectedResult, 'findRecord returns expected result');
  });

  test('if a belongsTo relationship has data but not a link (findBelongsTo is not defined)', async function (assert) {
    let findRecordCalled = 0;

    const initialRecord = {
      data: {
        id: '3',
        type: 'comment',
        attributes: {
          text: 'You rock',
        },
        relationships: {
          post: {
            data: {
              id: '2',
              type: 'post',
            },
          },
        },
      },
    };

    const expectedResult = {
      data: {
        id: '2',
        type: 'post',
        attributes: {
          text: "I'm awesome",
        },
        relationships: {
          comments: {
            data: [
              {
                id: '3',
                type: 'comment',
              },
            ],
          },
        },
      },
    };

    const { owner } = this;
    const store = owner.lookup('service:store');

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    const expectedResultCopy = structuredClone(expectedResult);

    class TestFindRecordAdapter extends EmberObject {
      findRecord(passedStore, type, id, snapshot) {
        findRecordCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findRecord');
        assert.equal(type, Post, 'model is passed to findRecord');
        assert.equal(id, '2', 'id is passed to findRecord');

        assert.equal(snapshot.modelName, 'post', 'snapshot is passed to findRecord with correct modelName');
        assert.equal(snapshot.id, '2', 'snapshot is passed to findRecord with correct id');

        return Promise.resolve(expectedResultCopy);
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const comment = store.push(initialRecord);

    const post = await comment.post;

    assert.equal(findRecordCalled, 1, 'findRecord is called once');
    assert.deepEqual(post.serialize(), expectedResult, 'findRecord returns expected result');
  });

  test('if a belongsTo relationship has a link and data (findBelongsTo is defined)', async function (assert) {
    let findRecordCalled = 0;
    let findBelongsToCalled = 0;

    const initialRecord = {
      data: {
        id: '3',
        type: 'comment',
        attributes: {
          text: 'You rock',
        },
        relationships: {
          post: {
            data: {
              id: '2',
              type: 'post',
            },
            links: {
              related: 'https://example.com/api/post/2',
            },
          },
        },
      },
    };

    const expectedResult = {
      data: {
        id: '2',
        type: 'post',
        attributes: {
          text: "I'm awesome",
        },
        relationships: {
          comments: {
            data: [
              {
                id: '3',
                type: 'comment',
              },
            ],
          },
        },
      },
    };

    const { owner } = this;
    const store = owner.lookup('service:store');

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    const expectedResultCopy = structuredClone(expectedResult);

    class TestFindBelongsToAdapter extends EmberObject {
      findRecord() {
        findRecordCalled++;
      }

      findBelongsTo(passedStore, snapshot, url, relationship) {
        findBelongsToCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findBelongsTo');

        const expectedURL = initialRecord.data.relationships.post.links.related;
        assert.equal(url, expectedURL, 'url is passed to findBelongsTo');
        assert.equal(relationship.name, 'post', 'relationship is passed to findBelongsTo');

        assert.equal(snapshot.modelName, 'comment', 'snapshot is passed to findBelongsTo with correct modelName');
        assert.equal(snapshot.id, '3', 'snapshot is passed to findBelongsTo with correct id');

        return Promise.resolve(expectedResultCopy);
      }
    }

    owner.register('adapter:application', TestFindBelongsToAdapter);

    const comment = store.push(initialRecord);

    const post = await comment.post;

    assert.equal(findRecordCalled, 0, 'findRecord is not called');
    assert.equal(findBelongsToCalled, 1, 'findBelongsTo is called once');
    assert.deepEqual(post.serialize(), expectedResult, 'findBelongsTo returns expected result');
  });

  test('if a belongsTo relationship has link and data (findBelongsTo is not defined)', async function (assert) {
    let findRecordCalled = 0;

    const initialRecord = {
      data: {
        id: '3',
        type: 'comment',
        attributes: {
          text: 'You rock',
        },
        relationships: {
          post: {
            data: {
              id: '2',
              type: 'post',
            },
          },
        },
      },
    };

    const expectedResult = {
      data: {
        id: '2',
        type: 'post',
        attributes: {
          text: "I'm awesome",
        },
        relationships: {
          comments: {
            data: [
              {
                id: '3',
                type: 'comment',
              },
            ],
          },
        },
      },
    };

    const { owner } = this;
    const store = owner.lookup('service:store');

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    const expectedResultCopy = structuredClone(expectedResult);

    class TestFindRecordAdapter extends EmberObject {
      findRecord(passedStore, type, id, snapshot) {
        findRecordCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findRecord');
        assert.equal(type, Post, 'model is passed to findRecord');
        assert.equal(id, '2', 'id is passed to findRecord');

        assert.equal(snapshot.modelName, 'post', 'snapshot is passed to findRecord with correct modelName');
        assert.equal(snapshot.id, '2', 'snapshot is passed to findRecord with correct id');

        return Promise.resolve(expectedResultCopy);
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const comment = store.push(initialRecord);

    const post = await comment.post;

    assert.equal(findRecordCalled, 1, 'findRecord is called once');
    assert.deepEqual(post.serialize(), expectedResult, 'findRecord returns expected result');
  });
});
