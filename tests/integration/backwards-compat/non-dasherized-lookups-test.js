import { run } from '@ember/runloop';
import { get } from '@ember/object';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

const {
  JSONAPIAdapter,
  JSONAPISerializer,
  Model,
  attr,
  belongsTo,
  hasMany
} = DS;

let store;

module('integration/backwards-compat/non-dasherized-lookups - non dasherized lookups in application code finders', {
  beforeEach() {
    const PostNote = Model.extend({
      name: attr('string')
    });

    const env = setupStore({ postNote: PostNote });

    const ApplicationAdapter = JSONAPIAdapter.extend({
      shouldBackgroundReloadRecord() {
        return false;
      }
    });

    env.registry.register('adapter:application', ApplicationAdapter);
    env.registry.register('serializer:application', JSONAPISerializer);

    store = env.store;
  },

  afterEach() {
    run(store, 'destroy');
  }
});

test('can lookup records using camelCase strings', function(assert) {
  assert.expect(1);

  run(() => {
    store.pushPayload('post-note', {
      data: {
        type: 'post-notes',
        id: '1',
        attributes: {
          name: 'Ember Data'
        }
      }
    });
  });

  run(() => {
    store.findRecord('postNote', 1).then((postNote) => {
      assert.equal(get(postNote, 'name'), 'Ember Data', 'record found');
    });
  });
});

test('can lookup records using under_scored strings', function(assert) {
  assert.expect(1);

  run(() => {
    store.pushPayload('post-note', {
      data: {
        type: 'post-notes',
        id: '1',
        attributes: {
          name: 'Ember Data'
        }
      }
    });
  });

  run(() => {
    store.findRecord('post_note', 1).then((postNote) => {
      assert.equal(get(postNote, 'name'), 'Ember Data', 'record found');
    });
  });
});

module('integration/backwards-compat/non-dasherized-lookups - non dasherized lookups in application code relationship macros', {
  beforeEach() {
    const PostNote = Model.extend({
      notePost: belongsTo('note-post', { async: false }),

      name: attr('string')
    });

    const NotePost = Model.extend({
      name: attr('string')
    });

    const LongModelName = Model.extend({
      postNotes: hasMany('post_note')
    });

    const env = setupStore({
      longModelName: LongModelName,
      notePost: NotePost,
      postNote: PostNote
    });

    const ApplicationAdapter = JSONAPIAdapter.extend({
      shouldBackgroundReloadRecord() {
        return false;
      }
    });

    env.registry.register('adapter:application', ApplicationAdapter);
    env.registry.register('serializer:application', JSONAPISerializer);

    store = env.store;
  },

  afterEach() {
    run(store, 'destroy');
  }
});

test('looks up belongsTo using camelCase strings', function(assert) {
  assert.expect(1);

  run(() => {
    store.pushPayload('post-note', {
      data: {
        type: 'post-notes',
        id: '1',
        attributes: {
          name: 'Ember Data'
        },
        relationships: {
          'note-post': {
            data: { type: 'note-post', id: '1' }
          }
        }
      }
    });
    store.pushPayload('notePost', {
      data: {
        type: 'note-posts',
        id: '1',
        attributes: {
          name: 'Inverse'
        }
      }
    });
  });

  run(() => {
    store.findRecord('post-note', 1).then((postNote) => {
      assert.equal(get(postNote, 'notePost.name'), 'Inverse', 'inverse record found');
    });
  });
});

test('looks up belongsTo using under_scored strings', function(assert) {
  assert.expect(1);

  run(() => {
    store.pushPayload('long_model_name', {
      data: {
        type: 'long-model-names',
        id: '1',
        attributes: {
        },
        relationships: {
          'post-notes': {
            data: [{ type: 'post-note', id: '1' }]
          }
        }
      }
    });

    store.pushPayload('post-note', {
      data: {
        type: 'post-notes',
        id: '1',
        attributes: {
          name: 'Ember Data'
        }
      }
    });
  });

  run(() => {
    store.findRecord('long_model_name', 1).then((longModelName) => {
      const postNotes = get(longModelName, 'postNotes').toArray();

      assert.deepEqual(postNotes, [store.peekRecord('postNote', 1)],
        'inverse records found');
    });
  });
});
