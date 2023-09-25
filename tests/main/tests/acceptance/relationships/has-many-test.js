import ArrayProxy from '@ember/array/proxy';
import { action } from '@ember/object';
import { sort } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { click, find, findAll, render, rerender, setupOnerror } from '@ember/test-helpers';
import Component from '@glimmer/component';

import QUnit, { module, test } from 'qunit';

import { hbs } from 'ember-cli-htmlbars';
import { render as legacyRender } from 'ember-data/test-support';
import { setupRenderingTest } from 'ember-qunit';

import { ServerError } from '@ember-data/adapter/error';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { LEGACY_SUPPORT } from '@ember-data/model/-private';
import JSONAPISerializer from '@ember-data/serializer/json-api';

class Person extends Model {
  @attr()
  name;
  @hasMany('person', { async: true, inverse: 'parent' })
  children;
  @belongsTo('person', { async: true, inverse: 'children' })
  parent;
}

class TestAdapter extends JSONAPIAdapter {
  setupPayloads(assert, arr) {
    this.assert = assert;
    this._payloads = arr;
  }

  shouldBackgroundReloadRecord() {
    return false;
  }

  pause() {
    this.isPaused = true;
    this.pausePromise = new Promise((resolve) => {
      this._resume = resolve;
    });
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this._resume();
    }
  }

  _nextPayload() {
    if (this.isPaused) {
      return this.pausePromise.then(() => this._nextPayload());
    }
    let payload = this._payloads.shift();

    if (payload === undefined) {
      this.assert.ok(false, 'Too many adapter requests have been made!');
      return Promise.resolve({ data: null });
    }

    if (payload instanceof ServerError) {
      return Promise.reject(payload);
    }
    return Promise.resolve(payload);
  }

  // find by link
  findHasMany() {
    return this._nextPayload();
  }

  // find by data with coalesceFindRequests set to true
  findMany() {
    return this._nextPayload();
  }

  // find by partial data / individual records
  findRecord() {
    return this._nextPayload();
  }
}

function makePeopleWithRelationshipData() {
  let people = [
    {
      type: 'person',
      id: '1:no-children-or-parent',
      attributes: { name: 'Chris Has No Children or Parent' },
      relationships: {
        children: { data: [] },
        parent: { data: null },
      },
    },
    {
      type: 'person',
      id: '2:has-1-child-no-parent',
      attributes: {
        name: 'James has one child and no parent',
      },
      relationships: {
        children: {
          data: [{ type: 'person', id: '3:has-2-children-and-parent' }],
        },
        parent: { data: null },
      },
    },
    {
      type: 'person',
      id: '3:has-2-children-and-parent',
      attributes: {
        name: 'Kevin has two children and one parent',
      },
      relationships: {
        children: {
          data: [
            { type: 'person', id: '4:has-parent-no-children' },
            { type: 'person', id: '5:has-parent-no-children' },
          ],
        },
        parent: {
          data: {
            type: 'person',
            id: '2:has-1-child-no-parent',
          },
        },
      },
    },
    {
      type: 'person',
      id: '4:has-parent-no-children',
      attributes: {
        name: 'Selena has a parent',
      },
      relationships: {
        children: {
          data: [],
        },
        parent: {
          data: {
            type: 'person',
            id: '3:has-2-children-and-parent',
          },
        },
      },
    },
    {
      type: 'person',
      id: '5:has-parent-no-children',
      attributes: {
        name: 'Sedona has a parent',
      },
      relationships: {
        children: {
          data: [],
        },
        parent: {
          data: {
            type: 'person',
            id: '3:has-2-children-and-parent',
          },
        },
      },
    },
  ];

  let peopleHash = {};
  people.forEach((person) => {
    peopleHash[person.id] = person;
  });

  return {
    dict: peopleHash,
    all: people,
  };
}

