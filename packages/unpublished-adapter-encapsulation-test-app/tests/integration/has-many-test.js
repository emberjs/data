import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';
import EmberObject from '@ember/object';
import Store from 'adapter-encapsulation-test-app/services/store';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import deepCopy from '@ember-data/unpublished-test-infra/test-support/deep-copy';
import { resolve } from 'rsvp';

class MinimalSerializer extends EmberObject {
  normalizeResponse(_, __, data) {
    return data;
  }

  serialize(snapshot) {
    let json = {
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
    let key = relationship.key;
    let belongsTo = snapshot.belongsTo(key);

    if (belongsTo) {
      let value = {
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
    let key = relationship.key;
    let hasMany = snapshot.hasMany(key);

    if (hasMany && hasMany.length) {
      let value = {
        data: hasMany.map(snap => ({
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

  @hasMany('comments')
  comments;
}

class Comment extends Model {
  @attr
  text;

  @belongsTo('post')
  post;
}

module('integration/has-many - Has Many Tests', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('service:store', Store);
    this.owner.register('serializer:application', MinimalSerializer);
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
  });
});
