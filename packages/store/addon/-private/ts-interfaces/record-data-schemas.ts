/**
  @module @ember-data/store
*/

import type { ResolvedRegistry } from '@ember-data/types';
import type { AttributeFieldsFor, RecordType, RelatedType, RelationshipFieldsFor } from '@ember-data/types/utils';

export interface RelationshipSchema<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T>,
  RT extends RecordType<R> = RelatedType<R, T, F>
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
  key: F; // TODO @runspired remove our uses
  // TODO @runspired should RFC be updated to make this optional?
  // TODO @runspired sohuld RFC be update to enforce async and inverse are set? else internals need to know
  // that meta came from DS.Model vs not from DS.Model as defaults should switch.
  options: {
    async?: boolean; // controls inverse unloading "client side delete semantics" so we should replace that with a real flag
    polymorphic?: boolean;
    inverse?: RelationshipFieldsFor<R, T> | null; // property key on the related type (if any)
    [key: string]: unknown;
  };

  // TODO @runspired add this to RFC details
  // and give it a better name.
  // or find a way to make it optional
  parentModelName: T;

  // inverse?: string | null;
  // inverseIsAsync?: boolean;
  /**
   * The property key for this relationship
   * @internal
   */
  name: F;
}

export type RelationshipsSchema<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
> = {
  [L in F]: RelationshipSchema<R, T, F>;
};

export interface AttributeSchema<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends AttributeFieldsFor<R, T>
> {
  /**
   * @internal
   */
  kind: 'attribute'; // TODO @runspired remove usage or guard internally
  name: F;

  // TODO @runspired update RFC to make options optional
  options: {
    [key: string]: unknown;
  };
  type: string; // TODO @runspired update RFC to make type optional
}

export type AttributesSchema<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends AttributeFieldsFor<R, T> = AttributeFieldsFor<R, T>
> = {
  [L in F]: AttributeSchema<R, T, F>;
};