function makePeopleWithRelationshipLinks(removeData = true) {
  let people = makePeopleWithRelationshipData();
  let linkPayloads = (people.links = {});

  people.all.map((person) => {
    Object.keys(person.relationships).forEach((relName) => {
      let rel = person.relationships[relName];
      let data = rel.data;

      if (removeData === true) {
        delete rel.data;
      }

      if (Array.isArray(data)) {
        data = data.map((ref) => people.dict[ref.id]);
      } else {
        if (data !== null) {
          data = people.dict[data.id];
        }
      }

      rel.links = {
        related: `./${person.type}/${person.id}/${relName}`,
      };
      linkPayloads[rel.links.related] = {
        data,
      };
    });
  });

  return people;
}

module('async has-many rendering tests', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;
    owner.register('model:person', Person);
    owner.register('adapter:application', TestAdapter);
    owner.register('serializer:application', JSONAPISerializer);
  });

  module('for data-no-link scenarios', function () {
    test('We can render an async hasMany', async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');
      let people = makePeopleWithRelationshipData();
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [
        { data: people.dict['4:has-parent-no-children'] },
        { data: people.dict['5:has-parent-no-children'] },
      ]);

      // render
      this.set('parent', parent);

      await legacyRender(hbs`
        <ul>
        {{#each this.parent.children as |child|}}
          <li>{{child.name}}</li>
        {{/each}}
        </ul>
      `);

      let names = findAll('li').map((e) => e.textContent);

      assert.deepEqual(names, ['Selena has a parent', 'Sedona has a parent'], 'We rendered the names');
    });

    test('Re-rendering an async hasMany does not cause a new fetch', async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');
      let people = makePeopleWithRelationshipData();
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [
        { data: people.dict['4:has-parent-no-children'] },
        { data: people.dict['5:has-parent-no-children'] },
      ]);

      // render
      this.set('parent', parent);

      await legacyRender(hbs`
        <ul>
        {{#each this.parent.children as |child|}}
          <li>{{child.name}}</li>
        {{/each}}
        </ul>
      `);

      let items = findAll('li');
      let names = items.map((e) => e.textContent);

      assert.deepEqual(names, ['Selena has a parent', 'Sedona has a parent'], 'We rendered the names');

      this.set('parent', null);

      items = findAll('li');
      assert.strictEqual(items.length, 0, 'We have no items');

      this.set('parent', parent);

      names = findAll('li').map((e) => e.textContent);

      assert.deepEqual(names, ['Selena has a parent', 'Sedona has a parent'], 'We rendered the names');
    });

    test('Rendering an async hasMany whose fetch fails does not trigger a new request', async function (assert) {
      const store = this.owner.lookup('service:store');
      const people = makePeopleWithRelationshipData();
      const parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });
      let hasFired = false;

      class TestAdapter {
        static create() {
          return new this();
        }

        shouldReloadRecord() {
          return false;
        }

        shouldBackgroundReloadRecord() {
          return false;
        }

        findRecord(_store, schema, id) {
          assert.step(`findRecord ${schema.modelName} ${id}`);

          if (id === '4:has-parent-no-children') {
            return Promise.resolve({ data: people.dict['4:has-parent-no-children'] });
          }
          if (hasFired) {
            assert.ok(false, 'We only reject a single time');
            // prevent further recursive calls
            return Promise.resolve({ data: people.dict['5:has-parent-no-children'] });
          }
          return Promise.reject(new Error('hard error while finding <person>5:has-parent-no-children'));
        }
      }
      this.owner.register('adapter:application', TestAdapter);

      // render
      this.set('parent', parent);

      // This function handles any unhandled promise rejections
      const globalPromiseRejectionHandler = (event) => {
        assert.step('unhandledrejection');
        if (!hasFired) {
          hasFired = true;
          assert.ok(true, 'Children promise did reject');
          assert.strictEqual(
            event.reason.message,
            'hard error while finding <person>5:has-parent-no-children',
            'Rejection has the correct message'
          );
        } else {
          assert.ok(false, 'We only reject a single time');
          // adapter.pause(); // prevent further recursive calls to load the relationship
        }
        event.preventDefault();
        return false;
      };

      // Here we assign our handler to the corresponding global, window property
      window.addEventListener('unhandledrejection', globalPromiseRejectionHandler, true);
      const onUncaughtException = QUnit.onUncaughtException;
      QUnit.onUncaughtException = function (error) {
        assert.step('onUncaughtException');
        assert.strictEqual(error.message, 'hard error while finding <person>5:has-parent-no-children');
        if (error.message !== 'hard error while finding <person>5:has-parent-no-children') {
          onUncaughtException.call(this, error);
        }
      };

      await render(hbs`
        <ul>
        {{#each this.parent.children as |child|}}
          <li>{{child.name}}</li>
        {{/each}}
        </ul>
      `);

      const names = findAll('li').map((e) => e.textContent);

      assert.deepEqual(names, ['Selena has a parent'], 'We rendered only the names for successful requests');

      const relationshipState = parent.hasMany('children').hasManyRelationship;
      const RelationshipPromiseCache = LEGACY_SUPPORT.get(parent)._relationshipPromisesCache;
      const RelationshipProxyCache = LEGACY_SUPPORT.get(parent)._relationshipProxyCache;

      assert.true(relationshipState.definition.isAsync, 'The relationship is async');
      assert.false(relationshipState.state.isEmpty, 'The relationship is not empty');
      assert.true(relationshipState.state.hasDematerializedInverse, 'The relationship has a dematerialized inverse');
      assert.true(relationshipState.state.hasReceivedData, 'The relationship knows which record it needs');
      assert.false(!!RelationshipPromiseCache['children'], 'The relationship has no fetch promise');
      assert.true(relationshipState.state.hasFailedLoadAttempt, 'The relationship has attempted a load');
      assert.true(!!RelationshipProxyCache['children'], 'The relationship has a promise proxy');
      assert.false(!!relationshipState.link, 'The relationship does not have a link');

      await rerender();

      assert.verifySteps([
        'findRecord person 4:has-parent-no-children',
        'findRecord person 5:has-parent-no-children',
        'onUncaughtException',
        'unhandledrejection',
      ]);

      window.removeEventListener('unhandledrejection', globalPromiseRejectionHandler, true);
      QUnit.onUncaughtException = onUncaughtException;
    });
  });

  module('for link-no-data scenarios', function () {
    test('We can render an async hasMany with a link', async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');
      let people = makePeopleWithRelationshipLinks(true);
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [people.links['./person/3:has-2-children-and-parent/children']]);

      // render
      this.set('parent', parent);

      await render(hbs`
      <ul>
      {{#each this.parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let names = findAll('li').map((e) => e.textContent);

      assert.deepEqual(names, ['Selena has a parent', 'Sedona has a parent'], 'We rendered the names');
    });

    test('Re-rendering an async hasMany with a link does not cause a new fetch', async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');
      let people = makePeopleWithRelationshipLinks(true);
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [people.links['./person/3:has-2-children-and-parent/children']]);

      // render
      this.set('parent', parent);

      await render(hbs`
      <ul>
      {{#each this.parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let items = findAll('li');
      let names = items.map((e) => e.textContent);

      assert.deepEqual(names, ['Selena has a parent', 'Sedona has a parent'], 'We rendered the names');

      this.set('parent', null);

      items = findAll('li');
      assert.strictEqual(items.length, 0, 'We have no items');

      this.set('parent', parent);

      names = findAll('li').map((e) => e.textContent);

      assert.deepEqual(names, ['Selena has a parent', 'Sedona has a parent'], 'We rendered the names');
    });

    test('Rendering an async hasMany with a link whose fetch fails does not trigger a new request', async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');
      assert.expect(11);
      let people = makePeopleWithRelationshipLinks(true);
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [people.links['./person/3:has-2-children-and-parent/children']]);

      adapter.setupPayloads(assert, [
        new ServerError([], 'hard error while finding link ./person/3:has-2-children-and-parent/children'),
      ]);

      // render
      this.set('parent', parent);

      let hasFired = false;
      // This function handles any unhandled promise rejections
      const globalPromiseRejectionHandler = (event) => {
        if (!hasFired) {
          hasFired = true;
          assert.ok(true, 'Children promise did reject');
          assert.strictEqual(
            event.reason.message,
            'hard error while finding link ./person/3:has-2-children-and-parent/children',
            'Rejection has the correct message'
          );
        } else {
          assert.ok(false, 'We only reject a single time');
          adapter.pause(); // prevent further recursive calls to load the relationship
        }
        event.preventDefault();
        return false;
      };

      // Here we assign our handler to the corresponding global, window property
      window.addEventListener('unhandledrejection', globalPromiseRejectionHandler, true);
      let originalPushResult = assert.pushResult;
      assert.pushResult = function (result) {
        if (
          result.result === false &&
          result.message ===
            'global failure: Error: hard error while finding link ./person/3:has-2-children-and-parent/children'
        ) {
          return;
        }
        return originalPushResult.call(this, result);
      };

      await render(hbs`
      <ul>
      {{#each this.parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let names = findAll('li').map((e) => e.textContent);

      assert.deepEqual(names, [], 'We rendered no names');

      let relationshipState = parent.hasMany('children').hasManyRelationship;
      let RelationshipPromiseCache = LEGACY_SUPPORT.get(parent)._relationshipPromisesCache;
      let RelationshipProxyCache = LEGACY_SUPPORT.get(parent)._relationshipProxyCache;

      assert.true(relationshipState.definition.isAsync, 'The relationship is async');
      assert.true(
        relationshipState.state.isEmpty,
        'The relationship is empty because no signal has been received as to true state'
      );
      assert.true(relationshipState.state.isStale, 'The relationship is still stale');
      assert.false(relationshipState.state.hasReceivedData, 'The relationship knows which record it needs');
      assert.false(!!RelationshipPromiseCache['children'], 'The relationship has no fetch promise');
      assert.true(!!RelationshipProxyCache['children'], 'The relationship has a promise proxy');
      assert.true(relationshipState.state.hasFailedLoadAttempt, 'The relationship has attempted a load');
      assert.true(!!(relationshipState.links && relationshipState.links.related), 'The relationship has a link');

      window.removeEventListener('unhandledrejection', globalPromiseRejectionHandler, true);
      assert.pushResult = originalPushResult;
    });
  });

  module('for link-and-data scenarios', function () {
    test('We can render an async hasMany with a link and data', async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');
      let people = makePeopleWithRelationshipLinks(false);
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [people.links['./person/3:has-2-children-and-parent/children']]);

      // render
      this.set('parent', parent);

      await render(hbs`
      <ul>
      {{#each this.parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let names = findAll('li').map((e) => e.textContent);

      assert.deepEqual(names, ['Selena has a parent', 'Sedona has a parent'], 'We rendered the names');
    });

    test('Rendering an async hasMany with a link and data where data has been side-loaded does not fetch the link', async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');
      let people = makePeopleWithRelationshipLinks(false);
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
        included: [people.dict['4:has-parent-no-children'], people.dict['5:has-parent-no-children']],
      });

      // no requests should be made
      adapter.setupPayloads(assert, []);

      // render
      this.set('parent', parent);

      await render(hbs`
      <ul>
      {{#each this.parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let names = findAll('li').map((e) => e.textContent);

      assert.deepEqual(names, ['Selena has a parent', 'Sedona has a parent'], 'We rendered the names');
    });

    test('Re-rendering an async hasMany with a link and data does not cause a new fetch', async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');
      let people = makePeopleWithRelationshipLinks(false);
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [people.links['./person/3:has-2-children-and-parent/children']]);

      // render
      this.set('parent', parent);

      await render(hbs`
      <ul>
      {{#each this.parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let items = findAll('li');
      let names = items.map((e) => e.textContent);

      assert.deepEqual(names, ['Selena has a parent', 'Sedona has a parent'], 'We rendered the names');

      this.set('parent', null);

      items = findAll('li');
      assert.strictEqual(items.length, 0, 'We have no items');

      this.set('parent', parent);

      names = findAll('li').map((e) => e.textContent);

      assert.deepEqual(names, ['Selena has a parent', 'Sedona has a parent'], 'We rendered the names');
    });
  });
});

