import { setupTest } from 'ember-qunit';
import { module, test } from 'ember-qunit';
import { recordIdentifierFor } from 'ember-data/-private';
import { belongsTo, hasMany } from '@ember-decorators/data';
import Model from 'ember-data/model';
import { relationshipStateFor } from 'ember-data/-private';

module('RelationshipGraphLater - It Works', function(hooks) {
  setupTest(hooks);

  test('We can create one', async function(assert) {
    let store = this.owner.lookup('service:store');

    class User extends Model {
      @hasMany('book', { async: false })
      books;
    }
    class Book extends Model {
      @belongsTo('user', { async: false })
      user;
    }
    this.owner.register('model:user', User);
    this.owner.register('model:book', Book);

    let identifier = recordIdentifierFor(store, { type: 'user', id: null, lid: '1' });
    let state = relationshipStateFor(store, identifier, 'books');
    debugger;
  });
});
