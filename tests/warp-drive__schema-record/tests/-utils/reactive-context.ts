import type { TestContext } from '@ember/test-helpers';
import { render } from '@ember/test-helpers';
import Component from '@glimmer/component';

import { hbs } from 'ember-cli-htmlbars';

import type { ResourceRelationship } from '@warp-drive/core-types/cache/relationship';
import type { OpaqueRecordInstance } from '@warp-drive/core-types/record';
import type { FieldSchema, IdentityField, ResourceSchema } from '@warp-drive/core-types/schema/fields';

export async function reactiveContext<T extends OpaqueRecordInstance>(
  this: TestContext,
  record: T,
  resource: ResourceSchema
) {
  const _fields: string[] = [];
  const fields: Array<FieldSchema | IdentityField> = resource.fields.slice();
  if (resource.identity?.name) {
    fields.unshift(resource.identity as IdentityField);
  }
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

        if (
          field.kind === 'attribute' ||
          field.kind === 'field' ||
          field.kind === 'derived' ||
          field.kind === 'array' ||
          field.kind === 'object' ||
          field.kind === 'schema-array' ||
          field.kind === 'schema-object' ||
          field.kind === '@id' ||
          // @ts-expect-error we secretly allow this
          field.kind === '@hash'
        ) {
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
