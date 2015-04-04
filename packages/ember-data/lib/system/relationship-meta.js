import normalizeTypeKey from 'ember-data/system/normalize-type-key';

export function typeForRelationshipMeta(meta) {
  var typeKey, type;

  typeKey = meta.type || meta.key;
  if (typeof typeKey === 'string') {
    if (meta.kind === 'hasMany') {
      typeKey = normalizeTypeKey(typeKey);
    }
    type = typeKey;
  } else {
    type = meta.type;
  }

  return type;
}

export function relationshipFromMeta(meta) {
  return {
    key:  meta.key,
    kind: meta.kind,
    type: typeForRelationshipMeta(meta),
    options:    meta.options,
    parentType: meta.parentType,
    isRelationship: true
  };
}
