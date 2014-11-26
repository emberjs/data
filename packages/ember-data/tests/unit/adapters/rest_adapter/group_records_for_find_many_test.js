var GroupsAdapter, Store;
var maxLength = -1;
var lengths = Ember.A([]);

module("unit/adapters/rest_adapter/group_records_for_find_many_test - DS.RESTAdapter#groupRecordsForFindMany", {
  setup: function() {
    GroupsAdapter = DS.RESTAdapter.extend({

      coalesceFindRequests: true,

      find: function(store, type, id) {
        return Ember.RSVP.Promise.resolve({ id: id });
      },

      ajax: function(url, type, options) {
        var queryString = options.data.ids.map(function(i) {
          return encodeURIComponent('ids[]') + '=' + encodeURIComponent(i);
        }).join('&');
        var fullUrl = url + '?' + queryString;

        maxLength = this.get('maxUrlLength');
        lengths.push(fullUrl.length);

        return Ember.RSVP.Promise.resolve({ 'testRecords' : [] });
      }

    });

    Store = createStore({
      adapter: GroupsAdapter,
      testRecord: DS.Model.extend()
     });

  }
});

test('groupRecordsForFindMany - findMany', function() {

  Ember.run(function() {
    for(var i = 1; i <= 1024; i++) {
      Store.find('testRecord', i);
    }
  });

  ok(lengths.every(function(len) {
      return len <= maxLength;
    }), "Some URLs are longer than " + maxLength + " chars");

});
