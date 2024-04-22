# @ember-data/codemods

Codemods for EmberData paradigms.

## Usage

### List all available codemod commands

```
npx @ember-data/codemods apply --help
```

The available codemods will be listed under the "Commands" heading.

### Run a codemod

```
npx @ember-data/codemods apply <codemod-name> [codemod-options] <target-glob-pattern...>
```

For example:

```
npx @ember-data/codemods apply legacy-compat-builders ./app/**/*.{js,ts}
```

#### Codemod options

To list the available options for a particular codemod, you can run:

```
npx @ember-data/codemods apply <codemod-name> --help
```

## Codemods

### legacy-compat-builders

Updates legacy store methods to use `store.request` and `@ember-data/legacy-compat/builders` instead.

### Examples

#### `findAll`

```ts
// before
const posts = await store.findAll<Post>('post');

// after
import { findAll } from '@ember-data/legacy-compat/builders';
const { content: posts } = await store.request<Post[]>(findAll<Post>('post'));
```

#### `findRecord`

```ts
// before
const post = await store.findRecord<Post>({ type: 'post', id: '1' });

// after
import { findRecord } from '@ember-data/legacy-compat/builders';
const { content: post } = await store.request<Post>(findRecord<Post>({ type: 'post', id: '1' }));
```

NOTE: This codemod will not transform `store.findRecord` calls with a 'preload' option set. This option is not supported by the legacy compat builders.

#### `query`

```ts
// before
const posts = await store.query<Post>('post', { id: '1' });

// after
import { query } from '@ember-data/legacy-compat/builders';
const { content: posts } = await store.request<Post[]>(query<Post>('post', { id: '1' }));
```

#### `queryRecord`

```ts
// before
const post = await store.queryRecord<Post>('post', { id: '1' });

// after
import { queryRecord } from '@ember-data/legacy-compat/builders';
const { content: post } = await store.request<Post>(queryRecord<Post>('post', { id: '1' }));
```

#### `saveRecord`

```ts
// before
const post = store.createRecord<Post>('post', { name: 'Krystan rules, you drool' });
const savedPostWithGeneric = await store.saveRecord<Post>(post);
const savedPostNoGeneric = await store.saveRecord(post);

// after
import { saveRecord } from '@ember-data/legacy-compat/builders';
const post = store.createRecord<Post>('post', { name: 'Krystan rules, you drool' });
const { content: savedPostWithGeneric } = await store.request<Post>(saveRecord(post));
const { content: savedPostNoGeneric } = await store.request(saveRecord(post));
```

### Handling of `await`

Calls to legacy store methods that are not currently awaited will not be transformed. In order to provide feature parity with the legacy method, we need to access the `content` property from `Future` returned by `store.request`. In order to do this, we need to `await store.request`, but we can't safely add `await` with a codemod as we don't know if the consuming code will be able to handle the change.

## Caveats

GJS and GTS files are not currently supported. PRs welcome! 🧡

# TODO:

* [ ] Handle LegacyStoreMethodCallExpression2
* [ ] .content; only when returned? any other cases?
* [ ] Prettier errors
* [ ] Print log to file
* [ ] --dry
* [ ] --ignore globs
