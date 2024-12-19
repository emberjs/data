import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import type Store from 'ember-data/store';
import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';

class Person extends Model {
  @attr declare name: string;
}
class Employee extends Person {}

module('integration/records/polymorphic-find-record - Polymorphic findRecord', function (hooks) {
  setupTest(hooks);

  test('when findRecord with abstract type returns concrete type', async function (assert) {
    this.owner.register('model:person', Person);
    this.owner.register('model:employee', Employee);

    const store = this.owner.lookup('service:store') as Store;
    const adapter = store.adapterFor('application');

    adapter.findRecord = () => {
      return Promise.resolve({
        data: {
          id: '1',
          type: 'employee',
          attributes: {
            name: 'Rey Skybarker',
          },
        },
      });
    };

    const person = (await store.findRecord('person', '1')) as Employee;
    assert.ok(person instanceof Employee, 'record is an instance of Employee');
    assert.strictEqual(person.name, 'Rey Skybarker', 'name is correct');
    assert.strictEqual(recordIdentifierFor(person).type, 'employee', 'identifier has the concrete type');

    const employee = store.peekRecord('employee', '1');
    const person2 = store.peekRecord('person', '1');
    assert.strictEqual(employee, person, 'peekRecord returns the same instance for concrete type');
    assert.strictEqual(person2, person, 'peekRecord returns the same instance for abstract type');
    assert.strictEqual(store.identifierCache._cache.resources.size, 2, 'identifier cache contains backreferences');

    person.unloadRecord();
    await settled();
    assert.strictEqual(store.identifierCache._cache.resources.size, 0, 'identifier cache is empty');
  });
});
