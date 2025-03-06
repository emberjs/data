/*
  There are 10 record types (a ... j). following the naming convention
  `complex-record-{type}`.

  Each record type has 10 properties (1 ... 10) following the naming
  convention `prop_resource_{type}_{number}`.

  Record types a, b, c, and d have relationships to each other.

  A hasOne  B (1:1)
  A hasOne  C (1:many)
  A hasOne  D (1:none)

  B hasOne  A (1:1)
  B hasMany C (many:many)
  B hasMany D (many:none)

  C hasMany A (many:1)
  C hasMany B (many:many)
  C hasMany D (many:none)

  D hasNone A
  D hasNone B
  D hasMany C (many:none)

  relationship names have the convention

  <kind>_resource_<type>_<related_type>

  Additionally, each record has 10 traits (mixins). following the naming
  convention `record-mixin-{trait}`

  Each of the first 4 traits (a, b, c, d) has 10 properties (1 ... 10) following the naming
  convention `prop_trait_{trait}_{number}`. The remaining traits have just one property still
  following this convention.

  Traits a, b, c and d have relationships to each other in exactly the same
  pattern as the record types; however, these relationships are set as
  polymorphic. and thus any record type can satisfy them as all 10 record types
  use all 10 traits.
*/

import { styleText } from 'node:util';
import debug from 'debug';

const log = debug('create-complex-payload');
const logRelationship = debug('create-complex-payload:relationships');

const types = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
const fullTraits = ['a', 'b', 'c', 'd'];
const MANY_RELATIONSHIP_SIZE = 4;

const SEEN_IDS_FOR = {
  belongsTo_trait_a_b: new Set(),
  belongsTo_trait_a_c: new Set(),
  belongsTo_trait_a_d: new Set(),
  belongsTo_trait_b_a: new Set(),
  hasMany_trait_b_c: new Set(),
  hasMany_trait_b_d: new Set(),
  hasMany_trait_c_a: new Set(),
  hasMany_trait_c_b: new Set(),
  hasMany_trait_c_d: new Set(),
  hasMany_trait_d_c: new Set(),
  belongsTo_resource_a_b: new Set(),
  belongsTo_resource_a_c: new Set(),
  belongsTo_resource_a_d: new Set(),
  belongsTo_resource_b_a: new Set(),
  hasMany_resource_b_c: new Set(),
  hasMany_resource_b_d: new Set(),
  hasMany_resource_c_a: new Set(),
  hasMany_resource_c_b: new Set(),
  hasMany_resource_c_d: new Set(),
  hasMany_resource_d_c: new Set(),
};

type RelationshipKey = keyof typeof SEEN_IDS_FOR;
type Ref = { type: string; id: string };
type Resource = {
  type: string;
  id: string;
  attributes: { [key: string]: string };
  relationships: { [key in RelationshipKey]?: { data: null | Ref[] | Ref } };
};
type Context = {
  RecordsByRef: Map<Ref, Resource>;
  RecordsByType: Map<string, Resource[]>;
  ALL_Records: Resource[];
  totalPerType: number;
  PrimaryRecords: Resource[];
  OtherRecords: Resource[];
};
type Meta = {
  name: string;
  kind: 'belongsTo' | 'hasMany';
  isRecord: boolean;
  isTrait: boolean;
  variant: string;
  type: string;
  inverse: string | null;
};

