import type { TestContext } from '@ember/test-helpers';
import { render } from '@ember/test-helpers';
import Component from '@glimmer/component';

import { hbs } from 'ember-cli-htmlbars';

import type Model from '@ember-data/model';

export interface ReactiveContext {
  counters: Record<string, number | undefined>;
  fieldOrder: string[];
  reset: () => void;
}

export async function unboundReactiveContext<T extends Model>(
  context: TestContext,
  record: T,
  fields: { name: string; type: 'field' | 'hasMany' | 'belongsTo' }[]
): Promise<ReactiveContext> {
  return reactiveContext.call(context, record, fields);
}

export async function reactiveContext<T extends Model>(
  this: TestContext,
  record: T,
  fields: { name: string; type: 'field' | 'hasMany' | 'belongsTo' }[]
): Promise<ReactiveContext> {
  const _fields: string[] = [];
  fields.forEach((field) => {
    _fields.push(field.name + 'Count');
    _fields.push(field.name);
  });

  class ReactiveComponent extends Component {
    get __allFields() {
      return _fields;
    }
  }
  const counters: Record<string, number> = {};

  fields.forEach((field) => {
    counters[field.name] = 0;
    Object.defineProperty(ReactiveComponent.prototype, field.name + 'Count', {
      get() {
        return counters[field.name];
      },
    });
    Object.defineProperty(ReactiveComponent.prototype, field.name, {
      get() {
        counters[field.name]++;
        switch (field.type) {
          case 'hasMany':
            return `[${(record[field.name as keyof T] as Model[]).map((r) => r.id).join(',')}]`;
          case 'belongsTo':
            return (record[field.name as keyof T] as Model).id;
          case 'field':
            return record[field.name as keyof T] as unknown;
          default:
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            throw new Error(`Unknown field type ${field.type} for field ${field.name}`);
        }
      },
    });
  });

  this.owner.register('component:reactive-component', ReactiveComponent);
  this.owner.register(
    'template:components/reactive-component',
    hbs`<div class="reactive-context"><ul>{{#each this.__allFields as |prop|}}<li>{{prop}}: {{get this prop}}</li>{{/each}}</ul></div>`
  );

  await render(hbs`<ReactiveComponent />`);

  function reset() {
    fields.forEach((field) => {
      counters[field.name] = 0;
    });
  }

  return { counters, reset, fieldOrder: _fields };
}
