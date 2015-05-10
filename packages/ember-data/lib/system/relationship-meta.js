import normalizeTypeKey from "ember-data/system/normalize-type-key";

export function typeForRelationshipMeta(store, meta) {
  var typeKey, typeClass;

  typeKey = meta.type || meta.key;
  if (typeof typeKey === 'string') {
    if (meta.kind === 'hasMany') {
      typeKey = normalizeTypeKey(typeKey);
    }
    typeClass = store.modelFor(typeKey);
  } else {
    typeClass = meta.type;
  }

  return typeClass;
}

export function relationshipFromMeta(store, meta) {
  return {
    key:  meta.key,
    kind: meta.kind,
    type: typeForRelationshipMeta(store, meta),
    options:    meta.options,
    parentType: meta.parentType,
    isRelationship: true
  };
}
