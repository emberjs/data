import { guidFor } from '@ember/object/internals';
import RSVP, { resolve, reject } from 'rsvp';
import { set, get, observer, computed } from '@ember/object';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';
import { setupTest } from 'ember-qunit';
import Model from 'ember-data/model';
import { InvalidError } from 'ember-data/adapters/errors';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import JSONAPISerializer from 'ember-data/serializers/json-api';
import JSONSerializer from 'ember-data/serializers/json';
import { attr, hasMany, belongsTo } from '@ember-decorators/data';
import DSattr from 'ember-data/attr';
import { recordDataFor } from 'ember-data/-private';
import Store from 'ember-data/store';

let store, adapter;
module('unit/model - Custom Class Model', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    let { owner } = this;

    class Person {
      constructor(store, internalModel) {
        // This goes away after store apis are fixed
        this.internalModel = internalModel;
        this.store = store;
      }/*
      get isError() {

      }
      get adapterError() {

      }

      */

      adapterErrorChanged() {

      }

      invalidErrorsChanged() {

      }

      /*
      trigger() {

      }
      */

      save() {
        return this.store.scheduleSave(this.internalModel);
      }

      destroy() {

      }
      /*
      _notifyProperties() {

      }
      notifyBelongsToChange() {

      }
      notifyPropertyChange() {

      }
      */
      /*
      get currentState() {

      }

      set currentState() {

      }
      */
    }

    let CustomStore = Store.extend({
      _relationshipsDefinitionFor: function() {
        return Object.create(null);
      },
      _attributesDefinitionFor: function() {
        return Object.create(null);
      },
      instantiateRecord(modelName, createOptions) {
        return new Person(createOptions.store, createOptions._internalModel);
      }
    });

    owner.register('service:store', CustomStore);
    owner.register('model:person', Person);
    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
        //createRecord: () => ({ data: { type: 'person', id: 1}})
        createRecord: () => RSVP.reject()
      })
    );
    owner.register('serializer:-default', JSONAPISerializer);
    store = owner.lookup('service:store');
    adapter = store.adapterFor('application');
  })

  test('igor', function(assert) {
    assert.expect(1);
    let person = store.createRecord('person');
    person.save();
    assert.ok(true);
  });
});