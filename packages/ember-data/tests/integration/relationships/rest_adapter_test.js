var get = Ember.get, set = Ember.set;

var Person, Comment, store, requests;

Person = DS.Model.extend();
Comment = DS.Model.extend();

Person.reopen({
  name: DS.attr('string'),
  comments: DS.hasMany(Comment)
});
Person.toString = function() { return "Person"; };

Comment.reopen({
  body: DS.attr('string'),
  person: DS.belongsTo(Person)
});
Comment.toString = function() { return "Comment"; };

module('Relationships with the REST adapter', {
  setup: function() {
    var Adapter, adapter;

    requests = [];

    Adapter = DS.RESTAdapter.extend();
    Adapter.configure('plurals', {
      person: 'people'
    });

    adapter = Adapter.create({
      ajax: function(url, method, options) {
        var success = options.success,
            error = options.error;

        options.url = url;
        options.method = method;

        if (success) {
          options.success = function() {
            success.apply(options.context, arguments);
          };
        }

        if (error) {
          options.error = function() {
            error.apply(options.context, arguments);
          };
        }

        requests.push(options);
      }
    });

    store = DS.Store.create({
      isDefaultStore: true,
      adapter: adapter
    });
  }
});

function expectState(record, state, value) {
  if (value === undefined) { value = true; }

  var flag = "is" + state.charAt(0).toUpperCase() + state.substr(1);
  equal(get(record, flag), value, "the " + record.constructor + " is " + (value === false ? "not " : "") + state);
}

function expectStates(records, state, value) {
  records.forEach(function(record) {
    expectState(record, state, value);
  });
}

test("creating a parent and child in the same commit", function() {
  var person, comment;

  comment = store.createRecord(Comment);

  person = store.createRecord(Person, { name: "John Doe" });
  person.get('comments').pushObject(comment);

  store.commit();

  expectStates([person, comment], 'saving', true);

  equal(requests.length, 1, "Only one request is attempted");
  equal(requests[0].url, "/people", "The person is created first");

  requests[0].success({
    person: { id: 1, name: "John Doe", comments: [] },
    comments: []
  });

  stop();
  setTimeout(function() {
    start();

    expectState(person, 'saving', false);
    expectState(comment, 'saving', true);
    expectStates([person, comment], 'error', false);

    equal(requests.length, 2, "A second request is attempted");
    equal(requests[1].url, "/comments", "The comment is created second");
    equal(requests[1].data.comment.person_id, 1, "The submitted comment attributes include the person_id");

    requests[1].success({
      comment: { id: 2, person_id: 1 }
    });
  });

  stop();
  setTimeout(function() {
    start();

    expectStates([person, comment], 'saving', false);
    expectStates([person, comment], 'error', false);
  });
});

test("creating a parent and updating a child in the same commit", function() {
  var person, comment;

  store.load(Comment, { id: 2 });
  comment = store.find(Comment, 2);
  comment.set('body', 'Lorem ipsum dolor sit amet.');

  person = store.createRecord(Person, { name: "John Doe" });
  person.get('comments').pushObject(comment);

  store.commit();

  expectStates([person, comment], 'saving', true);

  equal(requests.length, 1, "Only one request is attempted");
  equal(requests[0].url, "/people", "The person is created first");

  requests[0].success({
    person: { id: 1, name: "John Doe", comments: [] },
    comments: []
  });

  stop();
  setTimeout(function() {
    start();

    expectState(person, 'saving', false);
    expectState(comment, 'saving', true);
    expectStates([person, comment], 'error', false);

    equal(requests.length, 2, "A second request is attempted");
    equal(requests[1].url, "/comments/2", "The comment is updated second");
    equal(requests[1].data.comment.person_id, 1, "The submitted comment attributes include the person_id");

    requests[1].success();
  });

  stop();
  setTimeout(function() {
    start();

    expectStates([person, comment], 'saving', false);
    expectStates([person, comment], 'error', false);
  });
});
