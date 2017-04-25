import {createStore} from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';
import { isEnabled } from 'ember-data/-private';

let GroupsAdapter, store, requests;
let maxLength;
let lengths;

module('unit/adapters/rest_adapter/group_records_for_find_many_test - DS.RESTAdapter#groupRecordsForFindMany', {
  beforeEach() {
    maxLength = -1;
    requests = [];
    lengths = [];

    GroupsAdapter = DS.RESTAdapter.extend({

      coalesceFindRequests: true,

      findRecord(store, type, id, snapshot) {
        return { id };
      }
    });

    if (isEnabled('ds-improved-ajax')) {
      GroupsAdapter.reopen({
        _makeRequest(request) {
          requests.push({
            url: request.url,
            ids: request.data.ids
          });

          let queryString = request.data.ids.map(i => {
            return encodeURIComponent('ids[]') + '=' + encodeURIComponent(i);
          }).join('&');
          let fullUrl = request.url + '?' + queryString;

          maxLength = this.get('maxURLLength');
          lengths.push(fullUrl.length);

          let testRecords = request.data.ids.map(id => ({ id }));
          return Ember.RSVP.Promise.resolve({ 'testRecords' :  testRecords });
        }
      });
    } else {
      GroupsAdapter.reopen({
        ajax(url, type, options) {
          requests.push({
            url,
            ids: options.data.ids
          });

          let queryString = options.data.ids.map(i => {
            return encodeURIComponent('ids[]') + '=' + encodeURIComponent(i);
          }).join('&');
          let fullUrl = url + '?' + queryString;

          maxLength = this.get('maxURLLength');
          lengths.push(fullUrl.length);

          let testRecords = options.data.ids.map(id => ({ id }));
          return Ember.RSVP.Promise.resolve({ 'testRecords' :  testRecords });
        }
      });
    }

    store = createStore({
      adapter: GroupsAdapter,
      testRecord: DS.Model.extend()
    });
  },
  afterEach() {
    Ember.run(store, 'destroy');
  }
});

test('groupRecordsForFindMany - findMany', function(assert) {
  let wait = [];
  Ember.run(() => {
    for (var i = 1; i <= 1024; i++) {
      wait.push(store.findRecord('testRecord', i));
    }
  });

  assert.ok(lengths.every(len => len <= maxLength), `Some URLs are longer than ${maxLength} chars`);
  return Ember.RSVP.Promise.all(wait);
});

test('groupRecordsForFindMany works for encodeURIComponent-ified ids', function(assert) {
  let wait = [];
  Ember.run(() => {
    wait.push(store.findRecord('testRecord', 'my-id:1'));
    wait.push(store.findRecord('testRecord', 'my-id:2'));
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/testRecords');
  assert.deepEqual(requests[0].ids, ['my-id:1', 'my-id:2']);

  return Ember.RSVP.Promise.all(wait);
});

test('_stripIDFromURL works with id being encoded - #4190', function(assert) {
  let record = Ember.run(() => store.createRecord('testRecord', { id: "id:123" }));
  let adapter = store.adapterFor('testRecord');
  let snapshot = record._internalModel.createSnapshot();
  let strippedUrl = adapter._stripIDFromURL(store, snapshot);

  assert.equal(strippedUrl, '/testRecords/');
});
