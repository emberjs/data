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
    const key = relationship.key;
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

const expectedResult = {
  data: [
    {
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
    {
      id: '4',
      type: 'comment',
      attributes: {
        text: 'You rock too',
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
  ],
};

module('integration/has-many - Has Many Tests', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', Store);
    this.owner.register('serializer:application', MinimalSerializer);
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
  });

  test('if a hasMany relationship has a link but no data (findHasMany is defined)', async function (assert) {
    let findRecordCalled = 0;
    let findManyCalled = 0;
    let findHasManyCalled = 0;

    const initialRecord = {
      data: {
        id: '2',
        type: 'post',
        attributes: {
          text: "I'm awesome",
        },
        relationships: {
          comments: {
            links: {
              related: 'https://example.com/api/post/2/comments',
            },
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

    class TestFindHasManyAdapter extends EmberObject {
      findRecord() {
        findRecordCalled++;
      }

      findMany() {
        findManyCalled++;
      }

      findHasMany(passedStore, snapshot, url, relationship) {
        findHasManyCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findHasMany');

        const expectedURL = initialRecord.data.relationships.comments.links.related;
        assert.equal(url, expectedURL, 'url is passed to findHasMany');
        assert.equal(relationship.name, 'comments', 'relationship is passed to findHasMany');

        assert.equal(snapshot.modelName, 'post', 'snapshot is passed to findHasMany with correct modelName');
        assert.equal(snapshot.id, '2', 'snapshot is passed to findHasMany with correct id');

        return Promise.resolve(expectedResultCopy);
      }
    }

    owner.register('adapter:application', TestFindHasManyAdapter);

    const post = store.push(initialRecord);

    const comments = await post.comments;
    const serializedComments = {
      data: comments.slice().map((comment) => comment.serialize().data),
    };

    assert.equal(findRecordCalled, 0, 'findRecord is not called');
    assert.equal(findManyCalled, 0, 'findMany is not called');
    assert.equal(findHasManyCalled, 1, 'findHasMany is called once');
    assert.deepEqual(serializedComments, expectedResult, 'findHasMany returns expected result');
  });

  testInDebug('if a hasMany relationship has a link but no data (findHasMany is undefined)', async function (assert) {
    const initialRecord = {
      data: {
        id: '2',
        type: 'post',
        attributes: {
          text: "I'm awesome",
        },
        relationships: {
          comments: {
            links: {
              related: 'https://example.com/api/post/2/comments',
            },
          },
        },
      },
    };

    const { owner } = this;
    const store = owner.lookup('service:store');

    class TestFindHasManyAdapter extends EmberObject {}

    owner.register('adapter:application', TestFindHasManyAdapter);

    const post = store.push(initialRecord);

    await assert.expectAssertion(async function () {
      await post.comments;
    }, /You tried to load a hasMany relationship from a specified 'link' in the original payload but your adapter does not implement 'findHasMany'/);
  });

  test('if a hasMany relationship has data but not a link (coalescing is off, findHasMany is defined)', async function (assert) {
    let findRecordCalled = 0;
    let findManyCalled = 0;
    let findHasManyCalled = 0;

    const initialRecord = {
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
              {
                id: '4',
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
      coalesceFindRequests = false;

      findRecord(passedStore, type, id, snapshot) {
        const index = findRecordCalled++;
        const expectedId = initialRecord.data.relationships.comments.data[index].id;

        assert.equal(passedStore, store, 'instance of store is passed to findRecord');
        assert.equal(type, Comment, 'model is passed to findRecord');
        assert.equal(id, expectedId, 'id is passed to findRecord');

        assert.equal(snapshot.modelName, 'comment', 'snapshot is passed to findRecord with correct modelName');
        assert.equal(snapshot.id, expectedId, 'snapshot is passed to findRecord with correct id');

        return Promise.resolve({ data: expectedResultCopy.data[index] });
      }

      findMany() {
        findManyCalled++;
      }

      findHasMany() {
        findHasManyCalled++;
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const post = store.push(initialRecord);
    const comments = await post.comments;
    const serializedComments = {
      data: comments.slice().map((comment) => comment.serialize().data),
    };

    assert.equal(findRecordCalled, 2, 'findRecord is called twice');
    assert.equal(findManyCalled, 0, 'findMany is not called');
    assert.equal(findHasManyCalled, 0, 'findHasMany is not called');
    assert.deepEqual(serializedComments, expectedResult, 'get returns expected result');
  });

  test('if a hasMany relationship has data but not a link (coalescing is off, findHasMany is not defined)', async function (assert) {
    let findRecordCalled = 0;
    let findManyCalled = 0;

    const initialRecord = {
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
              {
                id: '4',
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
      coalesceFindRequests = false;

      findRecord(passedStore, type, id, snapshot) {
        const index = findRecordCalled++;
        const expectedId = initialRecord.data.relationships.comments.data[index].id;

        assert.equal(passedStore, store, 'instance of store is passed to findRecord');
        assert.equal(type, Comment, 'model is passed to findRecord');
        assert.equal(id, expectedId, 'id is passed to findRecord');

        assert.equal(snapshot.modelName, 'comment', 'snapshot is passed to findRecord with correct modelName');
        assert.equal(snapshot.id, expectedId, 'snapshot is passed to findRecord with correct id');

        return Promise.resolve({ data: expectedResultCopy.data[index] });
      }

      findMany() {
        findManyCalled++;
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const post = store.push(initialRecord);
    const comments = await post.comments;
    const serializedComments = {
      data: comments.slice().map((comment) => comment.serialize().data),
    };

    assert.equal(findRecordCalled, 2, 'findRecord is called twice');
    assert.equal(findManyCalled, 0, 'findMany is not called');
    assert.deepEqual(serializedComments, expectedResult, 'get returns expected result');
  });

  test('if a hasMany relationship has data but not a link (coalescing is on, findHasMany is defined)', async function (assert) {
    let findRecordCalled = 0;
    let findManyCalled = 0;
    let findHasManyCalled = 0;

    const initialRecord = {
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
              {
                id: '4',
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

    class TestFindManyAdapter extends EmberObject {
      coalesceFindRequests = true;

      findRecord() {
        findRecordCalled++;
      }

      findHasMany() {
        findHasManyCalled++;
      }

      groupRecordsForFindMany(store, snapshots) {
        return [snapshots];
      }

      findMany(passedStore, type, ids, snapshots) {
        findManyCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findMany');
        assert.equal(type, Comment, 'model is passed to findMany');

        const expectedIds = expectedResultCopy.data.map((record) => record.id);
        assert.deepEqual(ids, expectedIds, 'ids are passed to findMany');

        snapshots.forEach((snapshot, index) => {
          assert.equal(snapshot.modelName, 'comment', 'snapshot is passed to findMany with correct modelName');
          assert.equal(snapshot.id, expectedIds[index], 'snapshot is passed to findMany with correct id');
        });

        return Promise.resolve(expectedResultCopy);
      }
    }

    owner.register('adapter:application', TestFindManyAdapter);

    const post = store.push(initialRecord);
    const comments = await post.comments;
    const serializedComments = {
      data: comments.slice().map((comment) => comment.serialize().data),
    };

    assert.equal(findRecordCalled, 0, 'findRecord is not called');
    assert.equal(findManyCalled, 1, 'findMany is called once');
    assert.equal(findHasManyCalled, 0, 'findHasMany is not called');
    assert.deepEqual(serializedComments, expectedResult, 'get returns expected result');
  });

  test('if a hasMany relationship has data but not a link (coalescing is on, findHasMany is not defined)', async function (assert) {
    let findRecordCalled = 0;
    let findManyCalled = 0;

    const initialRecord = {
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
              {
                id: '4',
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

    class TestFindManyAdapter extends EmberObject {
      coalesceFindRequests = true;

      findRecord() {
        findRecordCalled++;
      }

      groupRecordsForFindMany(store, snapshots) {
        return [snapshots];
      }

      findMany(passedStore, type, ids, snapshots) {
        findManyCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findMany');
        assert.equal(type, Comment, 'model is passed to findMany');

        const expectedIds = expectedResultCopy.data.map((record) => record.id);
        assert.deepEqual(ids, expectedIds, 'ids are passed to findMany');

        snapshots.forEach((snapshot, index) => {
          assert.equal(snapshot.modelName, 'comment', 'snapshot is passed to findMany with correct modelName');
          assert.equal(snapshot.id, expectedIds[index], 'snapshot is passed to findMany with correct id');
        });

        return Promise.resolve(expectedResultCopy);
      }
    }

    owner.register('adapter:application', TestFindManyAdapter);

    const post = store.push(initialRecord);
    const comments = await post.comments;
    const serializedComments = {
      data: comments.slice().map((comment) => comment.serialize().data),
    };

    assert.equal(findRecordCalled, 0, 'findRecord is not called');
    assert.equal(findManyCalled, 1, 'findMany is called once');
    assert.deepEqual(serializedComments, expectedResult, 'get returns expected result');
  });

  test('if a hasMany relationship has link and data (findHasMany is defined)', async function (assert) {
    let findRecordCalled = 0;
    let findManyCalled = 0;
    let findHasManyCalled = 0;

    const initialRecord = {
      data: {
        id: '2',
        type: 'post',
        attributes: {
          text: "I'm awesome",
        },
        relationships: {
          comments: {
            links: {
              related: 'https://example.com/api/post/2/comments',
            },
            data: [
              {
                id: '3',
                type: 'comment',
              },
              {
                id: '4',
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

    class TestFindHasManyAdapter extends EmberObject {
      findRecord() {
        findRecordCalled++;
      }

      findMany() {
        findManyCalled++;
      }

      findHasMany(passedStore, snapshot, url, relationship) {
        findHasManyCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findHasMany');

        const expectedURL = initialRecord.data.relationships.comments.links.related;
        assert.equal(url, expectedURL, 'url is passed to findHasMany');
        assert.equal(relationship.name, 'comments', 'relationship is passed to findHasMany');

        assert.equal(snapshot.modelName, 'post', 'snapshot is passed to findHasMany with correct modelName');
        assert.equal(snapshot.id, '2', 'snapshot is passed to findHasMany with correct id');

        return Promise.resolve(expectedResultCopy);
      }
    }

    owner.register('adapter:application', TestFindHasManyAdapter);

    const post = store.push(initialRecord);

    const comments = await post.comments;
    const serializedComments = {
      data: comments.slice().map((comment) => comment.serialize().data),
    };

    assert.equal(findRecordCalled, 0, 'findRecord is not called');
    assert.equal(findManyCalled, 0, 'findMany is not called');
    assert.equal(findHasManyCalled, 1, 'findHasMany is called once');
    assert.deepEqual(serializedComments, expectedResult, 'findHasMany returns expected result');
  });

  test('if a hasMany relationship has link and data (coalescing is on, findHasMany is not defined)', async function (assert) {
    let findRecordCalled = 0;
    let findManyCalled = 0;

    const initialRecord = {
      data: {
        id: '2',
        type: 'post',
        attributes: {
          text: "I'm awesome",
        },
        relationships: {
          comments: {
            links: {
              related: 'https://example.com/api/post/2/comments',
            },
            data: [
              {
                id: '3',
                type: 'comment',
              },
              {
                id: '4',
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

    class TestFindManyAdapter extends EmberObject {
      coalesceFindRequests = true;

      findRecord() {
        findRecordCalled++;
      }

      groupRecordsForFindMany(store, snapshots) {
        return [snapshots];
      }

      findMany(passedStore, type, ids, snapshots) {
        findManyCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findMany');
        assert.equal(type, Comment, 'model is passed to findMany');

        const expectedIds = expectedResultCopy.data.map((record) => record.id);
        assert.deepEqual(ids, expectedIds, 'ids are passed to findMany');

        snapshots.forEach((snapshot, index) => {
          assert.equal(snapshot.modelName, 'comment', 'snapshot is passed to findMany with correct modelName');
          assert.equal(snapshot.id, expectedIds[index], 'snapshot is passed to findMany with correct id');
        });

        return Promise.resolve(expectedResultCopy);
      }
    }

    owner.register('adapter:application', TestFindManyAdapter);

    const post = store.push(initialRecord);
    const comments = await post.comments;
    const serializedComments = {
      data: comments.slice().map((comment) => comment.serialize().data),
    };

    assert.equal(findRecordCalled, 0, 'findRecord is not called');
    assert.equal(findManyCalled, 1, 'findMany is called once');
    assert.deepEqual(serializedComments, expectedResult, 'get returns expected result');
  });

  test('if a hasMany relationship has link and data (coalescing is off, findHasMany is not defined)', async function (assert) {
    let findRecordCalled = 0;
    let findManyCalled = 0;

    const initialRecord = {
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
              {
                id: '4',
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
      coalesceFindRequests = false;

      findRecord(passedStore, type, id, snapshot) {
        const index = findRecordCalled++;
        const expectedId = initialRecord.data.relationships.comments.data[index].id;

        assert.equal(passedStore, store, 'instance of store is passed to findRecord');
        assert.equal(type, Comment, 'model is passed to findRecord');
        assert.equal(id, expectedId, 'id is passed to findRecord');

        assert.equal(snapshot.modelName, 'comment', 'snapshot is passed to findRecord with correct modelName');
        assert.equal(snapshot.id, expectedId, 'snapshot is passed to findRecord with correct id');

        return Promise.resolve({ data: expectedResultCopy.data[index] });
      }

      findMany() {
        findManyCalled++;
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const post = store.push(initialRecord);
    const comments = await post.comments;
    const serializedComments = {
      data: comments.slice().map((comment) => comment.serialize().data),
    };

    assert.equal(findRecordCalled, 2, 'findRecord is called twice');
    assert.equal(findManyCalled, 0, 'findMany is not called');
    assert.deepEqual(serializedComments, expectedResult, 'get returns expected result');
  });
});
