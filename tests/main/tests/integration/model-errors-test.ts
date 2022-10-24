import 'qunit-dom'; // tell TS consider *.dom extension for assert

// @ts-ignore
import { setComponentTemplate } from '@ember/component';
import { get } from '@ember/object';
import { render, settled } from '@ember/test-helpers';
import Component from '@glimmer/component';

import { module, test } from 'qunit';

import { hbs } from 'ember-cli-htmlbars';
import { setupRenderingTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';

class Tag extends Model {
  @attr('string', {})
  name;
}

class ErrorList extends Component<{ model: Model; field: string }> {
  get errors() {
    const { model, field } = this.args;
    return model.errors.errorsFor(field).map((error) => error.message);
  }
}

const template = hbs`
  <ul class="error-list">
    {{#each this.errors as |error|}}
      <li class="error-list__error">{{error}}</li>
    {{/each}}
  </ul>
`;

interface CurrentTestContext {
  tag: Tag;
  owner: any;
}

module('integration/model.errors', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: CurrentTestContext) {
    let { owner } = this;

    owner.register('model:tag', Tag);
    owner.register('component:error-list', setComponentTemplate(template, ErrorList));
  });

  test('Model errors are autotracked', async function (this: CurrentTestContext, assert) {
    this.tag = this.owner.lookup('service:store').createRecord('tag');
    const errors: any = get(this.tag, 'errors');

    await render(hbs`<ErrorList @model={{this.tag}} @field="name"/>`);

    assert.dom('.error-list__error').doesNotExist();

    errors.add('name', 'the-error');
    await settled();

    assert.dom('.error-list__error').hasText('the-error');

    errors.remove('name');
    await settled();

    assert.dom('.error-list__error').doesNotExist();
  });
});
