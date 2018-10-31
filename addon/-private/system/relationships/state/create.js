import relationshipStateFor from '../graph/state-for';

export default class Relationships {
  constructor(recordData) {
    this.recordData = recordData;
    this.initializedRelationships = Object.create(null);
  }

  has(key) {
    return !!this.initializedRelationships[key];
  }

  forEach(cb) {
    let rels = this.initializedRelationships;
    let names = Object.keys(rels);

    for (let i = 0; i < names.length; i++) {
      cb(names[i], rels[names[i]]);
    }
  }

  get(key) {
    let relationships = this.initializedRelationships;
    let relationship = relationships[key];

    if (!relationship) {
      let recordData = this.recordData;
      let rel = this.recordData.storeWrapper.relationshipsDefinitionFor(this.recordData.modelName)[
        key
      ];

      if (rel) {
        relationship = relationships[key] = relationshipStateFor(
          recordData.store,
          recordData.__identifier,
          key
        );
      }
    }

    return relationship;
  }
}
