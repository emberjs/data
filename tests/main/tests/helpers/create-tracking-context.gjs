import { render, settled } from '@ember/test-helpers';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

// eslint-disable-next-line @typescript-eslint/require-await
export default async function createTrackingContext(props) {
  let instance;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const testKeys = Object.keys(props);
  class TestComponent extends Component {
    @tracked count = 1;

    constructor() {
      super(...arguments);
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      instance = this;
    }

    get ___value() {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      this.count;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return testKeys.map((key) => this[key]);
    }

    <template>
      <div class="test">{{this.count}}<ul>{{#each this.___value as |prop|}}<li>{{prop}}</li>{{/each}}</ul></div>
    </template>
  }

  const defs = {};
  testKeys.forEach((key) => (defs[key] = Object.getOwnPropertyDescriptor(props, key)));

  Object.defineProperties(TestComponent.prototype, defs);

  async function initialRender() {
    await render(<template><TestComponent /></template>);
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
