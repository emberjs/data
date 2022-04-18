/**
  @module @ember-data/store
*/

import { RecordField, RecordType, RegistryMap, ResolvedRegistry } from '@ember-data/types';

export interface RelationshipSchema<
  R extends ResolvedRegistry<RegistryMap>,
  OT extends RecordType<R>,
  K extends RecordField<R, OT>,
  RT extends RecordType<R> = RecordType<R>
> {
  kind: 'belongsTo' | 'hasMany';

  /**
   * The related type
   * @internal
   */
  type: RT; // related type
  /**
   * @internal
   * @deprecated
   */
  key: K; // TODO @runspired remove our uses
  // TODO @runspired should RFC be updated to make this optional?
  // TODO @runspired sohuld RFC be update to enforce async and inverse are set? else internals need to know
  // that meta came from DS.Model vs not from DS.Model as defaults should switch.
  options: {
    async?: boolean; // controls inverse unloading "client side delete semantics" so we should replace that with a real flag
    polymorphic?: boolean;
    inverse?: RecordField<R, RT> | null; // property key on the related type (if any)
    [key: string]: unknown;
  };

  // TODO @runspired add this to RFC details
  // and give it a better name.
  // or find a way to make it optional
  parentModelName: OT;

  // inverse?: string | null;
  // inverseIsAsync?: boolean;
  /**
   * The property key for this relationship
   * @internal
   */
  name: K;
}

export type RelationshipsSchema<
  R extends ResolvedRegistry<RegistryMap>,
  T extends RecordType<R>,
  K extends RecordField<R, T> = RecordField<R, T>
> = {
  [L in K]: RelationshipSchema<R, T, L>;
};

export interface AttributeSchema<
  R extends ResolvedRegistry<RegistryMap>,
  T extends RecordType<R>,
  K extends RecordField<R, T>
> {
  /**
   * @internal
   */
  kind: 'attribute'; // TODO @runspired remove usage or guard internally
  name: K;

  // TODO @runspired update RFC to make options optional
  options: {
    [key: string]: unknown;
  };
  type: string; // TODO @runspired update RFC to make type optional
}

export type AttributesSchema<
  R extends ResolvedRegistry<RegistryMap>,
  T extends RecordType<R>,
  K extends RecordField<R, T> = RecordField<R, T>
> = Record<K, AttributeSchema<R, T, K>>;
