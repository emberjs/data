var App, store;

var run = Ember.run;
module('integration/backwards-compat/non-dasherized-lookups - non dasherized lookups in application code finders', {
  setup() {
    run(function() {
      App = Ember.Application.create();
      App.PostNote = DS.Model.extend({
        name: DS.attr()
      });
    });
    store = App.__container__.lookup('store:main');
  },
  teardown() {
    run(App, 'destroy');
    App = null;
  }
});

test('can lookup models using camelCase strings', function() {
  expect(1);
  run(function() {
    store.pushPayload('postNote', {
      postNote: {
        id: 1,
        name: 'Ember Data'
      }
    });
  });

  run(function() {
    store.find('postNote', 1).then(async(function(postNote) {
      equal(postNote.get('id'), 1);
    }));
  });
});

test('can lookup models using underscored strings', function() {
  run(function() {
    store.pushPayload('post_note', {
      postNote: {
        id: 1,
        name: 'Ember Data'
      }
    });

    run(function() {
      store.find('post_note', 1).then(async(function(postNote) {
        equal(postNote.get('id'), 1);
      }));
    });
  });
});

module('integration/backwards-compat/non-dasherized-lookups - non dasherized lookups in application code relationship macros', {
  setup() {
    run(function() {
      App = Ember.Application.create();
      App.PostNote = DS.Model.extend({
        notePost: DS.belongsTo('notePost'),
        name: DS.attr()
      });
      App.NotePost = DS.Model.extend({
        name: DS.attr()
      });
      App.LongModelName = DS.Model.extend({
        postNotes: DS.hasMany('post_note')
      });
    });
    store = App.__container__.lookup('store:main');
  },

  teardown() {
    run(App, 'destroy');
    App = null;
  }
});

test('looks up using camelCase string', function() {
  expect(1);

  run(function() {
    store.push('postNote', {
      id: 1,
      notePost: 1
    });
    store.push('notePost', {
      id: 1,
      name: 'Inverse'
    });
  });

  run(function() {
    store.find('postNote', 1).then(function(postNote) {
      equal(postNote.get('notePost'), store.getById('notePost', 1));
    });
  });
});

test('looks up using under_score string', function() {
  expect(1);

  run(function() {
    store.push('long_model_name', {
      id: 1,
      name: 'Inverse',
      postNotes: ['1']
    });
    store.push('postNote', {
      id: 1,
      name: 'Underscore'
    });
  });

  run(function() {
    store.find('long_model_name', 1).then(function(longModelName) {
      deepEqual(longModelName.get('postNotes').toArray(), [store.getById('postNote', 1)]);
    });
  });

});
