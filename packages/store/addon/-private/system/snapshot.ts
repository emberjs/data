/**
  @module @ember-data/store
*/
import { assert } from '@ember/debug';

import { importSync } from '@embroider/macros';

import { HAS_RECORD_DATA_PACKAGE } from '@ember-data/private-build-infra';
import type BelongsToRelationship from '@ember-data/record-data/addon/-private/relationships/state/belongs-to';
import type {
  ExistingResourceIdentifierObject,
  NewResourceIdentifierObject,
} from '@ember-data/store/-private/ts-interfaces/ember-data-json-api';
import type { DefaultRegistry, ResolvedRegistry } from '@ember-data/types';
import type {
  AttributeFieldsFor,
  AttributesFor,
  BelongsToRelationshipFieldsFor,
  HasManyRelationshipFieldsFor,
  RecordField,
  RecordInstance,
  RecordType,
  RelatedType,
  RelationshipFieldsFor,
} from '@ember-data/types/utils';

import type { DSModelSchema, ModelSchema } from '../ts-interfaces/ds-model';
import type { StableRecordIdentifier } from '../ts-interfaces/identifier';
import { OptionsHash } from '../ts-interfaces/minimum-serializer-interface';
import type { ChangedAttributesHash } from '../ts-interfaces/record-data';
import type { AttributeSchema, RelationshipSchema } from '../ts-interfaces/record-data-schemas';
import type { FindOptions } from '../ts-interfaces/store';
import type { Dict } from '../ts-interfaces/utils';
import type InternalModel from './model/internal-model';
import recordDataFor from './record-data-for';
import type Store from './store';

type RecordId = string | null;

function schemaIsDSModel<R extends ResolvedRegistry, T extends RecordType<R>>(
  schema: ModelSchema<R, T> | DSModelSchema<R, T>
): schema is DSModelSchema<R, T> {
  return (schema as DSModelSchema<R, T>).isModel === true;
}

type MappedBelongsToRecord<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RecordField<R, T> = BelongsToRelationshipFieldsFor<R, T>
> = {
  [L in F]: Snapshot<R, RelatedType<R, T, L>>;
};
type MappedHasManyRecord<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RecordField<R, T> = HasManyRelationshipFieldsFor<R, T>
> = {
  [L in F]: Snapshot<R, RelatedType<R, T, L>>[];
};
type MappedBelongsToIds<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RecordField<R, T> = BelongsToRelationshipFieldsFor<R, T>
> = {
  [L in F]: RecordId;
};
type MappedHasManyIds<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RecordField<R, T> = HasManyRelationshipFieldsFor<R, T>
> = {
  [L in F]: RecordId[];
};

