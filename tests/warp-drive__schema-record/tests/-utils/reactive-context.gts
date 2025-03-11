import { get } from '@ember/helper';
import { render } from '@ember/test-helpers';
import Component from '@glimmer/component';

import type { ResourceRelationship } from '@warp-drive/core-types/cache/relationship';
import type { FieldSchema, IdentityField, ObjectSchema, ResourceSchema } from '@warp-drive/core-types/schema/fields';

type Template<T> = {
  [key in keyof T & string]?: string;
};

export async function reactiveContext<T>(record: T, resource: ResourceSchema | ObjectSchema, template?: Template<T>) {
  type Key = keyof T & string;
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
  const counters = {} as Record<Key, number>;

  fields.forEach((field) => {
    counters[field.name as Key] = 0;
    Object.defineProperty(ReactiveComponent.prototype, field.name + 'Count', {
      get() {
        return counters[field.name as Key];
      },
    });
    Object.defineProperty(ReactiveComponent.prototype, field.name, {
      get() {
        counters[field.name as Key]++;

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
        } else if (field.kind === 'belongsTo') {
          if (template && field.name in template) {
            const key = template[field.name as keyof T & string]!;
            let value = record[field.name as keyof T] as { [key: string]: string };

            if (field.options.async) {
              // @ts-expect-error promise proxy reach through
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              value = record[field.name].content as { [key: string]: string };
            }

            return value?.[key];
          } else {
            return (record[field.name as keyof T] as { id: string })?.id;
          }
        } else if (field.kind === 'hasMany') {
          if (template && field.name in template) {
            const key = template[field.name as keyof T & string]!;
            let arr = record[field.name as keyof T] as Array<{ [key: string]: string }>;

            if (field.options.async) {
              // @ts-expect-error promise proxy reach through
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              arr = record[field.name].content as Array<{ [key: string]: string }>;
            }

            return arr.map((v) => v[key]).join(', ');
          } else {
            return (record[field.name as keyof T] as { length: string })?.length;
          }
        }
      },
    });
  });

  await render(<template><ReactiveComponent /></template>);

  function reset() {
    fields.forEach((field) => {
      counters[field.name as Key] = 0;
    });
  }

  return { counters, reset, fieldOrder: _fields };
}
