import { get } from '@ember/helper';
import type { TestContext } from '@ember/test-helpers';
import { render } from '@ember/test-helpers';
import Component from '@glimmer/component';

import type Model from '@ember-data/model';
import type { FieldSchema, IdentityField, ObjectSchema, ResourceSchema } from '@warp-drive/core-types/schema/fields';

export interface ReactiveContext {
  counters: Record<string, number | undefined>;
  fieldOrder: string[];
  reset: () => void;
}

export async function reactiveContext<T extends Model>(
  this: TestContext,
  record: T,
  resource: ResourceSchema | ObjectSchema
): Promise<ReactiveContext> {
  const _fields: string[] = [];
  const fields: Array<FieldSchema | IdentityField> = resource.fields.slice();
  if (resource.identity?.name) {
    fields.unshift(resource.identity as IdentityField);
  }
  fields.forEach((field) => {
    _fields.push(field.name + 'Count');
    _fields.push(field.name);
  });

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ReactiveComponent extends Record<string, string> {}
  class ReactiveComponent extends Component {
    get __allFields() {
      return _fields as unknown as string;
    }

    <template>
      <div class="reactive-context">
        <ul>
          {{#each this.__allFields as |prop|}}
            <li>{{prop}}: {{get this prop}}</li>
          {{/each}}
        </ul>
      </div>
    </template>
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
        switch (field.kind) {
          case 'hasMany':
            return `[${(record[field.name as keyof T] as Model[]).map((r) => r.id).join(',')}]`;
          case 'belongsTo':
            return (record[field.name as keyof T] as Model).id;
          case 'field':
            return record[field.name as keyof T] as unknown;
          case '@id':
            return record[field.name as keyof T] as unknown;
          default:
            throw new Error(`Unknown field kind ${field.kind} for field ${field.name}`);
        }
      },
    });
  });

  await render(<template><ReactiveComponent /></template>);

  function reset() {
    fields.forEach((field) => {
      counters[field.name] = 0;
    });
  }

  return { counters, reset, fieldOrder: _fields };
}