function generateRecordForType(type: string, id: string): Resource {
  // each record will have 56 attributes
  const attributes = {};
  for (let i = 1; i <= 10; i++) {
    attributes[`prop_resource_${type}_${i}`] = `cr:${type}:${id}:${i}`;
  }
  for (const trait of types) {
    for (let i = 1; i <= 10; i++) {
      attributes[`prop_trait_${trait}_${i}`] = `trait_:${trait}:${id}:${i}`;
      if (!fullTraits.includes(trait)) {
        // exit the inner loop if we are not in the first 4 traits
        // as only they have 10 properties, the rest have just 1
        break;
      }
    }
  }

  /*
    All records start with 10 relationships via traits a, b, c, and d.
    The relationships are polymorphic and can be satisfied by any record type.

    Record types a, b, c, and d have additional relationships to each other.

    types a, b and c will have 13 total relationships
    type d will have 11 total relationships.

    We start by populating these relationships as "empty". Then fill them
    in during a second pass.
  */
  const relationships: { [key in RelationshipKey]?: { data: null | Ref[] | Ref } } = {
    belongsTo_trait_a_b: { data: null },
    belongsTo_trait_a_c: { data: null },
    belongsTo_trait_a_d: { data: null },
    belongsTo_trait_b_a: { data: null },
    hasMany_trait_b_c: { data: [] },
    hasMany_trait_b_d: { data: [] },
    hasMany_trait_c_a: { data: [] },
    hasMany_trait_c_b: { data: [] },
    hasMany_trait_c_d: { data: [] },
    hasMany_trait_d_c: { data: [] },
  };

  if (type === 'a') {
    relationships.belongsTo_resource_a_b = { data: null };
    relationships.belongsTo_resource_a_c = { data: null };
    relationships.belongsTo_resource_a_d = { data: null };
  } else if (type === 'b') {
    relationships.belongsTo_resource_b_a = { data: null };
    relationships.hasMany_resource_b_c = { data: [] };
    relationships.hasMany_resource_b_d = { data: [] };
  } else if (type === 'c') {
    relationships.hasMany_resource_c_a = { data: [] };
    relationships.hasMany_resource_c_b = { data: [] };
    relationships.hasMany_resource_c_d = { data: [] };
  } else if (type === 'd') {
    relationships.hasMany_resource_d_c = { data: [] };
  }

  return {
    id,
    type: `complex-record-${type}`,
    attributes,
    relationships,
  };
}

const REFS = new Map();
function getRef(record: Resource): Ref {
  if (REFS.has(record)) {
    return REFS.get(record);
  }
  const _ref = { type: record.type, id: record.id };
  REFS.set(record, _ref);
  return _ref;
}

function printObjectRef(ref: Ref) {
  return [
    styleText('gray', '{ '),
    styleText('cyan', 'type'),
    styleText('gray', ': '),
    styleText('green', `"${ref.type}"`),
    styleText('gray', ', '),
    styleText('cyan', 'id'),
    styleText('gray', ': '),
    styleText('green', `"${ref.id}"`),
    styleText('gray', ' }'),
  ].join('');
}

function printStringRef(ref: Ref) {
  return [
    styleText('gray', '{'),
    styleText('cyan', ref.type),
    styleText('gray', ':'),
    styleText('green', ref.id),
    styleText('gray', '}'),
  ].join('');
}

function logArray(arr) {
  console.log('\n\nArray<' + arr.length + '>[');
  for (const item of arr) {
    console.log(`  ${printObjectRef(item)}`);
  }
  console.log(']\n');
}

function getNextUnseen(context: Context, selfRef: Ref, meta: Meta) {
  const records = meta.isTrait ? context.ALL_Records : context.RecordsByType.get(meta.type);

  if (!records?.length) {
    console.log({
      meta,
      selfRef,
      records,
    });
    throw new Error('No records from which to find the next unseen');
  }

  const seen = SEEN_IDS_FOR[meta.name];

  for (const record of records) {
    const relatedRef = getRef(record);
    if (seen.has(relatedRef)) {
      continue;
    }
    if (relatedRef === selfRef) {
      continue;
    }
    seen.add(relatedRef);
    return record;
  }

  if (meta.inverse === null) {
    throw new Error(`No unseen records found for ${meta.kind} relationship ${meta.name} with inverse 'null'`);
  } else if (meta.kind === 'belongsTo') {
    throw new Error(
      `No unseen records found for ${meta.kind} relationship ${meta.name} with inverse '${meta.inverse}'`
    );
  } else {
    console.log('\n\nseen', seen.size);
    logArray(Array.from(seen));
    const inverseSeen = SEEN_IDS_FOR[meta.inverse];
    console.log('\n\ninverse seen', inverseSeen.size);
    logArray(Array.from(inverseSeen));
    console.dir({
      meta,
      selfRef,
      inverseMeta: parseRelationshipMeta(meta.inverse),
    });

    throw new Error(
      `No unseen records found for ${meta.kind} relationship ${meta.name} with inverse '${meta.inverse}'`
    );
  }

  // for hasMany relationships, we are populating

  // // validate by printing out the state of every record's relationship
  // console.log(`Validating States\n==================`);
  // for (const record of all) {
  //   console.log(stringRef(getRef(record.type, record.id)));
  //   if (record.relationships[meta.name]) {
  //     const value = record.relationships[meta.name].data;
  //     const strValue = !value
  //       ? 'null'
  //       : Array.isArray(value)
  //         ? value.length
  //           ? value.map((v) => stringRef(v)).join(', ')
  //           : '<empty>'
  //         : stringRef(value);
  //     console.log(`\thas state ${meta.name}: ${strValue}`);
  //   }
  //   if (record.relationships[meta.inverse]) {
  //     const value = record.relationships[meta.inverse].data;
  //     const strValue = !value
  //       ? 'null'
  //       : Array.isArray(value)
  //         ? value.length
  //           ? value.map((v) => stringRef(v)).join(', ')
  //           : '<empty>'
  //         : stringRef(value);
  //     console.log(`\thas inverse ${meta.inverse}: ${strValue}`);
  //   }
  // }

  // if (meta.kind === 'hasMany') {
  //   const passes = seen.passes ?? 0;
  //   if (passes < MANY_RELATIONSHIP_SIZE) {
  //     SEEN_IDS_FOR[meta.name].passes = passes + 1;
  //     SEEN_IDS_FOR[meta.name].clear();
  //   }

  //   return getNextUnseen(meta, selfRef, records, all);
  // }

  // throw new Error('No unseen records found');
}

