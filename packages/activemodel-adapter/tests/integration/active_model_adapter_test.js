var env, store, adapter, SuperUser, MyMessage, MyPost, MyComment, MyUser;
var ajaxCalls, ajaxReturnedValue, ajaxParams;

function setupTest( async ) {
  MyUser = DS.Model.extend({
    name: DS.attr('string'),
    messages: DS.hasMany('myMessage', {
      polymorphic: true,
      inverse: 'user',
      async: async
    })
  });

  MyMessage = DS.Model.extend({
    comments: DS.hasMany('myComment', {
      inverse: 'message'
    }),
    user: DS.belongsTo('myUser')
  });

  MyPost = MyMessage.extend({
    name: DS.attr('string')
  });

  MyComment = MyMessage.extend({
    name: DS.attr('string'),
    message: DS.belongsTo('myMessage', {
      polymorphic: true,
      inverse: 'comments',
      async: async
    })
  });

  SuperUser = DS.Model.extend();

  env = setupStore({
    myUser: MyUser,
    myPost: MyPost,
    myMessage: MyMessage,
    myComment: MyComment,
    superUser: SuperUser,
    adapter: DS.ActiveModelAdapter
  });

  env.container.register('serializer:_ams', DS.ActiveModelSerializer);

  store = env.store;
  adapter = env.adapter;

  ajaxCalls = [];
  ajaxReturnedValue = [];

  adapter.ajax = function(url, verb, value) {
    ajaxCalls.push( {
      passedUrl: url,
      passedVerb: verb,
      passedHash: value
    });

    return Ember.RSVP.resolve( ajaxReturnedValue.shift() );
  };
}

function ajaxResponse(value) {
  ajaxReturnedValue.push(value);
}

function lastAjaxCall() {
  return ajaxCalls.shift();
}

module("integration/active_model_adapter - AMS Adapter", {
  setup: function() {
    setupTest(false);
  }
});

test('buildURL - decamelizes names', function() {
  equal(adapter.buildURL('superUser', 1), "/super_users/1");
});

test('ajaxError - returns invalid error if 422 response', function() {
  var error = new DS.InvalidError({ name: "can't be blank" });

  var jqXHR = {
    status: 422,
    responseText: JSON.stringify({ errors: { name: "can't be blank" } })
  };

  equal(adapter.ajaxError(jqXHR), error.toString());
});

test('ajaxError - invalid error has camelized keys', function() {
  var error = new DS.InvalidError({ firstName: "can't be blank" });

  var jqXHR = {
    status: 422,
    responseText: JSON.stringify({ errors: { first_name: "can't be blank" } })
  };

  equal(adapter.ajaxError(jqXHR), error.toString());
});

test('ajaxError - returns ajax response if not 422 response', function() {
  var jqXHR = {
    status: 500,
    responseText: "Something went wrong"
  };

  equal(adapter.ajaxError(jqXHR), jqXHR);
});

test("The store can load a polymorphic belongsTo association", function() {
  ajaxResponse({
    my_comment: [{
      id: 2,
      name: "Rails is omakase",
      message: {
        type: 'my_post',
        id: 1
      }}],
    my_posts: [{
      id:1,
      name: "OMG"
    }]
  });

  store.find('myComment', 2).then(async(function(comment) {
    ajaxParams = lastAjaxCall();

    equal(ajaxParams.passedUrl, "/my_comments/2");
    equal(ajaxParams.passedVerb, "GET");
    equal(ajaxParams.passedHash, undefined);

    equal(comment.get('id'), "2");
    equal(comment.get('name'), "Rails is omakase");

    equal(comment.get('message.id'), "1");
    equal(comment.get('message.name'), "OMG");
  }));
});

test("The store can load a polymorphic hasMany association", function() {
  var messages;

  ajaxResponse({
    my_user: [{
      id: 1,
      name: "Cyril Fluck",
      messages: [{
        type: 'my_post',
        id: 1
      }, {
        type: 'my_comment',
        id: 2
      }]
    }],
    my_posts: [{
      id:1,
      name: "OMG"
    }],
    my_comments: [{
      id: 2,
      name: "Rails is omakase"
    }]
  });

  store.find('myUser', 1).then(async(function(user) {
    ajaxParams = lastAjaxCall();

    equal(ajaxParams.passedUrl, "/my_users/1");
    equal(ajaxParams.passedVerb, "GET");
    equal(ajaxParams.passedHash, undefined);

    equal(user.get('id'), "1");
    equal(user.get('name'), "Cyril Fluck");

    equal(user.get('messages.length'), 2);
    messages = user.get('messages');
    equal(messages.objectAt(0).get('id'), "1");
  }));
});

