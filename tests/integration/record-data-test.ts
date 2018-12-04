import { get } from '@ember/object';
import { setupTest } from 'ember-qunit';
import Model from 'ember-data/model';
import Store from 'ember-data/store';
import { attr, belongsTo } from '@ember-decorators/data';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';

class Book extends Model {
  // TODO fix the typing for naked attrs
  @attr('string', {})
  title;
}

class Person extends Model {
  // TODO fix the typing for naked attrs
  @attr('string', {})
  name;

  @belongsTo('house', {}) house;
}

class House extends Model {
  // TODO fix the typing for naked attrs
  @attr('something', {})
  name;

  @belongsTo('person', {}) person;
}

class TestRecordData {
  pushData(data, calculateChange?: boolean) {

  }
  clientDidCreate() {

  }
  willCommit() {

  }
  commitWasRejected() {

  }
  unloadRecord() {

  }
  rollbackAttributes() {

  }
  changedAttributes(): any {

  }

  hasChangedAttributes(): boolean {
    return false;
  }

  setDirtyAttribute(key: string, value: any) {

  }

  getAttr(key: string): string {
    return "test";
  }

  getHasMany(key: string) {

  }

  addToHasMany(key: string, recordDatas: this[], idx?: number) {

  }
  removeFromHasMany(key: string, recordDatas: this[]) {

  }
  setDirtyHasMany(key: string, recordDatas: this[]) {

  }

  getBelongsTo(key: string) {

  }
  setDirtyBelongsTo(name: string, recordData: this | null) {

  }

  didCommit(data) {

  }

  isAttrDirty(key: string) { return false; }
  removeFromInverseRelationships(isNew: boolean) { }

  _initRecordCreateOptions(options) { }

}
class TestRelationshipRecordData extends TestRecordData {
  constructor() {
    super();
    this.modelName = 'person';
  }
  isNew() {
    return false;
  }
  modelName: string;
  isEmpty() {
    return false;
  }

  getResourceIdentifier() {
    return { id: '1', type: 'person'};
  }
  //_relationships: Relationships;
  //_implicitRelationships: { [key: string]: Relationship };
}

let CustomStore = Store.extend({
  createRecordDataFor(modelName, id, clientId, storeWrapper) {
    if (modelName === 'book') {
      return new TestRecordData();
    } else if (modelName === 'person') {
      return new TestRelationshipRecordData();
    } else {
      return this._super(modelName, id, clientId, storeWrapper);
    }
  }
});

module('integration/record-data - Custom RecordData Implementations', function (hooks) {
  setupTest(hooks);

  let store;

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register('model:person', Person);
    owner.register('model:house', House);
    owner.register('model:book', Book);
    owner.register('service:store', CustomStore);
    store = owner.lookup('service:store');
  });

  test("A noop Record Data implementation that follows the spec should not error out", async function (assert) {
    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumbag Dale',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Scumbag Katz',
          },
        },
      ],
    });

    let all = store.peekAll('person');
    assert.equal(get(all, 'length'), 2);

    store.push({
      data: [
        {
          type: 'person',
          id: '3',
          attributes: {
            name: 'Scumbag Bryn',
          },
        },
      ],
    });

    await settled();

    assert.equal(get(all, 'length'), 3);
  });

  test("A noop Record Data implementation that follows the interop spec should not error out", async function (assert) {
    debugger
    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumbag Dale',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Scumbag Katz',
          },
        },
      ],
    });
    store.push({
      data: [
        {
          type: 'house',
          id: '1',
          attributes: {
            name: 'Dales house',
          },
          relationships: {
            person: { data: { type: 'person', id: '1' } }
          }
        }]
    });

    let all = store.peekAll('person');
    let houses = store.peekAll('house');
    let house = houses.objectAt(0);
    let person = houses.objectAt(0).get('person');
    assert.equal(get(all, 'length'), 2);
    
    await settled();

    house.unloadRecord();

    await settled();
  });
});