const INVERSE_RELATIONSHIPS = new Map([
  ['belongsTo_trait_a_b', 'belongsTo_trait_b_a'],
  ['belongsTo_trait_a_c', 'hasMany_trait_c_a'],
  ['belongsTo_trait_a_d', null],
  ['belongsTo_trait_b_a', 'belongsTo_trait_a_b'],
  ['hasMany_trait_b_c', 'hasMany_trait_c_b'],
  ['hasMany_trait_b_d', null],
  ['hasMany_trait_c_a', 'belongsTo_trait_a_c'],
  ['hasMany_trait_c_b', 'hasMany_trait_b_c'],
  ['hasMany_trait_c_d', null],
  ['hasMany_trait_d_c', null],

  ['belongsTo_resource_a_b', 'belongsTo_resource_b_a'],
  ['belongsTo_resource_a_c', 'hasMany_resource_c_a'],
  ['belongsTo_resource_a_d', null],
  ['belongsTo_resource_b_a', 'belongsTo_resource_a_b'],
  ['hasMany_resource_b_c', 'hasMany_resource_c_b'],
  ['hasMany_resource_b_d', null],
  ['hasMany_resource_c_a', 'belongsTo_resource_a_c'],
  ['hasMany_resource_c_b', 'hasMany_resource_b_c'],
  ['hasMany_resource_c_d', null],
  ['hasMany_resource_d_c', null],
]);

/**
 * the property keys follow the pattern
 * - <kind>_<isrecord><type>_<related_type>
 * - <kind>_<istrait><type>_<related_type>
 */
const METAS = new Map();
function parseRelationshipMeta(fieldName: string): Meta {
  if (METAS.has(fieldName)) {
    return METAS.get(fieldName);
  }
  const parts = fieldName.split('_');
  const kind = parts[0] as 'belongsTo' | 'hasMany';
  const isRecord = parts[1] === 'resource';
  const isTrait = parts[1] === 'trait';
  const ownType = parts[2];
  const typeVariant = parts[3];
  const relatedType = isTrait ? `record-mixin-${typeVariant}` : `complex-record-${typeVariant}`;
  const inverse = INVERSE_RELATIONSHIPS.get(fieldName);

  if (inverse === undefined) {
    throw new Error(`No inverse relationship found for ${fieldName}`);
  }

  if (inverse && INVERSE_RELATIONSHIPS.get(inverse) !== fieldName) {
    throw new Error(`Inverse relationship mismatch for ${fieldName}`);
  }

  const meta = {
    name: fieldName,
    kind,
    isRecord,
    isTrait,
    ownType,
    variant: typeVariant,
    type: relatedType,
    inverse,
  };

  METAS.set(fieldName, meta);

  return meta;
}

function canAddToRelatedArray(relatedArray: Ref[], ref: Ref) {
  return (
    relatedArray.length < MANY_RELATIONSHIP_SIZE &&
    !relatedArray.some((rel) => rel.id === ref.id && ref.type === ref.type)
  );
}

