import { module, test } from 'qunit';

import { mockServer, setup, visit } from 'ember-cli-fastboot-testing/test-support';

const people = [
  {
    id: '1:no-children-or-parent',
    name: 'Chris Has No Children or Parent',
    children: [],
    parent: null,
  },
  {
    id: '2:has-1-child-no-parent',
    name: 'James has one child and no parent',
    children: ['3:has-2-children-and-parent'],
    parent: null,
  },
  {
    id: '3:has-2-children-and-parent',
    name: 'Kevin has two children and one parent',
    children: ['4:has-parent-no-children', '5:has-parent-no-children'],
    parent: '2:has-1-child-no-parent',
  },
  {
    id: '4:has-parent-no-children',
    name: 'Selena has a parent',
    children: [],
    parent: '3:has-2-children-and-parent',
  },
  {
    id: '5:has-parent-no-children',
    name: 'Sedona has a parent',
    children: [],
    parent: '3:has-2-children-and-parent',
  },
];

module('FastBoot | index', function (hooks) {
  setup(hooks);

  test('it renders a page...', async function (assert) {
    await mockServer.get('/api/people', people);
    await visit('/');

    assert.dom('h1').hasText('Ember Data');
    assert.dom('a').hasAttribute('href', '/tests');

    assert.dom('ul').exists();
    assert.dom('ul>li').isVisible({ count: 5 });
    assert.dom('.tree-branch').isVisible({ count: 3 });
    assert.dom('.tree-children').isVisible({ count: 2 });
  });
});