test("The store can save a polymorphic belongsTo association", function() {
  ajaxResponse({ my_post: { id: "1", name: "Awesome" } });
  var post = store.push('myPost', { id: "1", name: "OMG" });
  var comment = store.createRecord('myComment', { id: "2", name: "Awesome"});
  comment.set('message', post);

  comment.save().then(async(function(comment) {
    ajaxParams = lastAjaxCall();

    equal(ajaxParams.passedUrl, "/my_comments");
    equal(ajaxParams.passedVerb, "POST");
    deepEqual(ajaxParams.passedHash.data, { my_comment: { id: "2", name: "Awesome", message: {id: "1", type: "my_post"}, user_id: null } });

    equal(comment.get('isDirty'), false, "the post isn't dirty anymore");
    equal(comment.get('name'), "Awesome", "the post was updated");
  }));
});

test("The store can save a polymorphic hasMany association", function() {
  ajaxResponse({
    my_user: {
      id: "1",
      name: "Cedric Fluck",
      messages: [{
        type: "my_comment",
        id: 2
      }]
    }
  });
  var comment = store.push('myComment', {id: 2, name: "OMG!!"});
  var user = store.createRecord('myUser', {name: "Cyril Fluck"});
  user.get('messages').pushObject( comment );

  user.save().then(async(function(user) {
    ajaxParams = lastAjaxCall();

    equal(ajaxParams.passedUrl, "/my_users");
    equal(ajaxParams.passedVerb, "POST");
    deepEqual(ajaxParams.passedHash.data, { my_user: { name: "Cyril Fluck" }});

    equal(user.get('isDirty'), false, "the user isn't dirty anymore");
    equal(user.get('id'), "1", "the user was updated");
  }));
});

module("integration/active_model_adapter - AMS Adapter - async", {
  setup: function() {
    setupTest(true);
  }
});

test("The store can load an async polymorphic belongsTo association", function() {
  ajaxResponse({
    my_comment: [{
      id: 2,
      name: "Rails is omakase",
      message: {
        type: 'my_post',
        id: 1
      }
    }]
  });

  store.find('myComment', 2).then(async(function(comment) {
    ajaxParams = lastAjaxCall();

    equal(ajaxParams.passedUrl, "/my_comments/2");
    equal(ajaxParams.passedVerb, "GET");
    equal(ajaxParams.passedHash, undefined);

    equal(comment.get('id'), "2");
    equal(comment.get('name'), "Rails is omakase");

    ajaxResponse({
      my_post: {
        id: 1,
        name: 'OMG'
      }
    });
    comment.get('message').then(async(function(message) {
      equal(message.get('id'), "1");
      equal(message.get('name'), "OMG");
    }));
  }));
});

test("The store can load an async polymorphic hasMany association", function() {
  var messages;

  ajaxResponse({
    my_user: [{
      id: 1,
      name: "Cyril Fluck",
      messages: [{
        type: 'my_post',
        id: 1
      }, {
        type: 'my_comment',
        id: 2
      }]
    }]
  });

  store.find('myUser', 1).then(async(function(user) {
    ajaxParams = lastAjaxCall();

    equal(ajaxParams.passedUrl, "/my_users/1");
    equal(ajaxParams.passedVerb, "GET");
    equal(ajaxParams.passedHash, undefined);

    equal(user.get('id'), "1");
    equal(user.get('name'), "Cyril Fluck");

    ajaxResponse({
      my_posts: [{
        id: 1,
        name: "OMG"
      }]
    });
    ajaxResponse({
      my_comments: [{
        id: 2,
        name: "Rails is omakase"
      }]
    });
    user.get('messages').then(function(messages) {
      equal(messages.get('length'), 2);
      equal(messages.objectAt(0).get('id'), "1");
      equal(messages.objectAt(1).get('id'), "2");
    });
  }));
});
