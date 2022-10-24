import { render, settled } from '@ember/test-helpers';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import hbs from 'htmlbars-inline-precompile';

export default async function createTrackingContext(owner, props) {
  let instance;
  let testKeys = Object.keys(props);
  class TestComponent extends Component {
    @tracked count = 1;

    constructor() {
      super(...arguments);
      instance = this;
    }

    get ___value() {
      this.count;
      return testKeys.map((key) => this[key]);
    }
  }

  let defs = {};
  testKeys.forEach((key) => (defs[key] = Object.getOwnPropertyDescriptor(props, key)));

  Object.defineProperties(TestComponent.prototype, defs);

  owner.register('component:test-component', TestComponent);
  owner.register(
    'template:components/test-component',
    hbs`<div class="test">{{this.count}}<ul>{{#each this.___value as |prop|}}<li>{{prop}}</li>{{/each}}</ul></div>`
  );

  async function initialRender() {
    await render(hbs`<TestComponent/>`);
  }

  return {
    async render() {
      if (!instance) {
        await initialRender();
        await settled();
      } else {
        instance.count++;
        await settled();
      }
    },
    instance,
  };
}
