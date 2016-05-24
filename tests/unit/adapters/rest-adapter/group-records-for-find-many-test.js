import {createStore} from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';
import isEnabled from 'ember-data/-private/features';

var GroupsAdapter, Store;
var maxLength = -1;
var lengths = Ember.A([]);

module("unit/adapters/rest_adapter/group_records_for_find_many_test - DS.RESTAdapter#groupRecordsForFindMany", {
  beforeEach() {
    GroupsAdapter = DS.RESTAdapter.extend({

      coalesceFindRequests: true,

      findRecord(store, type, id, snapshot) {
        return Ember.RSVP.Promise.resolve({ id: id });
      }
    });

    if (isEnabled('ds-improved-ajax')) {
      GroupsAdapter.reopen({
        _makeRequest(request) {
          var queryString = request.data.ids.map(function(i) {
            return encodeURIComponent('ids[]') + '=' + encodeURIComponent(i);
          }).join('&');
          var fullUrl = request.url + '?' + queryString;

          maxLength = this.get('maxURLLength');
          lengths.push(fullUrl.length);

          var testRecords = request.data.ids.map(function(id) {
            return { id: id };
          });
          return Ember.RSVP.Promise.resolve({ 'testRecords' :  testRecords });
        }
      });
    } else {
      GroupsAdapter.reopen({
        ajax(url, type, options) {
          var queryString = options.data.ids.map(function(i) {
            return encodeURIComponent('ids[]') + '=' + encodeURIComponent(i);
          }).join('&');
          var fullUrl = url + '?' + queryString;

          maxLength = this.get('maxURLLength');
          lengths.push(fullUrl.length);

          var testRecords = options.data.ids.map(function(id) {
            return { id: id };
          });
          return Ember.RSVP.Promise.resolve({ 'testRecords' :  testRecords });
        }
      });
    }

    Store = createStore({
      adapter: GroupsAdapter,
      testRecord: DS.Model.extend()
    });

  }
});

test('groupRecordsForFindMany - findMany', function(assert) {

  Ember.run(function() {
    for (var i = 1; i <= 1024; i++) {
      Store.findRecord('testRecord', i);
    }
  });

  assert.ok(lengths.every(function(len) {
    return len <= maxLength;
  }), "Some URLs are longer than " + maxLength + " chars");

});
