var env, store, adapter;
module("unit/adapters/rest_adapter/ajax_options - DS.RESTAdapter#ajaxOptions", {
  setup: function() {
    env = setupStore({
      adapter: DS.RESTAdapter
    });

    adapter = env.adapter;
  }
});

test('ajaxOptions - allows JSON', function() {
  var data = { foo: 'bar', bar: 'baz' },
      hash = adapter.ajaxOptions(null, null, { data: data });

  equal(hash.data, JSON.stringify(data));
  equal(hash.contentType, 'application/json; charset=utf-8');
});

test('ajaxOptions - allows FormData', function() {
  var data = new FormData(),
      hash = adapter.ajaxOptions(null, null, { data: data });

  strictEqual(hash.data, data);
  equal(hash.contentType, false);
  equal(hash.processData, false);
});
