import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { graphFor } from '@ember-data/graph/-private';
import Model, { attr, belongsTo } from '@ember-data/model';
import Store, { recordIdentifierFor } from '@ember-data/store';

module('Integration | Graph | Implicit Keys', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;
    owner.register('service:store', Store);
  });

  test('Non-polymorphic records do not trigger polymorphic assertions when they share the same key with another record', async function (assert) {
    const { owner } = this;
    class User extends Model {
      @attr name;
      @belongsTo('organization', { async: false, inverse: null }) organization;
    }
    class Product extends Model {
      @attr name;
      @belongsTo('organization', { async: false, inverse: null }) organization;
    }
    class Organization extends Model {
      @attr name;
    }
    owner.register('model:user', User);
    owner.register('model:product', Product);
    owner.register('model:organization', Organization);

    const store = owner.lookup('service:store') as Store;
    const graph = graphFor(store);
    let user, product, organization;

    assert.expectNoAssertion(() => {
      [user, product, organization] = store.push({
        data: [
          {
            type: 'user',
            id: '1',
            attributes: { name: 'Chris' },
            relationships: {
              organization: { data: { type: 'organization', id: '1 ' } },
            },
          },
          {
            type: 'product',
            id: '1',
            attributes: { name: 'Awesome Relationships' },
            relationships: {
              organization: { data: { type: 'organization', id: '1 ' } },
            },
          },
          {
            type: 'organization',
            id: '1',
            attributes: { name: 'Ember.js' },
          },
        ],
      });
    });

    const userIdentifier = recordIdentifierFor(user);
    const productIdentifier = recordIdentifierFor(product);
    const organizationIdentifier = recordIdentifierFor(organization);

    const userOrg = graph.get(userIdentifier, 'organization');
    const userImpl = graph.get(organizationIdentifier, userOrg.definition.inverseKey);
    const productOrg = graph.get(productIdentifier, 'organization');
    const productImpl = graph.get(organizationIdentifier, productOrg.definition.inverseKey);

    assert.notStrictEqual(userImpl, productImpl, 'We have separate implicit caches');
  });
});
