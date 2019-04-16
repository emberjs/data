import { resolve } from 'rsvp';
import { run } from '@ember/runloop';
import { deprecatedTest } from 'dummy/tests/helpers/deprecated-test';
import setupStore from 'dummy/tests/helpers/store';

import { module } from 'qunit';

import DS from 'ember-data';

let Person, env;
const { attr } = DS;

module('integration/lifecycle_hooks - Lifecycle Hooks', function(hooks) {
  hooks.beforeEach(function() {
    Person = DS.Model.extend({
      name: attr('string'),
    });

    env = setupStore({
      person: Person,
    });
  });

  hooks.afterEach(function() {
    run(env.container, 'destroy');
  });

  deprecatedTest(
    'When the adapter acknowledges that a record has been created, a `didCreate` event is triggered.',
    {
      id: 'ember-evented',
      until: '3.12',
    },
    function(assert) {
      let done = assert.async();
      assert.expect(3);

      env.adapter.createRecord = function(store, type, snapshot) {
        return resolve({ data: { id: 99, type: 'person', attributes: { name: 'Yehuda Katz' } } });
      };

      let person = env.store.createRecord('person', { name: 'Yehuda Katz' });

      person.on('didCreate', function() {
        assert.equal(this, person, 'this is bound to the record');
        assert.equal(this.get('id'), '99', 'the ID has been assigned');
        assert.equal(this.get('name'), 'Yehuda Katz', 'the attribute has been assigned');
        done();
      });

      run(person, 'save');
    }
  );

  deprecatedTest(
    'When the adapter acknowledges that a record has been created without a new data payload, a `didCreate` event is triggered.',
    {
      id: 'ember-evented',
      until: '3.12',
    },
    function(assert) {
      assert.expect(3);

      env.adapter.createRecord = function(store, type, snapshot) {
        return resolve();
      };

      let person = env.store.createRecord('person', { id: 99, name: 'Yehuda Katz' });

      person.on('didCreate', function() {
        assert.equal(this, person, 'this is bound to the record');
        assert.equal(this.get('id'), '99', 'the ID has been assigned');
        assert.equal(this.get('name'), 'Yehuda Katz', 'the attribute has been assigned');
      });

      run(person, 'save');
    }
  );
});