function addRelatedRecord(context: Context, record: Resource, meta: Meta) {
  if (meta.kind !== 'belongsTo') {
    throw new Error('only use addRelatedRecordForType for belongsTo relationships');
  }

  // if we've already been assigned, move on
  const storage = record.relationships[meta.name];
  if (storage.data !== null) {
    logRelationship(`\t\t${styleText('cyan', meta.name)} = ${printStringRef(storage.data)} [EXISTING]`);
    return;
  }

  const selfRef = getRef(record);
  const candidate = getNextUnseen(context, selfRef, meta);
  const ref = getRef(candidate);

  // in order to assign, we must also be able to assign to the inverse
  if (!meta.inverse) {
    logRelationship(`\t\t${styleText('cyan', meta.name)} = ${printStringRef(ref)}`);
    storage.data = ref;
    return;
  }
  const inverseMeta = parseRelationshipMeta(meta.inverse);

  if (inverseMeta.kind === 'hasMany') {
    if (canAddToRelatedArray(candidate.relationships[inverseMeta.name].data, selfRef)) {
      logRelationship(`\t\t${styleText('cyan', meta.name)} = ${printStringRef(ref)} (inverse updated)`);
      storage.data = ref;
      candidate.relationships[inverseMeta.name].data.push(selfRef);
      SEEN_IDS_FOR[inverseMeta.name].add(selfRef);
      return;
    } else {
      throw new Error(`Cannot add to ${inverseMeta.name} as it already is populated`);
    }
  } else if (inverseMeta.kind === 'belongsTo') {
    if (candidate.relationships[inverseMeta.name].data === null) {
      logRelationship(`\t\t${styleText('cyan', meta.name)} = ${printStringRef(ref)} (inverse updated)`);
      storage.data = ref;
      candidate.relationships[inverseMeta.name].data = selfRef;
      SEEN_IDS_FOR[inverseMeta.name].add(selfRef);
      return;
    } else {
      throw new Error(`Cannot add to ${inverseMeta.name} as it already is populated`);
    }
  } else {
    throw new Error('Unknown inverse relationship kind');
  }
}

function addRelatedRecords(context: Context, record: Resource, meta: Meta) {
  if (meta.kind !== 'hasMany') {
    throw new Error('only use addRelatedRecords for hasMany relationships');
  }

  // if we've already been assigned, move on
  const storage = record.relationships[meta.name];
  if (storage.data.length >= MANY_RELATIONSHIP_SIZE) {
    if (storage.data.length > MANY_RELATIONSHIP_SIZE) {
      throw new Error('Too many relationships');
    }
    logRelationship(
      `\t\t${styleText('cyan', meta.name)} = [${storage.data.map(printStringRef).join(', ')}] [EXISTING]`
    );
    return;
  }

  const selfRef = getRef(record);
  for (let i = storage.data.length; i < MANY_RELATIONSHIP_SIZE; i++) {
    const candidate = getNextUnseen(context, selfRef, meta);
    const ref = getRef(candidate);

    // in order to assign, we must also be able to assign to the inverse
    if (!meta.inverse) {
      logRelationship(
        `\t\t${styleText('cyan', meta.name)} += ${printStringRef(ref)} (${storage.data.length + 1} total)`
      );
      storage.data.push(ref);
      continue;
    }
    const inverseMeta = parseRelationshipMeta(meta.inverse);

    if (inverseMeta.kind === 'hasMany') {
      if (canAddToRelatedArray(candidate.relationships[inverseMeta.name].data, selfRef)) {
        logRelationship(
          `\t\t${styleText('cyan', meta.name)} += ${printStringRef(ref)} (${storage.data.length + 1} total) (inverse updated)`
        );
        storage.data.push(ref);
        candidate.relationships[inverseMeta.name].data.push(selfRef);
        SEEN_IDS_FOR[inverseMeta.name].add(selfRef);
        // IF NEEDED
        // in a Many:Many situation, we can reset SEEN_IDS in between as the only requirement
        // on uniqueness is that its not present in the candidate
        continue;
      } else {
        throw new Error(`Cannot add to ${inverseMeta.name} as it already is populated`);
      }
    } else if (inverseMeta.kind === 'belongsTo') {
      if (candidate.relationships[inverseMeta.name].data === null) {
        logRelationship(
          `\t\t${styleText('cyan', meta.name)} += ${printStringRef(ref)} (${storage.data.length + 1} total) (inverse updated)`
        );
        storage.data.push(ref);
        candidate.relationships[inverseMeta.name].data = selfRef;
        SEEN_IDS_FOR[inverseMeta.name].add(selfRef);
        continue;
      } else {
        throw new Error(
          `Cannot add ${printStringRef(selfRef)} to ${printStringRef(ref)} field ${inverseMeta.name} as it already is populated with ${printStringRef(candidate.relationships[inverseMeta.name].data)}`
        );
      }
    } else {
      throw new Error('Unknown inverse relationship kind');
    }
  }
}

