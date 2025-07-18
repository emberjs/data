/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { getOwner } from '@ember/application';
import { warn } from '@ember/debug';

import type { Store } from '@warp-drive/core';
import { assert } from '@warp-drive/core/build-config/macros';
import type { ModelSchema } from '@warp-drive/core/types';
import type {
  LegacyAttributeField,
  LegacyBelongsToField,
  LegacyHasManyField,
} from '@warp-drive/core/types/schema/fields';
import { dasherize, singularize } from '@warp-drive/utilities/string';

import type { Snapshot } from '../compat/-private.ts';
import { Serializer } from '../serializer.ts';
import { coerceId } from './-private/utils.ts';
import type { Transform } from './transform.ts';

const SOURCE_POINTER_REGEXP = /^\/?data\/(attributes|relationships)\/(.*)/;
const SOURCE_POINTER_PRIMARY_REGEXP = /^\/?data/;
const PRIMARY_ATTRIBUTE_KEY = 'base';

/**
 * <blockquote style="margin: 1em; padding: .1em 1em .1em 1em; border-left: solid 1em #E34C32; background: #e0e0e0;">
  <p>
    ⚠️ <strong>This is LEGACY documentation</strong> for a feature that is no longer encouraged to be used.
    If starting a new app or thinking of implementing a new adapter, consider writing a
    <a href="/ember-data/release/classes/%3CInterface%3E%20Handler">Handler</a> instead to be used with the <a href="https://github.com/emberjs/data/tree/main/packages/request#readme">RequestManager</a>
  </p>
  </blockquote>

  In EmberData a Serializer is used to serialize and deserialize
  records when they are transferred in and out of an external source.
  This process involves normalizing property names, transforming
  attribute values and serializing relationships.

  By default, EmberData uses and recommends the `JSONAPISerializer`.

  `JSONSerializer` is useful for simpler or legacy backends that may
  not support the http://jsonapi.org/ spec.

  For example, given the following `User` model and JSON payload:

  ```js [app/models/user.js]
  import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

  export default class UserModel extends Model {
    @hasMany('user') friends;
    @belongsTo('location') house;

    @attr('string') name;
  }
  ```

  ```js
  {
    id: 1,
    name: 'Sebastian',
    friends: [3, 4],
    links: {
      house: '/houses/lefkada'
    }
  }
  ```

  `JSONSerializer` will normalize the JSON payload to the JSON API format that the
  Ember Data store expects.

  You can customize how JSONSerializer processes its payload by passing options in
  the `attrs` hash or by subclassing the `JSONSerializer` and overriding hooks:

    - To customize how a single record is normalized, use the `normalize` hook.
    - To customize how `JSONSerializer` normalizes the whole server response, use the
      `normalizeResponse` hook.
    - To customize how `JSONSerializer` normalizes a specific response from the server,
      use one of the many specific `normalizeResponse` hooks.
    - To customize how `JSONSerializer` normalizes your id, attributes or relationships,
      use the `extractId`, `extractAttributes` and `extractRelationships` hooks.

  The `JSONSerializer` normalization process follows these steps:

    1. `normalizeResponse`
        - entry method to the serializer.
    2. `normalizeCreateRecordResponse`
        - a `normalizeResponse` for a specific operation is called.
    3. `normalizeSingleResponse`|`normalizeArrayResponse`
        - for methods like `createRecord` we expect a single record back, while for methods like `findAll` we expect multiple records back.
    4. `normalize`
        - `normalizeArrayResponse` iterates and calls `normalize` for each of its records while `normalizeSingle`
          calls it once. This is the method you most likely want to subclass.
    5. `extractId` | `extractAttributes` | `extractRelationships`
        - `normalize` delegates to these methods to
          turn the record payload into the JSON API format.

  @class JSONSerializer
  @public
*/
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const JSONSerializer: any = Serializer.extend({
  /**
    The `primaryKey` is used when serializing and deserializing
    data. Ember Data always uses the `id` property to store the id of
    the record. The external source may not always follow this
    convention. In these cases it is useful to override the
    `primaryKey` property to match the `primaryKey` of your external
    store.

    Example

    ```js [app/serializers/application.js]
    import { JSONSerializer } from '@warp-drive/legacy/serializer/json';

    export default class ApplicationSerializer extends JSONSerializer {
      primaryKey = '_id'
    }
    ```

    @property primaryKey
    @type {String}
    @public
    @default 'id'
  */
  primaryKey: 'id',

  /**
    The `attrs` object can be used to declare a simple mapping between
    property names on `Model` records and payload keys in the
    serialized JSON object representing the record. An object with the
    property `key` can also be used to designate the attribute's key on
    the response payload.

    Example

    ```js [app/models/person.js]
    import Model, { attr } from '@ember-data/model';

    export default class PersonModel extends Model {
      @attr('string') firstName;
      @attr('string') lastName;
      @attr('string') occupation;
      @attr('boolean') admin;
    }
    ```

    ```js [app/serializers/person.js]
    import { JSONSerializer } from '@warp-drive/legacy/serializer/json';

    export default class PersonSerializer extends JSONSerializer {
      attrs = {
        admin: 'is_admin',
        occupation: { key: 'career' }
      }
    }
    ```

    You can also remove attributes and relationships by setting the `serialize`
    key to `false` in your mapping object.

    Example

    ```js [app/serializers/person.js]
    import { JSONSerializer } from '@warp-drive/legacy/serializer/json';

    export default class PostSerializer extends JSONSerializer {
      attrs = {
        admin: { serialize: false },
        occupation: { key: 'career' }
      }
    }
    ```

    When serialized:

    ```javascript
    {
      "firstName": "Harry",
      "lastName": "Houdini",
      "career": "magician"
    }
    ```

    Note that the `admin` is now not included in the payload.

    Setting `serialize` to `true` enforces serialization for hasMany
    relationships even if it's neither a many-to-many nor many-to-none
    relationship.

    @property attrs
    @public
    @type {Object}
  */
  mergedProperties: ['attrs'],

  /**
   Given a subclass of `Model` and a JSON object this method will
   iterate through each attribute of the `Model` and invoke the
   `Transform#deserialize` method on the matching property of the
   JSON object.  This method is typically called after the
   serializer's `normalize` method.

   @private
  */
  applyTransforms(typeClass: ModelSchema, data: object): object {
    const attributes = typeClass.attributes;

    typeClass.eachTransformedAttribute((key, type) => {
      if (data[key] === undefined) {
        return;
      }

      const transform = this.transformFor(type!);
      const transformMeta = attributes.get(key);
      data[key] = transform.deserialize(data[key], transformMeta!.options);
    });

    return data;
  },

  /**
    The `normalizeResponse` method is used to normalize a payload from the
    server to a JSON-API Document.

    http://jsonapi.org/format/#document-structure

    This method delegates to a more specific normalize method based on
    the `requestType`.

    To override this method with a custom one, make sure to call
    `return super.normalizeResponse(store, primaryModelClass, payload, id, requestType)` with your
    pre-processed data.

    Here's an example of using `normalizeResponse` manually:

    ```javascript
    socket.on('message', function(message) {
      let data = message.data;
      let modelClass = store.modelFor(data.modelName);
      let serializer = store.serializerFor(data.modelName);
      let normalized = serializer.normalizeSingleResponse(store, modelClass, data, data.id);

      store.push(normalized);
    });
    ```

    @since 1.13.0
    @public
  */
  normalizeResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: unknown,
    id: string | null,
    requestType: string
    // @ts-expect-error
  ): object {
    switch (requestType) {
      case 'findRecord':
        // @ts-expect-error
        return this.normalizeFindRecordResponse(...arguments);
      case 'queryRecord':
        // @ts-expect-error
        return this.normalizeQueryRecordResponse(...arguments);
      case 'findAll':
        // @ts-expect-error
        return this.normalizeFindAllResponse(...arguments);
      case 'findBelongsTo':
        // @ts-expect-error
        return this.normalizeFindBelongsToResponse(...arguments);
      case 'findHasMany':
        // @ts-expect-error
        return this.normalizeFindHasManyResponse(...arguments);
      case 'findMany':
        // @ts-expect-error
        return this.normalizeFindManyResponse(...arguments);
      case 'query':
        // @ts-expect-error
        return this.normalizeQueryResponse(...arguments);
      case 'createRecord':
        // @ts-expect-error
        return this.normalizeCreateRecordResponse(...arguments);
      case 'deleteRecord':
        // @ts-expect-error
        return this.normalizeDeleteRecordResponse(...arguments);
      case 'updateRecord':
        // @ts-expect-error
        return this.normalizeUpdateRecordResponse(...arguments);
    }
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `findRecord`

    @since 1.13.0
    @public
  */
  normalizeFindRecordResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: unknown,
    id: string,
    requestType: string
  ): object {
    // @ts-expect-error
    return this.normalizeSingleResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `queryRecord`

    @since 1.13.0
    @public
  */
  normalizeQueryRecordResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: unknown,
    id: null,
    requestType: string
  ): object {
    // @ts-expect-error
    return this.normalizeSingleResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `findAll`

    @since 1.13.0
    @public
  */
  normalizeFindAllResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: unknown,
    id: null,
    requestType: string
  ): object {
    // @ts-expect-error
    return this.normalizeArrayResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `findBelongsTo`

    @since 1.13.0
    @public
  */
  normalizeFindBelongsToResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: unknown,
    id: null,
    requestType: string
  ): object {
    // @ts-expect-error
    return this.normalizeSingleResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `findHasMany`

    @since 1.13.0
    @public
  */
  normalizeFindHasManyResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: unknown,
    id: null,
    requestType: string
  ): object {
    // @ts-expect-error
    return this.normalizeArrayResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `findMany`

    @since 1.13.0
    @public
  */
  normalizeFindManyResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: unknown,
    id: null,
    requestType: string
  ): object {
    // @ts-expect-error
    return this.normalizeArrayResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `query`

    @since 1.13.0
    @public
  */
  normalizeQueryResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: unknown,
    id: null,
    requestType: string
  ): object {
    // @ts-expect-error
    return this.normalizeArrayResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `createRecord`

    @since 1.13.0
    @public
  */
  normalizeCreateRecordResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: unknown,
    id: string,
    requestType: string
  ): object {
    // @ts-expect-error
    return this.normalizeSaveResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `deleteRecord`

    @since 1.13.0
    @public
  */
  normalizeDeleteRecordResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: object,
    id: string | null,
    requestType: string
  ): object {
    // @ts-expect-error
    return this.normalizeSaveResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `updateRecord`

    @since 1.13.0
    @public
  */
  normalizeUpdateRecordResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: object,
    id: string | null,
    requestType: string
  ): object {
    // @ts-expect-error
    return this.normalizeSaveResponse(...arguments);
  },

  /**
    normalizeUpdateRecordResponse, normalizeCreateRecordResponse and
    normalizeDeleteRecordResponse delegate to this method by default.

    @since 1.13.0
    @public
  */
  normalizeSaveResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: object,
    id: string | null,
    requestType: string
  ): object {
    // @ts-expect-error
    return this.normalizeSingleResponse(...arguments);
  },

  /**
    normalizeQueryResponse and normalizeFindRecordResponse delegate to this
    method by default.

    @since 1.13.0
    @public
  */
  normalizeSingleResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: object,
    id: string | null,
    requestType: string
  ): object {
    return this._normalizeResponse(store, primaryModelClass, payload, id, requestType, true);
  },

  /**
    normalizeQueryResponse, normalizeFindManyResponse, and normalizeFindHasManyResponse delegate
    to this method by default.

    @since 1.13.0
    @public
  */
  normalizeArrayResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: object,
    id: string | null,
    requestType: string
  ): object {
    return this._normalizeResponse(store, primaryModelClass, payload, id, requestType, false);
  },

  /**
    @private
  */
  _normalizeResponse(
    store: Store,
    primaryModelClass: ModelSchema,
    payload: object,
    id: string | null,
    requestType: string,
    isSingle: boolean
  ): object {
    const documentHash = {
      data: null,
      included: [],
    };

    const meta = this.extractMeta(store, primaryModelClass, payload);
    if (meta) {
      assert(
        'The `meta` returned from `extractMeta` has to be an object, not "' + typeof meta + '".',
        typeof meta === 'object'
      );
      // @ts-expect-error untyped
      documentHash.meta = meta;
    }

    if (isSingle) {
      // @ts-expect-error untyped
      const { data, included } = this.normalize(primaryModelClass, payload);
      documentHash.data = data;
      if (included) {
        documentHash.included = included;
      }
    } else {
      // @ts-expect-error untyped
      const ret = new Array(payload.length);
      // @ts-expect-error untyped
      for (let i = 0, l = payload.length; i < l; i++) {
        const item = payload[i];
        // @ts-expect-error untyped
        const { data, included } = this.normalize(primaryModelClass, item);
        if (included) {
          documentHash.included = documentHash.included.concat(included);
        }
        ret[i] = data;
      }

      // @ts-expect-error untyped
      documentHash.data = ret;
    }

    return documentHash;
  },

  /**
    Normalizes a part of the JSON payload returned by
    the server. You should override this method, munge the hash
    and call super if you have generic normalization to do.

    It takes the type of the record that is being normalized
    (as a Model class), the property where the hash was
    originally found, and the hash to normalize.

    You can use this method, for example, to normalize underscored keys to camelized
    or other general-purpose normalizations.

    Example

    ```js [app/serializers/application.js]
    import { JSONSerializer } from '@warp-drive/legacy/serializer/json';
    import { underscore } from '<app-name>/utils/string-utils';
    import { get } from '@ember/object';

    export default class ApplicationSerializer extends JSONSerializer {
      normalize(typeClass, hash) {
        let fields = typeClass.fields;

        fields.forEach(function(type, field) {
          let payloadField = underscore(field);
          if (field === payloadField) { return; }

          hash[field] = hash[payloadField];
          delete hash[payloadField];
        });

        return super.normalize(...arguments);
      }
    }
    ```

    @public
    @param {Model} typeClass
    @param {Object} hash
    @return {Object}
  */
  normalize(modelClass: ModelSchema, resourceHash: object): object {
    let data = null;

    if (resourceHash) {
      this.normalizeUsingDeclaredMapping(modelClass, resourceHash);
      // @ts-expect-error untyped
      if (typeof resourceHash.links === 'object') {
        // @ts-expect-error untyped
        this.normalizeUsingDeclaredMapping(modelClass, resourceHash.links);
      }

      // @ts-expect-error untyped
      data = {
        id: this.extractId(modelClass, resourceHash),
        type: modelClass.modelName,
        attributes: this.extractAttributes(modelClass, resourceHash),
        relationships: this.extractRelationships(modelClass, resourceHash),
      };

      // @ts-expect-error untyped
      if (resourceHash.lid) {
        // @ts-expect-error untyped
        data.lid = resourceHash.lid;
      }

      // @ts-expect-error untyped
      this.applyTransforms(modelClass, data.attributes);
    }

    return { data };
  },

  /**
    Returns the resource's ID.

    @public
  */
  extractId(modelClass: ModelSchema, resourceHash: object): string {
    const primaryKey = this.primaryKey;
    const id = resourceHash[primaryKey];
    return coerceId(id) as string;
  },

  /**
    Returns the resource's attributes formatted as a JSON-API "attributes object".

    http://jsonapi.org/format/#document-resource-object-attributes

    @public
    @param {Object} modelClass
    @param {Object} resourceHash
    @return {Object}
  */
  extractAttributes(modelClass: ModelSchema, resourceHash: object): object {
    let attributeKey;
    const attributes = {};

    modelClass.eachAttribute((key) => {
      attributeKey = this.keyForAttribute(key, 'deserialize');
      if (resourceHash[attributeKey] !== undefined) {
        attributes[key] = resourceHash[attributeKey];
      }
    });

    return attributes;
  },

  /**
    Returns a relationship formatted as a JSON-API "relationship object".

    http://jsonapi.org/format/#document-resource-object-relationships

    @public
  */
  extractRelationship(relationshipModelName: string, relationshipHash: object): object | null {
    if (!relationshipHash) {
      return null;
    }
    /*
      When `relationshipHash` is an object it usually means that the relationship
      is polymorphic. It could however also be embedded resources that the
      EmbeddedRecordsMixin has be able to process.
    */
    if (relationshipHash && typeof relationshipHash === 'object' && !Array.isArray(relationshipHash)) {
      // @ts-expect-error untyped
      if (relationshipHash.id) {
        // @ts-expect-error untyped
        relationshipHash.id = coerceId(relationshipHash.id);
      }

      // @ts-expect-error store is dynamically injected
      const modelClass = this.store.modelFor(relationshipModelName);
      // @ts-expect-error untyped
      if (relationshipHash.type && !modelClass.fields.has('type')) {
        // @ts-expect-error untyped
        relationshipHash.type = this.modelNameFromPayloadKey(relationshipHash.type);
      }

      return relationshipHash;
    }
    return {
      id: coerceId(relationshipHash as unknown as string | number | null),
      type: dasherize(singularize(relationshipModelName)),
    };
  },

  /**
    Returns a polymorphic relationship formatted as a JSON-API "relationship object".

    http://jsonapi.org/format/#document-resource-object-relationships

    `relationshipOptions` is a hash which contains more information about the
    polymorphic relationship which should be extracted:
      - `resourceHash` complete hash of the resource the relationship should be
        extracted from
      - `relationshipKey` key under which the value for the relationship is
        extracted from the resourceHash
      - `relationshipMeta` meta information about the relationship

    @public
  */
  extractPolymorphicRelationship(
    relationshipModelName: string,
    relationshipHash: object,
    relationshipOptions?: object
  ): object | null {
    return this.extractRelationship(relationshipModelName, relationshipHash);
  },

  /**
    Returns the resource's relationships formatted as a JSON-API "relationships object".

    http://jsonapi.org/format/#document-resource-object-relationships

    @public
  */
  extractRelationships(modelClass: ModelSchema, resourceHash: object): object {
    const relationships = {};

    modelClass.eachRelationship((key, relationshipMeta) => {
      let relationship = null;
      const relationshipKey = this.keyForRelationship(key, relationshipMeta.kind, 'deserialize');
      if (resourceHash[relationshipKey] !== undefined) {
        let data = null;
        const relationshipHash = resourceHash[relationshipKey];
        if (relationshipMeta.kind === 'belongsTo') {
          if (relationshipMeta.options.polymorphic) {
            // extracting a polymorphic belongsTo may need more information
            // than the type and the hash (which might only be an id) for the
            // relationship, hence we pass the key, resource and
            // relationshipMeta too
            // @ts-expect-error untyped
            data = this.extractPolymorphicRelationship(relationshipMeta.type, relationshipHash, {
              key,
              resourceHash,
              relationshipMeta,
            });
          } else {
            // @ts-expect-error untyped
            data = this.extractRelationship(relationshipMeta.type, relationshipHash);
          }
        } else if (relationshipMeta.kind === 'hasMany') {
          if (relationshipHash) {
            // @ts-expect-error untyped
            data = new Array(relationshipHash.length);
            if (relationshipMeta.options.polymorphic) {
              for (let i = 0, l = relationshipHash.length; i < l; i++) {
                const item = relationshipHash[i];
                // @ts-expect-error untyped
                data[i] = this.extractPolymorphicRelationship(relationshipMeta.type, item, {
                  key,
                  resourceHash,
                  relationshipMeta,
                });
              }
            } else {
              for (let i = 0, l = relationshipHash.length; i < l; i++) {
                const item = relationshipHash[i];
                // @ts-expect-error untyped
                data[i] = this.extractRelationship(relationshipMeta.type, item);
              }
            }
          }
        }
        // @ts-expect-error untyped
        relationship = { data };
      }

      const linkKey = this.keyForLink(key, relationshipMeta.kind);
      // @ts-expect-error untyped
      if (resourceHash.links && resourceHash.links[linkKey] !== undefined) {
        // @ts-expect-error untyped
        const related = resourceHash.links[linkKey];
        // @ts-expect-error untyped
        relationship = relationship || {};
        // @ts-expect-error untyped
        relationship.links = { related };
      }

      if (relationship) {
        relationships[key] = relationship;
      }
    });

    return relationships;
  },

  /**
    Dasherizes the model name in the payload

    @public
    @param {String} key
    @return {String} the model's modelName
  */
  modelNameFromPayloadKey(key: string): string {
    return dasherize(singularize(key));
  },

  /**
    @private
  */
  normalizeRelationships(typeClass: ModelSchema, hash: object): void {
    let payloadKey;

    if (this.keyForRelationship) {
      typeClass.eachRelationship((key, relationship) => {
        payloadKey = this.keyForRelationship(key, relationship.kind, 'deserialize');
        if (key === payloadKey) {
          return;
        }
        if (hash[payloadKey] === undefined) {
          return;
        }

        hash[key] = hash[payloadKey];
        delete hash[payloadKey];
      });
    }
  },

  /**
    @private
  */
  normalizeUsingDeclaredMapping(modelClass: ModelSchema, hash: object): void {
    // @ts-expect-error attrs is dynamically injected
    const attrs = this.attrs;
    let normalizedKey;
    let payloadKey;

    if (attrs) {
      for (const key in attrs) {
        normalizedKey = payloadKey = this._getMappedKey(key, modelClass);

        if (hash[payloadKey] === undefined) {
          continue;
        }

        if (modelClass.attributes.has(key)) {
          normalizedKey = this.keyForAttribute(key, 'deserialize');
        }

        if (modelClass.relationshipsByName.has(key)) {
          normalizedKey = this.keyForRelationship(key, modelClass, 'deserialize');
        }

        if (payloadKey !== normalizedKey) {
          hash[normalizedKey] = hash[payloadKey];
          delete hash[payloadKey];
        }
      }
    }
  },

  /**
    Looks up the property key that was set by the custom `attr` mapping
    passed to the serializer.

    @private
  */
  _getMappedKey(key: string, modelClass: ModelSchema): string {
    warn(
      'There is no attribute or relationship with the name `' +
        key +
        '` on `' +
        modelClass.modelName +
        '`. Check your serializers attrs hash.',
      modelClass.attributes.has(key) || modelClass.relationshipsByName.has(key),
      {
        id: 'ds.serializer.no-mapped-attrs-key',
      }
    );
    // @ts-expect-error attrs is dynamically injected
    const attrs = this.attrs;
    let mappedKey;
    if (attrs && attrs[key]) {
      mappedKey = attrs[key];
      //We need to account for both the { title: 'post_title' } and
      //{ title: { key: 'post_title' }} forms
      if (mappedKey.key) {
        mappedKey = mappedKey.key;
      }
      if (typeof mappedKey === 'string') {
        key = mappedKey;
      }
    }

    return key;
  },

  /**
    Check attrs.key.serialize property to inform if the `key`
    can be serialized

    @private
    @return true if the key can be serialized
  */
  _canSerialize(key: string): boolean {
    // @ts-expect-error no idea what attrs is here
    const attrs = this.attrs;

    return !attrs || !attrs[key] || attrs[key].serialize !== false;
  },

  /**
    When attrs.key.serialize is set to true then
    it takes priority over the other checks and the related
    attribute/relationship will be serialized

    @private
    @return true if the key must be serialized
  */
  _mustSerialize(key: string): boolean {
    // @ts-expect-error no idea what attrs is here
    const attrs = this.attrs;

    return attrs && attrs[key] && attrs[key].serialize === true;
  },

  /**
    Check if the given hasMany relationship should be serialized

    By default only many-to-many and many-to-none relationships are serialized.
    This could be configured per relationship by Serializer's `attrs` object.

    @public
    @return true if the hasMany relationship should be serialized
  */
  shouldSerializeHasMany(
    snapshot: Snapshot,
    key: string,
    relationship: LegacyBelongsToField | LegacyHasManyField
  ): boolean {
    // @ts-expect-error store is dynamically injected
    const schema = this.store.modelFor(snapshot.modelName);
    // @ts-expect-error store is dynamically injected
    const relationshipType = schema.determineRelationshipType(relationship, this.store);
    if (this._mustSerialize(key)) {
      return true;
    }
    return this._canSerialize(key) && (relationshipType === 'manyToNone' || relationshipType === 'manyToMany');
  },

  // SERIALIZE
  /**
    Called when a record is saved in order to convert the
    record into JSON.

    By default, it creates a JSON object with a key for
    each attribute and belongsTo relationship.

    For example, consider this model:

    ```js [app/models/comment.js]
    import Model, { attr, belongsTo } from '@ember-data/model';

    export default class CommentModel extends Model {
      @attr title;
      @attr body;

      @belongsTo('user') author;
    }
    ```

    The default serialization would create a JSON object like:

    ```javascript
    {
      "title": "Rails is unagi",
      "body": "Rails? Omakase? O_O",
      "author": 12
    }
    ```

    By default, attributes are passed through as-is, unless
    you specified an attribute type (`attr('date')`). If
    you specify a transform, the JavaScript value will be
    serialized when inserted into the JSON hash.

    By default, belongs-to relationships are converted into
    IDs when inserted into the JSON hash.

    ## IDs

    `serialize` takes an options hash with a single option:
    `includeId`. If this option is `true`, `serialize` will,
    by default include the ID in the JSON object it builds.

    The adapter passes in `includeId: true` when serializing
    a record for `createRecord`, but not for `updateRecord`.

    ## Customization

    Your server may expect a different JSON format than the
    built-in serialization format.

    In that case, you can implement `serialize` yourself and
    return a JSON hash of your choosing.

    ```js [app/serializers/post.js]
    import { JSONSerializer } from '@warp-drive/legacy/serializer/json';

    export default class PostSerializer extends JSONSerializer {
      serialize(snapshot, options) {
        let json = {
          POST_TTL: snapshot.attr('title'),
          POST_BDY: snapshot.attr('body'),
          POST_CMS: snapshot.hasMany('comments', { ids: true })
        };

        if (options.includeId) {
          json.POST_ID_ = snapshot.id;
        }

        return json;
      }
    }
    ```

    ## Customizing an App-Wide Serializer

    If you want to define a serializer for your entire
    application, you'll probably want to use `eachAttribute`
    and `eachRelationship` on the record.

    ```js [app/serializers/application.js]
    import { JSONSerializer } from '@warp-drive/legacy/serializer/json';
    import { singularize } from '<app-name>/utils/string-utils';

    export default class ApplicationSerializer extends JSONSerializer {
      serialize(snapshot, options) {
        let json = {};

        snapshot.eachAttribute((name) => {
          json[serverAttributeName(name)] = snapshot.attr(name);
        });

        snapshot.eachRelationship((name, relationship) => {
          if (relationship.kind === 'hasMany') {
            json[serverHasManyName(name)] = snapshot.hasMany(name, { ids: true });
          }
        });

        if (options.includeId) {
          json.ID_ = snapshot.id;
        }

        return json;
      }
    }

    function serverAttributeName(attribute) {
      return attribute.underscore().toUpperCase();
    }

    function serverHasManyName(name) {
      return serverAttributeName(singularize(name)) + "_IDS";
    }
    ```

    This serializer will generate JSON that looks like this:

    ```javascript
    {
      "TITLE": "Rails is omakase",
      "BODY": "Yep. Omakase.",
      "COMMENT_IDS": [ "1", "2", "3" ]
    }
    ```

    ## Tweaking the Default JSON

    If you just want to do some small tweaks on the default JSON,
    you can call `super.serialize` first and make the tweaks on
    the returned JSON.

    ```js [app/serializers/post.js]
    import { JSONSerializer } from '@warp-drive/legacy/serializer/json';

    export default class PostSerializer extends JSONSerializer {
      serialize(snapshot, options) {
        let json = super.serialize(...arguments);

        json.subject = json.title;
        delete json.title;

        return json;
      }
    }
    ```

    @public
  */
  serialize(snapshot: Snapshot, options: object): object {
    const json = {};

    // @ts-expect-error super loose typing here right now
    if (options && options.includeId) {
      const id = snapshot.id;
      if (id) {
        json[this.primaryKey] = id;
      }
    }

    snapshot.eachAttribute((key, attribute) => {
      this.serializeAttribute(snapshot, json, key, attribute);
    });

    snapshot.eachRelationship((key, relationship) => {
      if (relationship.kind === 'belongsTo') {
        this.serializeBelongsTo(snapshot, json, relationship);
      } else if (relationship.kind === 'hasMany') {
        this.serializeHasMany(snapshot, json, relationship);
      }
    });

    return json;
  },

  /**
    You can use this method to customize how a serialized record is added to the complete
    JSON hash to be sent to the server. By default the JSON Serializer does not namespace
    the payload and just sends the raw serialized JSON object.
    If your server expects namespaced keys, you should consider using the RESTSerializer.
    Otherwise you can override this method to customize how the record is added to the hash.
    The hash property should be modified by reference.

    For example, your server may expect underscored root objects.

    ```js [app/serializers/application.js]
    import RESTSerializer from '@ember-data/serializer/rest';
    import { underscoren} from '<app-name>/utils/string-utils';

    export default class ApplicationSerializer extends RESTSerializer {
      serializeIntoHash(data, type, snapshot, options) {
        let root = underscore(type.modelName);
        data[root] = this.serialize(snapshot, options);
      }
    }
    ```

    @public
  */
  serializeIntoHash(hash: object, typeClass: ModelSchema, snapshot: Snapshot, options: object): void {
    Object.assign(hash, this.serialize(snapshot, options));
  },

  /**
    `serializeAttribute` can be used to customize how `attr`
    properties are serialized

    For example if you wanted to ensure all your attributes were always
    serialized as properties on an `attributes` object you could
    write:

    ```js [app/serializers/application.js]
    import { JSONSerializer } from '@warp-drive/legacy/serializer/json';

    export default class ApplicationSerializer extends JSONSerializer {
      serializeAttribute(snapshot, json, key, attributes) {
        json.attributes = json.attributes || {};
        super.serializeAttribute(snapshot, json.attributes, key, attributes);
      }
    }
    ```

    @public
  */
  serializeAttribute(snapshot: Snapshot, json: object, key: string, attribute: LegacyAttributeField): void {
    if (this._canSerialize(key)) {
      const type = attribute.type;
      // @ts-expect-error we don't know what is on the snapshot
      let value = snapshot.attr(key);
      if (type) {
        const transform = this.transformFor(type);
        value = transform.serialize(value, attribute.options);
      }

      // if provided, use the mapping provided by `attrs` in
      // the serializer
      // @ts-expect-error store added dynamically
      const schema = this.store.modelFor(snapshot.modelName);
      let payloadKey = this._getMappedKey(key, schema);

      if (payloadKey === key && this.keyForAttribute) {
        payloadKey = this.keyForAttribute(key, 'serialize');
      }

      json[payloadKey] = value;
    }
  },

  /**
    `serializeBelongsTo` can be used to customize how `belongsTo`
    properties are serialized.

    Example

    ```js [app/serializers/post.js]
    import { JSONSerializer } from '@warp-drive/legacy/serializer/json';

    export default class PostSerializer extends JSONSerializer {
      serializeBelongsTo(snapshot, json, relationship) {
        let key = relationship.name;
        let belongsTo = snapshot.belongsTo(key);

        key = this.keyForRelationship ? this.keyForRelationship(key, "belongsTo", "serialize") : key;

        json[key] = !belongsTo ? null : belongsTo.record.toJSON();
      }
    }
    ```

    @public
  */
  serializeBelongsTo(snapshot: Snapshot, json: object, relationship: LegacyHasManyField | LegacyBelongsToField): void {
    const name = relationship.name;

    if (this._canSerialize(name)) {
      const belongsToId = snapshot.belongsTo(name, { id: true });

      // if provided, use the mapping provided by `attrs` in
      // the serializer
      // @ts-expect-error store added dynamically
      const schema = this.store.modelFor(snapshot.modelName);
      let payloadKey = this._getMappedKey(name, schema);
      if (payloadKey === name && this.keyForRelationship) {
        payloadKey = this.keyForRelationship(name, 'belongsTo', 'serialize');
      }

      //Need to check whether the id is there for new&async records
      if (!belongsToId) {
        json[payloadKey] = null;
      } else {
        json[payloadKey] = belongsToId;
      }

      if (relationship.options.polymorphic) {
        this.serializePolymorphicType(snapshot, json, relationship);
      }
    }
  },

  /**
   `serializeHasMany` can be used to customize how `hasMany`
   properties are serialized.

   Example

   ```js [app/serializers/post.js]
   import { JSONSerializer } from '@warp-drive/legacy/serializer/json';

   export default class PostSerializer extends JSONSerializer {
     serializeHasMany(snapshot, json, relationship) {
       let key = relationship.name;
       if (key === 'comments') {
         return;
       } else {
         super.serializeHasMany(...arguments);
       }
     }
   }
   ```

    @public
  */
  serializeHasMany(snapshot: Snapshot, json: object, relationship: LegacyBelongsToField | LegacyHasManyField): void {
    const name = relationship.name;

    if (this.shouldSerializeHasMany(snapshot, name, relationship)) {
      const hasMany = snapshot.hasMany(name, { ids: true });
      if (hasMany !== undefined) {
        // if provided, use the mapping provided by `attrs` in
        // the serializer
        // @ts-expect-error store added dynamically
        const schema = this.store.modelFor(snapshot.modelName);
        let payloadKey = this._getMappedKey(name, schema);
        if (payloadKey === name && this.keyForRelationship) {
          payloadKey = this.keyForRelationship(name, 'hasMany', 'serialize');
        }

        json[payloadKey] = hasMany;
        // TODO support for polymorphic manyToNone and manyToMany relationships
      }
    }
  },

  /**
    You can use this method to customize how polymorphic objects are
    serialized. Objects are considered to be polymorphic if
    `{ polymorphic: true }` is pass as the second argument to the
    `belongsTo` function.

    Example

    ```js [app/serializers/comment.js]
    import { JSONSerializer } from '@warp-drive/legacy/serializer/json';

    export default class CommentSerializer extends JSONSerializer {
      serializePolymorphicType(snapshot, json, relationship) {
        let key = relationship.name;
        let belongsTo = snapshot.belongsTo(key);

        key = this.keyForAttribute ? this.keyForAttribute(key, 'serialize') : key;

        if (!belongsTo) {
          json[key + '_type'] = null;
        } else {
          json[key + '_type'] = belongsTo.modelName;
        }
      }
    }
    ```

    @public
  */
  serializePolymorphicType(
    snapshot: Snapshot,
    json: object,
    relationship: LegacyBelongsToField | LegacyHasManyField
  ): void {},

  /**
    `extractMeta` is used to deserialize any meta information in the
    adapter payload. By default Ember Data expects meta information to
    be located on the `meta` property of the payload object.

    Example

    ```js [app/serializers/post.js]
    import { JSONSerializer } from '@warp-drive/legacy/serializer/json';

    export default class PostSerializer extends JSONSerializer {
      extractMeta(store, typeClass, payload) {
        if (payload && payload.hasOwnProperty('_pagination')) {
          let meta = payload._pagination;
          delete payload._pagination;
          return meta;
        }
      }
    }
    ```

    @public
  */
  extractMeta(store: Store, modelClass: ModelSchema, payload: object): object | undefined {
    if (payload && payload['meta'] !== undefined) {
      // @ts-expect-error
      const meta = payload.meta;
      // @ts-expect-error
      delete payload.meta;
      return meta;
    }
  },

  /**
    `extractErrors` is used to extract model errors when a call
    to `Model#save` fails with an `InvalidError`. By default
    Ember Data expects error information to be located on the `errors`
    property of the payload object.

    This serializer expects this `errors` object to be an Array similar
    to the following, compliant with the https://jsonapi.org/format/#errors specification:

    ```js
    {
      "errors": [
        {
          "detail": "This username is already taken!",
          "source": {
            "pointer": "data/attributes/username"
          }
        }, {
          "detail": "Doesn't look like a valid email.",
          "source": {
            "pointer": "data/attributes/email"
          }
        }
      ]
    }
    ```

    The key `detail` provides a textual description of the problem.
    Alternatively, the key `title` can be used for the same purpose.

    The nested keys `source.pointer` detail which specific element
    of the request data was invalid.

    Note that JSON-API also allows for object-level errors to be placed
    in an object with pointer `data`, signifying that the problem
    cannot be traced to a specific attribute:

    ```javascript
    {
      "errors": [
        {
          "detail": "Some generic non property error message",
          "source": {
            "pointer": "data"
          }
        }
      ]
    }
    ```

    When turn into a `Errors` object, you can read these errors
    through the property `base`:

    ```handlebars
    {{#each @model.errors.base as |error|}}
      <div class="error">
        {{error.message}}
      </div>
    {{/each}}
    ```

    Example of alternative implementation, overriding the default
    behavior to deal with a different format of errors:

    ```js [app/serializers/post.js]
    import { JSONSerializer } from '@warp-drive/legacy/serializer/json';

    export default class PostSerializer extends JSONSerializer {
      extractErrors(store, typeClass, payload, id) {
        if (payload && typeof payload === 'object' && payload._problems) {
          payload = payload._problems;
          this.normalizeErrors(typeClass, payload);
        }
        return payload;
      }
    }
    ```

    @public
    @param {Store} store
    @param {Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @return {Object} json The deserialized errors
  */
  extractErrors(store: Store, typeClass: ModelSchema, payload: object, id: string | null): object {
    // @ts-expect-error
    if (payload && typeof payload === 'object' && payload.errors) {
      // the default assumption is that errors is already in JSON:API format
      const extracted = {};

      // @ts-expect-error
      payload.errors.forEach((error) => {
        if (error.source && error.source.pointer) {
          let key = error.source.pointer.match(SOURCE_POINTER_REGEXP);

          if (key) {
            key = key[2];
          } else if (error.source.pointer.search(SOURCE_POINTER_PRIMARY_REGEXP) !== -1) {
            key = PRIMARY_ATTRIBUTE_KEY;
          }

          if (key) {
            extracted[key] = extracted[key] || [];
            extracted[key].push(error.detail || error.title);
          }
        }
      });

      // if the user has an attrs hash, convert keys using it
      this.normalizeUsingDeclaredMapping(typeClass, extracted);

      // for each attr and relationship, make sure that we use
      // the normalized key
      typeClass.eachAttribute((name) => {
        const key = this.keyForAttribute(name, 'deserialize');
        if (key !== name && extracted[key] !== undefined) {
          extracted[name] = extracted[key];
          delete extracted[key];
        }
      });

      typeClass.eachRelationship((name) => {
        const key = this.keyForRelationship(name, 'deserialize');
        if (key !== name && extracted[key] !== undefined) {
          extracted[name] = extracted[key];
          delete extracted[key];
        }
      });

      return extracted;
    }

    return payload;
  },

  /**
    `keyForAttribute` can be used to define rules for how to convert an
    attribute name in your model to a key in your JSON.

    Example

    ```js [app/serializers/application.js]
    import { JSONSerializer } from '@warp-drive/legacy/serializer/json';
    import { underscore } from '<app-name>/utils/string-utils';

    export default class ApplicationSerializer extends JSONSerializer {
      keyForAttribute(attr, method) {
        return underscore(attr).toUpperCase();
      }
    }
    ```

    @public
  */
  keyForAttribute(key: string, method: string): string {
    return key;
  },

  /**
    `keyForRelationship` can be used to define a custom key when
    serializing and deserializing relationship properties. By default
    `JSONSerializer` does not provide an implementation of this method.

    Example

      ```js [app/serializers/post.js]
      import { JSONSerializer } from '@warp-drive/legacy/serializer/json';
      import { underscore } from '<app-name>/utils/string-utils';

      export default class PostSerializer extends JSONSerializer {
        keyForRelationship(key, relationship, method) {
          return `rel_${underscore(key)}`;
        }
      }
      ```

    @public
  */
  keyForRelationship(key: string, typeClass: ModelSchema | string, method?: string): string {
    return key;
  },

  /**
   `keyForLink` can be used to define a custom key when deserializing link
   properties.

    @public
  */
  keyForLink(key: string, kind: 'belongsTo' | 'hasMany'): string {
    return key;
  },

  // HELPERS

  /**
   @private
  */
  transformFor(attributeType: string, skipAssertion?: boolean): Transform {
    const transform = getOwner(this)!.lookup(`transform:${attributeType}`) as Transform | undefined;

    assert(`Unable to find the transform for \`attr('${attributeType}')\``, skipAssertion || !!transform);

    return transform!;
  },
});

export { JSONSerializer };