/**
  Snapshot is not directly instantiable.
  Instances are provided to a consuming application's
  adapters and serializers for certain requests.

  @class Snapshot
  @public
*/
export default class Snapshot<R extends ResolvedRegistry = DefaultRegistry, T extends RecordType<R> = RecordType<R>>
  implements Snapshot<R, T>
{
  private __attributes: AttributesFor<R, T> | null = null;
  private _belongsToRelationships: MappedBelongsToRecord<R, T> = Object.create(null);
  private _belongsToIds: MappedBelongsToIds<R, T> = Object.create(null);
  private _hasManyRelationships: MappedHasManyRecord<R, T> = Object.create(null);
  private _hasManyIds: MappedHasManyIds<R, T> = Object.create(null);
  declare _internalModel: InternalModel<R, T>;
  declare _changedAttributes: ChangedAttributesHash<R, T>;

  declare identifier: StableRecordIdentifier<T>;
  declare modelName: T;
  declare id: string | null;
  declare include?: unknown;
  declare adapterOptions?: Dict<unknown>;

  /**
   * @method constructor
   * @constructor
   * @private
   * @param options
   * @param identifier
   * @param _store
   */
  constructor(options: FindOptions, identifier: StableRecordIdentifier<T>, private _store: Store<R>) {
    let internalModel = (this._internalModel = _store._internalModelForResource(identifier));
    this.modelName = identifier.type;

    /**
      The unique RecordIdentifier associated with this Snapshot.

      @property identifier
      @public
      @type {StableRecordIdentifier}
    */
    this.identifier = identifier;

    /*
      If the internalModel does not yet have a record, then we are
      likely a snapshot being provided to a find request, so we
      populate __attributes lazily. Else, to preserve the "moment
      in time" in which a snapshot is created, we greedily grab
      the values.
     */
    if (internalModel.hasRecord) {
      this._attributes;
    }

    /**
     The id of the snapshot's underlying record

     Example

     ```javascript
     // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
     postSnapshot.id; // => '1'
     ```

     @property id
     @type {String}
     @public
     */
    this.id = identifier.id;

    /**
     A hash of adapter options
     @property adapterOptions
     @type {Object}
     @public
     */
    this.adapterOptions = options.adapterOptions;

    /**
     If `include` was passed to the options hash for the request, the value
     would be available here.

     @property include
     @type {String|Array}
     @public
     */
    this.include = options.include;

    /**
     The name of the type of the underlying record for this snapshot, as a string.

     @property modelName
     @type {String}
     @public
     */
    this.modelName = internalModel.modelName;
    if (internalModel.hasRecord) {
      this._changedAttributes = recordDataFor(internalModel).changedAttributes();
    }
  }

  /**
   The underlying record for this snapshot. Can be used to access methods and
   properties defined on the record.

   Example

   ```javascript
   let json = snapshot.record.toJSON();
   ```

   @property record
   @type {Model}
   @public
   */
  get record(): RecordInstance<R, T> {
    return this._internalModel.getRecord();
  }

  get _attributes(): AttributesFor<R, T> {
    if (this.__attributes !== null) {
      return this.__attributes;
    }
    let record = this.record;
    let attributes = (this.__attributes = Object.create(null));
    let attrs = Object.keys(this._store._attributesDefinitionFor(this.identifier)) as RecordField<R, T>[];
    attrs.forEach(<K extends RecordField<R, T>>(keyName: K) => {
      if (schemaIsDSModel(this.type)) {
        // if the schema is for a DSModel then the instance is too
        attributes[keyName] = record[keyName];
      } else {
        attributes[keyName] = recordDataFor(this._internalModel).getAttr(keyName);
      }
    });

    return attributes;
  }

  /**
   The type of the underlying record for this snapshot, as a Model.

   @property type
    @public
   @type {Model}
   */
  get type(): ModelSchema<R, T> {
    return this._internalModel.modelClass;
  }

  get isNew(): boolean {
    return this._internalModel.isNew();
  }

  /**
   Returns the value of an attribute.

   Example

   ```javascript
   // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
   postSnapshot.attr('author'); // => 'Tomster'
   postSnapshot.attr('title'); // => 'Ember.js rocks'
   ```

   Note: Values are loaded eagerly and cached when the snapshot is created.

   @method attr
   @param {String} keyName
   @return {Object} The attribute value or undefined
   @public
   */
  attr<F extends AttributeFieldsFor<R, T>>(keyName: F): RecordInstance<R, T>[F] {
    if (keyName in this._attributes) {
      return this._attributes[keyName];
    }
    assert(`Model '${this.identifier}' has no attribute named '${keyName}' defined.`, false);
  }

  /**
   Returns all attributes and their corresponding values.

   Example

   ```javascript
   // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
   postSnapshot.attributes(); // => { author: 'Tomster', title: 'Ember.js rocks' }
   ```

   @method attributes
   @return {Object} All attributes of the current snapshot
   @public
   */
  attributes(): AttributesFor<R, T> {
    return { ...this._attributes };
  }

  /**
   Returns all changed attributes and their old and new values.

   Example

   ```javascript
   // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
   postModel.set('title', 'Ember.js rocks!');
   postSnapshot.changedAttributes(); // => { title: ['Ember.js rocks', 'Ember.js rocks!'] }
   ```

   @method changedAttributes
   @return {Object} All changed attributes of the current snapshot
   @public
   */
  changedAttributes(): ChangedAttributesHash<R, T> {
    let changedAttributes = Object.create(null);
    if (!this._changedAttributes) {
      return changedAttributes;
    }

    let changedAttributeKeys = Object.keys(this._changedAttributes);

    for (let i = 0, length = changedAttributeKeys.length; i < length; i++) {
      let key = changedAttributeKeys[i];
      changedAttributes[key] = this._changedAttributes[key].slice();
    }

    return changedAttributes;
  }

  /**
   Returns the current value of a belongsTo relationship.

   `belongsTo` takes an optional hash of options as a second parameter,
   currently supported options are:

   - `id`: set to `true` if you only want the ID of the related record to be
   returned.

   Example

   ```javascript
   // store.push('post', { id: 1, title: 'Hello World' });
   // store.createRecord('comment', { body: 'Lorem ipsum', post: post });
   commentSnapshot.belongsTo('post'); // => Snapshot
   commentSnapshot.belongsTo('post', { id: true }); // => '1'

   // store.push('comment', { id: 1, body: 'Lorem ipsum' });
   commentSnapshot.belongsTo('post'); // => undefined
   ```

   Calling `belongsTo` will return a new Snapshot as long as there's any known
   data for the relationship available, such as an ID. If the relationship is
   known but unset, `belongsTo` will return `null`. If the contents of the
   relationship is unknown `belongsTo` will return `undefined`.

   Note: Relationships are loaded lazily and cached upon first access.

   @method belongsTo
   @param {String} keyName
   @param {Object} [options]
   @public
   @return {(Snapshot|String|null|undefined)} A snapshot or ID of a known
   relationship or null if the relationship is known but unset. undefined
   will be returned if the contents of the relationship is unknown.
   */
  belongsTo<F extends BelongsToRelationshipFieldsFor<R, T>>(
    keyName: F,
    options?: { id?: boolean }
  ): Snapshot<R, RelatedType<R, T, F>> | RecordId | undefined {
    // this approach (vs a generic) avoids a sub-type issue
    type RT = RelatedType<R, T, F>;
    let returnModeIsId = !!(options && options.id);
    let inverseInternalModel: InternalModel<R, RT> | null;
    let result: Snapshot<R, RT> | RecordId | undefined;
    let store = this._internalModel.store;

    if (returnModeIsId === true && keyName in this._belongsToIds) {
      return this._belongsToIds[keyName];
    }

    if (returnModeIsId === false && keyName in this._belongsToRelationships) {
      assert(
        `Expected the snapshot cache entry to not be undefined`,
        this._belongsToRelationships[keyName] instanceof Snapshot
      );
      return this._belongsToRelationships[keyName];
    }

    let relationshipMeta = store._relationshipMetaFor(this.modelName, null, keyName);
    assert(
      `Model '${this.identifier}' has no belongsTo relationship named '${keyName}' defined.`,
      relationshipMeta && relationshipMeta.kind === 'belongsTo'
    );

    // TODO @runspired it seems this code branch would not work with CUSTOM_MODEL_CLASSes
    // this check is not a regression in behavior because relationships don't currently
    // function without access to intimate API contracts between RecordData and InternalModel.
    // This is a requirement we should fix as soon as the relationship layer does not require
    // this intimate API usage.
    if (!HAS_RECORD_DATA_PACKAGE) {
      assert(`snapshot.belongsTo only supported when using the package @ember-data/record-data`);
    }

    const graphFor = (
      importSync('@ember-data/record-data/-private') as typeof import('@ember-data/record-data/-private')
    ).graphFor;
    const { identifier } = this;
    const relationship = graphFor(this._store._storeWrapper).get(identifier, keyName) as BelongsToRelationship<R, T, F>;

    assert(
      `You looked up the ${keyName} belongsTo relationship for { type: ${identifier.type}, id: ${identifier.id}, lid: ${identifier.lid} but no such relationship was found.`,
      relationship
    );
    assert(
      `You looked up the ${keyName} belongsTo relationship for { type: ${identifier.type}, id: ${identifier.id}, lid: ${identifier.lid} but that relationship is a hasMany.`,
      relationship.definition.kind === 'belongsTo'
    );

    let value = relationship.getData();
    let data = value && value.data;

    inverseInternalModel = data ? store._internalModelForResource<RT>(data) : null;

    if (value && value.data !== undefined) {
      if (inverseInternalModel && !inverseInternalModel.isDeleted()) {
        if (returnModeIsId) {
          result = inverseInternalModel.id;
        } else {
          result = inverseInternalModel.createSnapshot();
        }
      } else {
        result = null;
      }
    }

    if (returnModeIsId) {
      this._belongsToIds[keyName] = result as RecordId;
    } else {
      assert(`exected snapshot to be a snapshot`, result instanceof Snapshot);
      this._belongsToRelationships[keyName] = result;
    }

    return result;
  }

  /**
   Returns the current value of a hasMany relationship.

   `hasMany` takes an optional hash of options as a second parameter,
   currently supported options are:

   - `ids`: set to `true` if you only want the IDs of the related records to be
   returned.

   Example

   ```javascript
   // store.push('post', { id: 1, title: 'Hello World', comments: [2, 3] });
   postSnapshot.hasMany('comments'); // => [Snapshot, Snapshot]
   postSnapshot.hasMany('comments', { ids: true }); // => ['2', '3']

   // store.push('post', { id: 1, title: 'Hello World' });
   postSnapshot.hasMany('comments'); // => undefined
   ```

   Note: Relationships are loaded lazily and cached upon first access.

   @method hasMany
   @param {String} keyName
   @param {Object} [options]
   @public
   @return {(Array|undefined)} An array of snapshots or IDs of a known
   relationship or an empty array if the relationship is known but unset.
   undefined will be returned if the contents of the relationship is unknown.
   */
  hasMany<F extends HasManyRelationshipFieldsFor<R, T>>(
    keyName: F,
    options?: { ids?: boolean }
  ): RecordId[] | Snapshot<R, RelatedType<R, T, F>>[] | undefined {
    type RT = RelatedType<R, T, F>;
    let returnModeIsIds = !!(options && options.ids);
    let results: RecordId[] | Snapshot<R, RT>[] | undefined;
    let cachedIds: RecordId[] | undefined = this._hasManyIds[keyName];
    let cachedSnapshots: Snapshot<R, RT>[] | undefined = this._hasManyRelationships[keyName];

    if (returnModeIsIds === true && keyName in this._hasManyIds) {
      return cachedIds;
    }

    if (returnModeIsIds === false && keyName in this._hasManyRelationships) {
      return cachedSnapshots;
    }

    let store = this._internalModel.store;
    let relationshipMeta = store._relationshipMetaFor(this.modelName, null, keyName);
    assert(
      `Model '${this.identifier}' has no hasMany relationship named '${keyName}' defined.`,
      relationshipMeta && relationshipMeta.kind === 'hasMany'
    );

    // TODO @runspired it seems this code branch would not work with CUSTOM_MODEL_CLASSes
    // this check is not a regression in behavior because relationships don't currently
    // function without access to intimate API contracts between RecordData and InternalModel.
    // This is a requirement we should fix as soon as the relationship layer does not require
    // this intimate API usage.
    if (!HAS_RECORD_DATA_PACKAGE) {
      assert(`snapshot.hasMany only supported when using the package @ember-data/record-data`);
    }

    const graphFor = (
      importSync('@ember-data/record-data/-private') as typeof import('@ember-data/record-data/-private')
    ).graphFor;
    const { identifier } = this;
    const relationship = graphFor(this._store._storeWrapper).get(identifier, keyName);
    assert(
      `You looked up the ${keyName} hasMany relationship for { type: ${identifier.type}, id: ${identifier.id}, lid: ${identifier.lid} but no such relationship was found.`,
      relationship
    );
    assert(
      `You looked up the ${keyName} hasMany relationship for { type: ${identifier.type}, id: ${identifier.id}, lid: ${identifier.lid} but that relationship is a belongsTo.`,
      relationship.definition.kind === 'hasMany'
    );

    let value = relationship.getData();

    if (value.data) {
      results = [];
      value.data.forEach((member) => {
        let internalModel = store._internalModelForResource<RT>(member);
        if (!internalModel.isDeleted()) {
          if (returnModeIsIds) {
            (results as RecordId[]).push(
              (member as ExistingResourceIdentifierObject | NewResourceIdentifierObject).id || null
            );
          } else {
            (results as Snapshot<R, RT>[]).push(internalModel.createSnapshot());
          }
        }
      });
    }

    // we assign even if `undefined` so that we don't reprocess the relationship
    // on next access. This works with the `keyName in` checks above.
    if (returnModeIsIds) {
      this._hasManyIds[keyName] = results as RecordId[];
    } else {
      this._hasManyRelationships[keyName] = results as Snapshot<R, RT>[];
    }

    return results;
  }

  /**
    Iterates through all the attributes of the model, calling the passed
    function on each attribute.

    Example

    ```javascript
    snapshot.eachAttribute(function(name, meta) {
      // ...
    });
    ```

    @method eachAttribute
    @param {Function} callback the callback to execute
    @param {Object} [binding] the value to which the callback's `this` should be bound
    @public
  */
  eachAttribute<I>(
    callback: <F extends AttributeFieldsFor<R, T>>(this: I, key: F, meta: AttributeSchema<R, T, F>) => void,
    binding: I
  ): void {
    let attrDefs = this._store._attributesDefinitionFor({ type: this.modelName });
    const attrKeys = Object.keys(attrDefs) as AttributeFieldsFor<R, T>[];
    attrKeys.forEach(<F extends AttributeFieldsFor<R, T>>(key: F) => {
      callback.call(binding, key, attrDefs[key]);
    });
  }

  /**
    Iterates through all the relationships of the model, calling the passed
    function on each relationship.

    Example

    ```javascript
    snapshot.eachRelationship(function(name, relationship) {
      // ...
    });
    ```

    @method eachRelationship
    @param {Function} callback the callback to execute
    @param {Object} [binding] the value to which the callback's `this` should be bound
    @public
  */
  eachRelationship<I>(
    callback: <F extends RelationshipFieldsFor<R, T>>(this: I, key: F, meta: RelationshipSchema<R, T, F>) => void,
    binding: I
  ): void {
    let relationshipDefs = this._store._relationshipsDefinitionFor({ type: this.modelName });
    const relKeys = Object.keys(relationshipDefs) as RelationshipFieldsFor<R, T>[];
    relKeys.forEach(<F extends RelationshipFieldsFor<R, T>>(key: F) => {
      callback.call(binding, key, relationshipDefs[key]);
    });
  }

  /**
    Serializes the snapshot using the serializer for the model.

    Example

    ```app/adapters/application.js
    import Adapter from '@ember-data/adapter';

    export default Adapter.extend({
      createRecord(store, type, snapshot) {
        let data = snapshot.serialize({ includeId: true });
        let url = `/${type.modelName}`;

        return fetch(url, {
          method: 'POST',
          body: data,
        }).then((response) => response.json())
      }
    });
    ```

    @method serialize
    @param {Object} options
    @return {Object} an object whose values are primitive JSON values only
    @public
   */
  serialize(options?: OptionsHash): unknown {
    const serializer = this._store.serializerFor(this.modelName);
    assert(`Cannot serialize record, no serializer found`, serializer);
    return serializer.serialize(this, options);
  }
}