async function ensureRelationshipData(context: Context) {
  log(
    `Generated ${context.ALL_Records.length} total records. Ensuring complete relationship data for ${context.totalPerType} records per type`
  );
  // for hasMany relationships, we always want to have MANY_RELATIONSHIP_SIZE records.
  // for belongsTo relationships, we want to have 1 record.
  // for mixin relationships, any record type satisfies the relationship
  // for non-mixin relationships, only the specific record type satisfies the relationship

  // we process all belongsTo relationships first so that they are most likely to point
  // as other primary records
  for (const recordsForType of context.RecordsByType.values()) {
    let processed = 0;
    for (const record of recordsForType) {
      logRelationship(`BelongsTo | ${printStringRef(record)} (${++processed} of ${context.totalPerType})`);

      for (const fieldName of Object.keys(record.relationships)) {
        const meta = parseRelationshipMeta(fieldName);
        if (meta.kind === 'belongsTo') {
          addRelatedRecord(context, record, meta);
        } else if (meta.kind === 'hasMany') {
          // do nothing, handled below
        } else {
          throw new Error('Unknown relationship kind');
        }
      }

      // only add relationships to the first totalPerType records
      if (processed >= context.totalPerType) {
        break;
      }

      logRelationship(`\n\n`);
      if (logRelationship.enabled) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    logRelationship(`\n\n====================\n\n`);
    if (logRelationship.enabled) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // next we process hasMany relationships
  for (const recordsForType of context.RecordsByType.values()) {
    let processed = 0;
    for (const record of recordsForType) {
      logRelationship(`HasMany | ${printStringRef(record)} (${++processed} of ${context.totalPerType})`);

      for (const fieldName of Object.keys(record.relationships)) {
        const meta = parseRelationshipMeta(fieldName);
        if (meta.kind === 'belongsTo') {
          // do nothing, handled above
        } else if (meta.kind === 'hasMany') {
          addRelatedRecords(context, record, meta);
        } else {
          throw new Error('Unknown relationship kind');
        }
      }

      // only add relationships to the first totalPerType records
      if (processed >= context.totalPerType) {
        break;
      }

      logRelationship(`\n\n`);
      if (logRelationship.enabled) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    logRelationship(`\n\n====================\n\n`);
    if (logRelationship.enabled) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // finally we validate
  for (const recordsForType of context.RecordsByType.values()) {
    let processed = 0;
    for (const record of recordsForType) {
      for (const fieldName of Object.keys(record.relationships)) {
        const meta = parseRelationshipMeta(fieldName);
        if (meta.kind === 'belongsTo') {
          if (record.relationships[meta.name].data === null) {
            console.log(`\tMissing belongsTo relationship ${meta.name} on ${record.type} ${record.id}`);
          }
        } else if (meta.kind === 'hasMany') {
          if (record.relationships[meta.name].data.length !== MANY_RELATIONSHIP_SIZE) {
            console.log(
              `\tInvalid hasMany relationship ${meta.name} on ${record.type} ${record.id}, expected ${MANY_RELATIONSHIP_SIZE} got ${record.relationships[meta.name].data.length}`
            );
          }
        } else {
          throw new Error('Unknown relationship kind');
        }
      }
      processed++;
      if (processed >= context.totalPerType) {
        break;
      }
    }
  }
}

async function createComplexPayload(totalPerType = 100) {
  const RecordsByType = new Map<string, Resource[]>();
  const RecordsByRef = new Map<Ref, Resource>();
  const ALL_Records: Resource[] = [];
  const PrimaryRecords: Resource[] = [];
  const OtherRecords: Resource[] = [];

  // generate the records
  for (const type of types) {
    const RecordsOfType: Resource[] = [];
    RecordsByType.set(`complex-record-${type}`, RecordsOfType);

    // in order to have 1:many and many:many relationships of N > 1, we need
    // to generate N * desired total records.
    for (let i = 1; i <= totalPerType * (MANY_RELATIONSHIP_SIZE + 1); i++) {
      const id = String(i);
      const record = generateRecordForType(type, id);
      const ref = getRef(record);
      RecordsByRef.set(ref, record);
      RecordsOfType.push(record);
      ALL_Records.push(record);

      if (i <= totalPerType) {
        PrimaryRecords.push(record);
      } else {
        OtherRecords.push(record);
      }
    }
  }

  // fill in the relationships
  await ensureRelationshipData({
    RecordsByRef,
    RecordsByType,
    ALL_Records,
    totalPerType,
    PrimaryRecords,
    OtherRecords,
  });

  return { data: PrimaryRecords, included: OtherRecords };
}

export { createComplexPayload };
