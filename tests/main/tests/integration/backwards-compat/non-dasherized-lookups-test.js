import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module(
  'integration/backwards-compat/non-dasherized-lookups - non dasherized lookups in application code finders',
  function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      const PostNote = Model.extend({
        name: attr('string'),
      });

      const ApplicationAdapter = JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord() {
          return false;
        },
      });

      this.owner.register('model:post-note', PostNote);
      this.owner.register('adapter:application', ApplicationAdapter);
      this.owner.register('serializer:application', class extends JSONAPISerializer {});
    });

    test('can lookup records using camelCase strings', function (assert) {
      assert.expect(1);

      let store = this.owner.lookup('service:store');

      run(() => {
        store.pushPayload('post-note', {
          data: {
            type: 'post-notes',
            id: '1',
            attributes: {
              name: 'Ember Data',
            },
          },
        });
      });

      run(() => {
        store.findRecord('postNote', 1).then((postNote) => {
          assert.strictEqual(get(postNote, 'name'), 'Ember Data', 'record found');
        });
      });
    });

    test('can lookup records using under_scored strings', function (assert) {
      assert.expect(1);

      let store = this.owner.lookup('service:store');

      run(() => {
        store.pushPayload('post-note', {
          data: {
            type: 'post-notes',
            id: '1',
            attributes: {
              name: 'Ember Data',
            },
          },
        });
      });

      run(() => {
        store.findRecord('post_note', 1).then((postNote) => {
          assert.strictEqual(get(postNote, 'name'), 'Ember Data', 'record found');
        });
      });
    });
  }
);

module(
  'integration/backwards-compat/non-dasherized-lookups - non dasherized lookups in application code relationship macros',
  function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      const PostNote = Model.extend({
        notePost: belongsTo('note-post', { async: false, inverse: null }),

        name: attr('string'),
      });

      const NotePost = Model.extend({
        name: attr('string'),
      });

      const LongModelName = Model.extend({
        postNotes: hasMany('post_note', { async: true, inverse: null }),
      });

      const ApplicationAdapter = JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord() {
          return false;
        },
      });

      this.owner.register('model:long-model-name', LongModelName);
      this.owner.register('model:note-post', NotePost);
      this.owner.register('model:post-note', PostNote);
      this.owner.register('adapter:application', ApplicationAdapter);
      this.owner.register('serializer:application', class extends JSONAPISerializer {});
    });

    test('looks up belongsTo using camelCase strings', function (assert) {
      assert.expect(1);

      let store = this.owner.lookup('service:store');

      run(() => {
        store.pushPayload('post-note', {
          data: {
            type: 'post-notes',
            id: '1',
            attributes: {
              name: 'Ember Data',
            },
            relationships: {
              'note-post': {
                data: { type: 'note-post', id: '1' },
              },
            },
          },
        });
        store.pushPayload('notePost', {
          data: {
            type: 'note-posts',
            id: '1',
            attributes: {
              name: 'Inverse',
            },
          },
        });
      });

      run(() => {
        store.findRecord('post-note', 1).then((postNote) => {
          assert.strictEqual(get(postNote, 'notePost.name'), 'Inverse', 'inverse record found');
        });
      });
    });

    test('looks up belongsTo using under_scored strings', async function (assert) {
      assert.expect(1);

      let store = this.owner.lookup('service:store');

      run(() => {
        store.pushPayload('long_model_name', {
          data: {
            type: 'long-model-names',
            id: '1',
            attributes: {},
            relationships: {
              'post-notes': {
                data: [{ type: 'post-note', id: '1' }],
              },
            },
          },
        });

        store.pushPayload('post-note', {
          data: {
            type: 'post-notes',
            id: '1',
            attributes: {
              name: 'Ember Data',
            },
          },
        });
      });

      const longModel = await store.findRecord('long_model_name', '1');
      const postNotesRel = await longModel.postNotes;
      const postNotes = postNotesRel.slice();

      assert.deepEqual(postNotes, [store.peekRecord('postNote', 1)], 'inverse records found');
    });
  }
);
