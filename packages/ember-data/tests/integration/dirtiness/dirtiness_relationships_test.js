var store, adapter, App;

module("Relationship Changes and Dirtiness", {
  setup: function() {
    adapter = DS.Adapter.create();

    store = DS.Store.create({
      adapter: adapter
    });
    
    App = Ember.Namespace.create({
      toString: function() { return "App"; }
    });
    
    App.Profile = DS.Model.extend({
      signature: DS.attr('string')
    });

    App.Person = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),
      profile: DS.belongsTo(App.Profile)
    });

    App.Profile.reopen({
      person: DS.belongsTo(App.Person)
    });
  }
});

test("With default adapter changing the belongsTo between two records makes them dirty", function() {
  store.load(App.Profile, { id: 1, signature: "signature" });
  store.load(App.Person, { id: 1, firstName: "Yehuda" });

  var person = store.find(App.Person, 1);
  var profile = store.find(App.Profile, 1);

  person.set('profile', profile);

  ok(person.get('isDirty'), "person should be dirty");
  ok(profile.get('isDirty'), "profile should be dirty");
});

test("With default adapter changing the belongsTo between three records makes them dirty", function() {
  store.load(App.Profile, { id: 1, signature: "signature", person:1 });
  store.load(App.Profile, { id: 2, signature: "some other signature" });
  store.load(App.Person, { id: 1, firstName: "Yehuda", profile: 1});

  var person = store.find(App.Person, 1);
  var profile1 = store.find(App.Profile, 1);
  var profile2 = store.find(App.Profile, 2);

  person.set('profile', profile2);

  ok(person.get('isDirty'), "person should be dirty");
  ok(profile1.get('isDirty'), "profile1 should be dirty");
  ok(profile2.get('isDirty'), "profile2 should be dirty");
});

test("Changing the belongsTo between three records and then changing it back makes all three records clean", function() {
  store.load(App.Profile, { id: 1, signature: "signature", person:1 });
  store.load(App.Profile, { id: 2, signature: "some other signature" });
  store.load(App.Person, { id: 1, firstName: "Yehuda", profile: 1});

  var person = store.find(App.Person, 1);
  var profile1 = store.find(App.Profile, 1);
  var profile2 = store.find(App.Profile, 2);

  person.set('profile', profile2);
  person.set('profile', profile1);

  ok(!person.get('isDirty'), "person should not be dirty");
  ok(!profile1.get('isDirty'), "profile1 should not be dirty");
  ok(!profile2.get('isDirty'), "profile2 should not be dirty");
});
