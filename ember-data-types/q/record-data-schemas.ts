/**
  @module @ember-data/store
*/

import type { Dict } from './utils';

export interface RelationshipSchema {
  kind: 'belongsTo' | 'hasMany';
  type: string; // related type
  /**
   * @internal
   * @deprecated
   */
  key: string; // TODO @runspired remove our uses
  // TODO @runspired should RFC be updated to make this optional?
  // TODO @runspired sohuld RFC be update to enforce async and inverse are set? else internals need to know
  // that meta came from DS.Model vs not from DS.Model as defaults should switch.
  options: {
    async?: boolean; // controls inverse unloading "client side delete semantics" so we should replace that with a real flag
    polymorphic?: boolean;
    inverse?: string | null; // property key on the related type (if any)
    [key: string]: unknown;
  };
  // inverse?: string | null;
  // inverseIsAsync?: boolean;
  name: string; // property key for this relationship
}

export type RelationshipsSchema = Dict<RelationshipSchema>;

export interface AttributeSchema {
  /**
   * @internal
   */
  kind: 'attribute'; // TODO @runspired remove usage or guard internally
  name: string;

  // TODO @runspired update RFC to make options optional
  options: {
    [key: string]: unknown;
  };
  type: string; // TODO @runspired update RFC to make type optional
}

export type AttributesSchema = Dict<AttributeSchema>;