module('autotracking through ArrayProxy', function (hooks) {
  setupRenderingTest(hooks);

  test('We can (re)render an async HasMany', async function (assert) {
    class Person extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'author' })
      comments;
      @hasMany('post', { async: false, inverse: null })
      posts;
    }
    class Comment extends Model {
      @attr text;
      @belongsTo('person', { async: false, inverse: 'comment' })
      author;
    }
    class Post extends Model {
      @attr title;
    }
    const { owner } = this;
    owner.register('model:person', Person);
    owner.register('model:comment', Comment);
    owner.register('model:post', Post);
    const store = owner.lookup('service:store');

    const chris = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: { name: 'Chris' },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
            ],
          },
          posts: {
            data: [
              { type: 'post', id: '1' },
              { type: 'post', id: '2' },
              { type: 'post', id: '3' },
            ],
          },
        },
      },
      included: [
        {
          type: 'comment',
          id: '1',
          attributes: { text: 'first!' },
        },
        {
          type: 'comment',
          id: '2',
          attributes: { text: 'second!' },
        },
        {
          type: 'comment',
          id: '3',
          attributes: { text: 'third!' },
        },
        {
          type: 'post',
          id: '1',
          attributes: { title: 'how to comment well' },
        },
        {
          type: 'post',
          id: '2',
          attributes: { title: 'effective commentary' },
        },
        {
          type: 'post',
          id: '3',
          attributes: { title: 'comment documentation' },
        },
      ],
    });
    class PersonOverview extends Component {
      _proxy = null;
      get proxiedPosts() {
        if (this._proxy === null) {
          this._proxy = ArrayProxy.create({
            content: this.args.person.posts,
          });
        }
        return this._proxy;
      }
      willDestroy() {
        this._proxy.destroy();
      }
    }
    const layout = hbs`
      <h2 id="comments-count">Comments ({{@person.comments.length}})</h2>
      <ul id="comments">
        {{#each @person.comments as |comment|}}
          <li>{{comment.text}}</li>
        {{/each}}
      </ul>
      <h2 id="posts-count">Posts ({{@person.posts.length}})</h2>
      <ul id="posts">
        {{#each @person.posts as |post|}}
          <li>{{post.title}}</li>
        {{/each}}
      </ul>
      <h2 id="proxied-posts-count">Proxied Posts ({{this.proxiedPosts.length}})</h2>
      <ul id="proxied-posts">
        {{#each this.proxiedPosts as |post|}}
          <li>{{post.title}}</li>
        {{/each}}
      </ul>
    `;
    owner.register('component:person-overview', PersonOverview);
    owner.register('template:components/person-overview', layout);
    this.set('person', chris);
    await render(hbs`<PersonOverview @person={{this.person}} />`);
    assert.strictEqual(find('#comments-count').textContent, 'Comments (3)', 'We have the right comments count');
    assert.deepEqual(
      findAll('#comments li').map((e) => e.textContent),
      ['first!', 'second!', 'third!'],
      'We have rendered the comments'
    );
    assert.strictEqual(find('#posts-count').textContent, 'Posts (3)', 'We have the right posts count');
    assert.deepEqual(
      findAll('#posts li').map((e) => e.textContent),
      ['how to comment well', 'effective commentary', 'comment documentation'],
      'We have rendered the posts'
    );
    assert.strictEqual(
      find('#proxied-posts-count').textContent,
      'Proxied Posts (3)',
      'We have the right proxied posts count'
    );
    assert.deepEqual(
      findAll('#proxied-posts li').map((e) => e.textContent),
      ['how to comment well', 'effective commentary', 'comment documentation'],
      'We have rendered the proxied posts'
    );
  });
});

