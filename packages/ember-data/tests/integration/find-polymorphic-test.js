var get = Ember.get;
var resolve = Ember.RSVP.resolve;
var run = Ember.run;

var attr = DS.attr;

module("integration/find_polymorphic - Find Polymorphic", {
  setup: function () {
    Attacment = DS.Model.extend({
      type: attr('string')
    });

    ImageAttacment = Attacment.extend({
      type: attr('string', {defaultValue: 'image_attachment'})
    });

    LinkAttacment = Attacment.extend({
      type: attr('string', {defaultValue: 'link_attachment'})
    });
  },
  teardown: function(){

  }
});

test("When find is called on a base of a polymorphic model, each record will be casted into appropriate model", function(){
  expect(1);
  var deferred = Ember.RSVP.defer();
  store = createStore({ adapter: DS.Adapter.extend({
    find: function(store, type, id, snapshot) {
      return Ember.RSVP.resolve([{'id': 1, 'type': 'image_attachment'},{'id': 2, 'type': 'link_attachment'}]);
    }
  })
  });

  run(function() {
    store.find(Attacment).then(function(attachments) {
      equal(attachments.get('length'), 2, 'We recieved 2 attachments');
      equal(store.hasRecordForId(ImageAttacment, 1), true, 'First attachment is an image attachment');
      equal(store.hasRecordForId(LinkAttacment, 2), true, 'Second attachment is a link attachment');
      ok(true, 'We loaded the appropriate models');
    });
  });
});


test("When find is called on a base of a polymorphic model with id the record will be casted into appropriate model", function(){
  expect(1);
  var deferred = Ember.RSVP.defer();
  store = createStore({ adapter: DS.Adapter.extend({
    find: function(store, type, id, snapshot) {
      return {'id': 1, 'type': 'image_attachment'};
    }
  })
  });

  run(function() {
    store.find(Attacment, 1).then(function(attachment) {
      equal(store.hasRecordForId(ImageAttacment, 1), true, 'The attachment is an image attachment');
      ok(true, 'We loaded the appropriate model');
    });
  });
});
