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

test('ajaxOptions - honours processData', function() {
  var data = 'foo=bar',
      hash = adapter.ajaxOptions(null, null, { data: data, processData: false });

  equal(hash.data, data);
  equal(hash.contentType, undefined);
});
