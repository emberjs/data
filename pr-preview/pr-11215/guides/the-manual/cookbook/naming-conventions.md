---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/guides/the-manual/cookbook/naming-conventions.md
description: >-
  Decide whether resource types should be singular or plural and dasherized or
  snake_case, and keep that one `type` string the same across API responses,
  ResourceSchemas, relationship fields and request builders.
---

# Resource Type Naming: singular or plural? What to choose? Why is that?

* ⮐ [Cookbook](./index.md)

Every resource in ***Warp*Drive** has a type: the `type` string that identifies it in API
responses, in its [ResourceSchema](../schemas/resources/index.md), in the relationship fields
that point to it and in the requests that fetch it. ***Warp*Drive** has no rule about what that
string looks like. It can be singular or plural, dasherized or snake\_case. It only has to be the
same string everywhere.

## Why older apps use singular, dasherized types

The legacy serializers in `@warp-drive/legacy` singularize and dasherize every `type` they
receive, so apps that use them end up with types like `user-setting` no matter what the API
sends.

Without those serializers, ***Warp*Drive** uses the `type` your API sends as-is, and normalizing
it is up to you.

## So what to choose?

Whatever your API already sends. You can choose singular or plural names, but it is usually best
to let the backend decide and treat the type as part of your app's API contract, rather than
renaming every type on the frontend. Whichever you choose, stick with it. **Be Consistent!**

## What does consistency look like?

### Let's say your convention is singular dasherized, e.g. `user-setting`

* The API responds with `"type": "user-setting"`, or a [handler](../requests/handlers.md)
  normalizes the type to that.

* The [ResourceSchema](/api/@warp-drive/core/types/schema/fields/types/ResourceSchema)'s `type` and every relationship field's `type` that points to it use the
  same string:

  ```ts [schemas/user.ts]
  import { withDefaults } from '@warp-drive/legacy/model/migration-support';

  export const UserSettingSchema = withDefaults({
    type: 'user-setting',
    fields: [{ kind: 'attribute', name: 'value' }],
  });

  export const UserSchema = withDefaults({
    type: 'user',
    fields: [
      {
        kind: 'hasMany',
        name: 'userSettings',
        type: 'user-setting',
        options: { async: false, inverse: null },
      },
    ],
  });

  // wherever you configure the store
  store.schema.registerResources([UserSchema, UserSettingSchema]);
  ```

* Requests made with a [request builder](../requests/builders.md) use it too:

  ```ts
  import { findRecord } from '@warp-drive/utilities/json-api';

  const { content } = await store.request(findRecord('user-setting', '1'));
  ```

### But what about plural and snake case?

The same places use `user_settings` instead:

* The API responds with `"type": "user_settings"`.

* The schema and the relationship field use it:

  ```ts
  export const UserSettingSchema = withDefaults({
    type: 'user_settings',
    fields: [{ kind: 'attribute', name: 'value' }],
  });

  // in UserSchema's fields
  {
    kind: 'hasMany',
    name: 'userSettings',
    type: 'user_settings',
    options: { async: false, inverse: null },
  }
  ```

* So do requests:

  ```ts
  const { content } = await store.request(findRecord('user_settings', '1'));
  ```

The example schemas use [LegacyMode](../schemas/resources/legacy-mode.md), which despite its name
is the recommended mode today. The resource type rules are the same in [PolarisMode](../schemas/resources/polaris-mode.md)
and for apps still defining [`Model`](/api/@warp-drive/legacy/model/classes/Model) classes.

:::tip 💡 The type and the URL are separate
The [`findRecord`](/api/@warp-drive/utilities/json-api/functions/findRecord) builder from
`@warp-drive/utilities/json-api` builds the URL path by pluralizing the type you pass. If your
endpoint uses a different path, keep the type as it is and pass the `resourcePath` option to
`findRecord` instead.
:::

## But what about the JSON:API spec?

The JSON:API spec is agnostic about how `type` is named. Here is the quote from the spec:

> Note: This spec is agnostic about inflection rules, so the value of `type` can be either plural or singular. However, the same value should be used consistently throughout an implementation.

You can read more about it in the [JSON:API spec](https://jsonapi.org/format/#document-resource-object-identification).

***

* ⮐ [Cookbook](./index.md)
