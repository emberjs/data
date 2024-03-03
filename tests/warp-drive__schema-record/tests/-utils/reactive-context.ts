import type { TestContext } from '@ember/test-helpers';
import { render } from '@ember/test-helpers';
import Component from '@glimmer/component';

import { hbs } from 'ember-cli-htmlbars';

import type { OpaqueRecordInstance } from '@ember-data/store/-types/q/record-instance';
import type { FieldSchema } from '@ember-data/store/-types/q/schema-service';
import type { ResourceRelationship } from '@warp-drive/core-types/cache/relationship';

export async function reactiveContext<T extends OpaqueRecordInstance>(
  this: TestContext,
  record: T,
  fields: FieldSchema[]
) {
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

        if (field.kind === 'attribute' || field.kind === 'field' || field.kind === 'derived') {
          return record[field.name as keyof T] as unknown;
        } else if (field.kind === 'resource') {
          return (record[field.name as keyof T] as ResourceRelationship).data?.id;
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
