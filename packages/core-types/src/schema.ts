/*
  @module @warp-drive/core-types
  @internal
*/
export interface RelationshipSchema {
  kind: 'belongsTo' | 'hasMany';
  type: string; // related type
  // TODO @runspired should RFC be updated to make this optional?
  // TODO @runspired sohuld RFC be update to enforce async and inverse are set? else internals need to know
  // that meta came from @ember-data/model vs not from @ember-data/model as defaults should switch.
  options: {
    as?: string; //for polymorphic relationships, what the abstract type this is satisfying is
    async: boolean; // controls inverse unloading "client side delete semantics" so we should replace that with a real flag
    polymorphic?: boolean;
    inverse: string | null; // property key on the related type (if any)
    resetOnRemoteUpdate?: false; // manages the deprecation `DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE`
    [key: string]: unknown;
  };
  // inverse?: string | null;
  // inverseIsAsync?: boolean;
  name: string; // property key for this relationship
}

export type RelationshipsSchema = Record<string, RelationshipSchema>;

export interface AttributeSchema {
  name: string;
  kind: 'attribute';

  // TODO @runspired update RFC to make options optional
  options?: {
    [key: string]: unknown;
  };
  type: string | null;
}

export type AttributesSchema = Record<string, AttributeSchema>;