module('autotracking has-many', function (hooks) {
  setupRenderingTest(hooks);

  let store;

  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('model:person', Person);
    owner.register('adapter:application', TestAdapter);
    owner.register('serializer:application', JSONAPISerializer);
    store = owner.lookup('service:store');
  });

  test('We can re-render a simple array', async function (assert) {
    class ChildrenList extends Component {
      @service store;

      get children() {
        return this.args.model.children;
      }

      get sortedChildren() {
        return this.children.slice().sort((a, b) => (a.name > b.name ? 1 : -1));
      }

      @action
      createChild() {
        const parent = this.args.model.person;
        const name = 'RGB';
        this.store.createRecord('person', { name, parent });
      }
    }

    let layout = hbs`
      <button id="createChild" {{on "click" this.createChild}}>Add child</button>

      <h2>{{this.sortedChildren.length}}</h2>
      <ul>
        {{#each this.sortedChildren as |child|}}
          <li>{{child.name}}</li>
        {{/each}}
      </ul>
    `;
    this.owner.register('component:children-list', ChildrenList);
    this.owner.register('template:components/children-list', layout);

    store.createRecord('person', { id: '1', name: 'Doodad' });
    let person = store.peekRecord('person', '1');
    let children = await person.children;
    this.model = { person, children };

    await render(hbs`<ChildrenList @model={{this.model}} />`);

    let names = findAll('li').map((e) => e.textContent);

    assert.deepEqual(names, [], 'rendered no children');

    await click('#createChild');

    names = findAll('li').map((e) => e.textContent);
    assert.deepEqual(names, ['RGB'], 'rendered 1 child');

    await click('#createChild');

    names = findAll('li').map((e) => e.textContent);
    assert.deepEqual(names, ['RGB', 'RGB'], 'rendered 2 children');
  });

  test('We can re-render hasMany', async function (assert) {
    class ChildrenList extends Component {
      @service store;

      @action
      createChild() {
        const parent = this.args.person;
        const name = 'RGB';
        this.store.createRecord('person', { name, parent });
      }
    }

    let layout = hbs`
      <button id="createChild" {{on "click" this.createChild}}>Add child</button>

      <h2>{{@person.children.length}}</h2>
      <ul>
        {{#each @person.children as |child|}}
          <li>{{child.name}}</li>
        {{/each}}
      </ul>
    `;
    this.owner.register('component:children-list', ChildrenList);
    this.owner.register('template:components/children-list', layout);

    store.createRecord('person', { id: '1', name: 'Doodad' });
    this.person = store.peekRecord('person', '1');

    await render(hbs`<ChildrenList @person={{this.person}} />`);

    let names = findAll('li').map((e) => e.textContent);

    assert.deepEqual(names, [], 'rendered no children');

    await click('#createChild');

    names = findAll('li').map((e) => e.textContent);
    assert.deepEqual(names, ['RGB'], 'rendered 1 child');

    await click('#createChild');

    names = findAll('li').map((e) => e.textContent);
    assert.deepEqual(names, ['RGB', 'RGB'], 'rendered 2 children');
  });

  test('We can re-render hasMany with sort computed macro', async function (assert) {
    class ChildrenList extends Component {
      @service store;

      sortProperties = ['name'];
      @sort('args.children', 'sortProperties') sortedChildren;

      @action
      createChild() {
        const parent = this.args.person;
        const name = 'RGB';
        this.store.createRecord('person', { name, parent });
      }
    }

    let layout = hbs`
      <button id="createChild" {{on "click" this.createChild}}>Add child</button>

      <h2>{{this.sortedChildren.length}}</h2>
      <ul>
        {{#each this.sortedChildren as |child|}}
          <li>{{child.name}}</li>
        {{/each}}
      </ul>
    `;
    this.owner.register('component:children-list', ChildrenList);
    this.owner.register('template:components/children-list', layout);

    store.createRecord('person', { id: '1', name: 'Doodad' });
    this.person = store.peekRecord('person', '1');
    this.children = await this.person.children;

    await render(hbs`<ChildrenList @children={{this.children}} @person={{this.person}} />`);

    let names = findAll('li').map((e) => e.textContent);

    assert.deepEqual(names, [], 'rendered no children');

    await click('#createChild');

    names = findAll('li').map((e) => e.textContent);
    assert.deepEqual(names, ['RGB'], 'rendered 1 child');

    await click('#createChild');

    names = findAll('li').map((e) => e.textContent);
    assert.deepEqual(names, ['RGB', 'RGB'], 'rendered 2 children');
  });

  test('We can re-render hasMany with objectAt', async function (assert) {
    class ChildrenList extends Component {
      @service store;

      get firstChild() {
        return this.args.children.at(0);
      }

      @action
      createChild() {
        const parent = this.args.person;
        const name = 'RGB';
        this.store.createRecord('person', { name, parent });
      }
    }

    let layout = hbs`
      <button id="createChild" {{on "click" this.createChild}}>Add child</button>

      <h2>{{this.firstChild.name}}</h2>
    `;
    this.owner.register('component:children-list', ChildrenList);
    this.owner.register('template:components/children-list', layout);

    store.createRecord('person', { id: '1', name: 'Doodad' });
    this.person = store.peekRecord('person', '1');
    this.children = await this.person.children;

    await render(hbs`<ChildrenList @children={{this.children}} @person={{this.person}} />`);

    assert.dom('h2').hasText('', 'rendered no children');

    await click('#createChild');

    assert.dom('h2').hasText('RGB', 'renders first child');

    await click('#createChild');

    assert.dom('h2').hasText('RGB', 'renders first child');
  });

  test('We can re-render hasMany with native map', async function (assert) {
    class ChildrenList extends Component {
      @service store;

      get children() {
        return this.args.children.map((child) => child);
      }

      @action
      createChild() {
        const parent = this.args.person;
        const name = 'RGB';
        this.store.createRecord('person', { name, parent });
      }
    }

    let layout = hbs`
      <button id="createChild" {{on "click" this.createChild}}>Add child</button>

      <h2>{{this.children.length}}</h2>
      <ul>
        {{#each this.children as |child|}}
          <li>{{child.name}}</li>
        {{/each}}
      </ul>
    `;
    this.owner.register('component:children-list', ChildrenList);
    this.owner.register('template:components/children-list', layout);

    store.createRecord('person', { id: '1', name: 'Doodad' });
    this.person = store.peekRecord('person', '1');
    this.children = await this.person.children;

    await render(hbs`<ChildrenList @children={{this.children}} @person={{this.person}} />`);

    let names = findAll('li').map((e) => e.textContent);

    assert.deepEqual(names, [], 'rendered no children');

    await click('#createChild');

    names = findAll('li').map((e) => e.textContent);
    assert.deepEqual(names, ['RGB'], 'rendered 1 child');

    await click('#createChild');

    names = findAll('li').map((e) => e.textContent);
    assert.deepEqual(names, ['RGB', 'RGB'], 'rendered 2 children');
  });

  test('We can re-render hasMany with toArray', async function (assert) {
    class ChildrenList extends Component {
      @service store;

      get children() {
        return this.args.children.slice();
      }

      @action
      createChild() {
        const parent = this.args.person;
        const name = 'RGB';
        this.store.createRecord('person', { name, parent });
      }
    }

    let layout = hbs`
      <button id="createChild" {{on "click" this.createChild}}>Add child</button>

      <h2>{{this.children.length}}</h2>
      <ul>
        {{#each this.children as |child|}}
          <li>{{child.name}}</li>
        {{/each}}
      </ul>
    `;
    this.owner.register('component:children-list', ChildrenList);
    this.owner.register('template:components/children-list', layout);

    store.createRecord('person', { id: '1', name: 'Doodad' });
    this.person = store.peekRecord('person', '1');
    this.children = await this.person.children;

    await render(hbs`<ChildrenList @children={{this.children}} @person={{this.person}} />`);

    let names = findAll('li').map((e) => e.textContent);

    assert.deepEqual(names, [], 'rendered no children');

    await click('#createChild');

    names = findAll('li').map((e) => e.textContent);
    assert.deepEqual(names, ['RGB'], 'rendered 1 child');

    await click('#createChild');

    names = findAll('li').map((e) => e.textContent);
    assert.deepEqual(names, ['RGB', 'RGB'], 'rendered 2 children');
  });

  test('We can re-render hasMany with filter after deleting a record', async function (assert) {
    this.owner.register(
      'model:person',
      class extends Model {
        @attr name;
        @hasMany('person', { async: false, inverse: 'parent' })
        children;
        @belongsTo('person', { async: false, inverse: 'children' })
        parent;
      }
    );
    class ChildrenList extends Component {
      @service store;

      get children() {
        return this.args.children.filter((x) => !x.isDeleted);
      }

      @action
      createChild() {
        const parent = this.args.person;
        const name = 'RGB';
        this.store.createRecord('person', { name, parent });
      }

      @action
      deleteChild(child) {
        child.deleteRecord();
      }
    }

    let layout = hbs`
      <button id="createChild" {{on "click" this.createChild}}>Add child</button>

      <h2>{{this.children.length}}</h2>
      <ul>
        {{#each this.children as |child|}}
          <li><span>{{child.name}}</span><button class="delete-child" {{on "click" (fn this.deleteChild child)}}>X</button></li>
        {{/each}}
      </ul>
    `;
    this.owner.register('component:children-list', ChildrenList);
    this.owner.register('template:components/children-list', layout);

    this.person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: { name: 'Doodad' },
      },
    });
    this.children = await this.person.children;

    await render(hbs`<ChildrenList @children={{this.children}} @person={{this.person}} />`);

    let names = findAll('li > span').map((e) => e.textContent);

    assert.deepEqual(names, [], 'rendered no children');

    store.push({
      data: {
        type: 'person',
        id: '2',
        attributes: { name: 'Rey' },
        relationships: {
          parent: { data: { id: '1', type: 'person' } },
        },
      },
    });
    await rerender();

    names = findAll('li > span').map((e) => e.textContent);
    assert.deepEqual(names, ['Rey'], 'rendered one child');

    await click('#createChild');

    names = findAll('li > span').map((e) => e.textContent);
    assert.deepEqual(names, ['Rey', 'RGB'], 'rendered 1 existing and 1 created child');

    await click('#createChild');

    names = findAll('li > span').map((e) => e.textContent);
    assert.deepEqual(names, ['Rey', 'RGB', 'RGB'], 'rendered 1 existing and 2 created children');

    await click(find('.delete-child'));

    names = findAll('li > span').map((e) => e.textContent);
    assert.deepEqual(names, ['RGB', 'RGB'], 'rendered 2 created children after deleting existing');

    await click(find('.delete-child'));

    names = findAll('li > span').map((e) => e.textContent);
    assert.deepEqual(names, ['RGB'], 'rendered 1 created children after deleting existing');
  });

  test('We can re-render hasMany with peekAll', async function (assert) {
    class PeopleList extends Component {
      @service store;

      constructor() {
        super(...arguments);

        this.model = { people: this.store.peekAll('person') };
      }

      get allPeople() {
        return this.model.people.map((child) => child);
      }

      @action
      createPerson() {
        const name = 'RGB';
        this.store.createRecord('person', { name });
      }
    }

    let layout = hbs`
      <button id="createPerson" {{on "click" this.createPerson}}>Add person</button>

      <h2>{{this.allPeople.length}}</h2>
      <ul>
        {{#each this.allPeople as |person|}}
          <li>{{person.name}}</li>
        {{/each}}
      </ul>
    `;
    this.owner.register('component:people-list', PeopleList);
    this.owner.register('template:components/people-list', layout);

    store.createRecord('person', { id: '1', name: 'Doodad' });

    await render(hbs`<PeopleList />`);

    let names = findAll('li').map((e) => e.textContent);

    assert.deepEqual(names, ['Doodad'], 'rendered 1 person');

    await click('#createPerson');

    names = findAll('li').map((e) => e.textContent);
    assert.deepEqual(names, ['Doodad', 'RGB'], 'rendered 2 people');

    await click('#createPerson');

    names = findAll('li').map((e) => e.textContent);
    assert.deepEqual(names, ['Doodad', 'RGB', 'RGB'], 'rendered 3 people');
  });
});
