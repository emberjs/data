import 'qunit-dom'; // tell TS consider *.dom extension for assert

import { get } from '@ember/object';
import type Owner from '@ember/owner';
import { render, settled } from '@ember/test-helpers';
import Component from '@glimmer/component';

import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import type Store from '@ember-data/store';

class Tag extends Model {
  @attr('string', {})
  name;
}

class ErrorList extends Component<{ model: Model; field: string }> {
  get errors() {
    const { model, field } = this.args;
    return model.errors.errorsFor(field).map((error) => error.message);
  }

  <template>
    <ul class="error-list">
    {{#each this.errors as |error|}}
      <li class="error-list__error">{{error}}</li>
    {{/each}}
  </ul>
  </template>
}

interface CurrentTestContext {
  tag: Tag;
  owner: Owner;
}

module('integration/model.errors', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: CurrentTestContext) {
    const { owner } = this;

    owner.register('model:tag', Tag);
  });

  test('Model errors are autotracked', async function (this: CurrentTestContext, assert) {
    const tag = this.tag = (this.owner.lookup('service:store') as Store).createRecord('tag', {}) as Tag;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors: any = get(this.tag, 'errors');

    await render(
      <template>
        <ErrorList @model={{tag}} @field="name"/>
      </template>
    );

    assert.dom('.error-list__error').doesNotExist();

    errors.add('name', 'the-error');
    await settled();

    assert.dom('.error-list__error').hasText('the-error');

    errors.remove('name');
    await settled();

    assert.dom('.error-list__error').doesNotExist();
  });
});
