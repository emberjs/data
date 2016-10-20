import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import DS from 'ember-data';
import { module, test } from 'qunit';

const { run } = Ember;
const { attr, belongsTo, Model } = DS;

const Author = Model.extend({
  name: attr('string')
});

const Post = Model.extend({
  author: belongsTo()
});

let env;

module('integration/records/relationship-changes - Relationship changes', {
  beforeEach() {
    env = setupStore({
      author: Author,
      post: Post
    });
  },

  afterEach() {
    run(function() {
      env.container.destroy();
    });
  }
});

test('Calling push with updated belongsTo relationship trigger observer', function(assert) {
  assert.expect(1);

  let observerCount = 0;

  run(function() {
    let post = env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          author: {
            data: { type: 'author', id: '2' }
          }
        }
      }
    });

    post.addObserver('author', function() {
      observerCount++;
    });

    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          author: {
            data: { type: 'author', id: '3' }
          }
        }
      }
    });
  });

  assert.equal(observerCount, 1, 'author observer should be triggered once');
});

test('Calling push with same belongsTo relationship does not trigger observer', function(assert) {
  assert.expect(1);

  let observerCount = 0;

  run(function() {
    let post = env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          author: {
            data: { type: 'author', id: '2' }
          }
        }
      }
    });

    post.addObserver('author', function() {
      observerCount++;
    });

    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          author: {
            data: { type: 'author', id: '2' }
          }
        }
      }
    });
  });

  assert.equal(observerCount, 0, 'author observer should not be triggered');
});
