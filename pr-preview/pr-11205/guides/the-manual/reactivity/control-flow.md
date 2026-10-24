---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/guides/the-manual/reactivity/control-flow.md
description: >-
  Render request states declaratively with the Request component or
  getRequestState in Ember and React, handling loading, error, and retry without
  imperative async/await.
---

# Reactive Control Flow

***Warp*Drive** offers both a JavaScript API and a Component API for working with
requests. Both APIs offer a clean way of working with asynchronous data via reactive
values and states instead of needing to switch into imperative code or async/await. This
approach enables enables automatic cleanup when components dismount, unlocking [Intelligent Lifecycle Management]()

:::tabs

\== Component API

With the component API, any builder function can be used to produce the query
the `<Request />` component should make.

::: code-group

```glimmer-ts:line-numbers [Ember]
import { Request } from '@warp-drive/ember';
import { findRecord } from '@warp-drive/utilities/json-api';
import { Spinner } from './spinner';

export default <template>
  <Request @query={{findRecord "user" @userId}}> <!-- [!code focus:4] -->
    <:content as |result|>
      Hello {{result.data.name}}!
    </:content>

    <:loading><Spinner /></:loading>

    <:error as |error state|>
      <div>
        <p>Error: {{error.message}}</p>
        <p><button onClick={{state.retry}}>Try Again?</button></p>
      </div>
    </:error>
  </Request> <!-- [!code focus] -->
</template>
```

```tsx:line-numbers [React]
import { Request } from '@warp-drive/ember';
import { findRecord } from '@warp-drive/utilities/json-api';
import { Spinner } from './spinner';

export function UserPreview($props) {
  return <Request // [!code focus:2]
    query={findRecord('user', $props.userId)} 
    states={{
      content: ({ result, features }) => (  // [!code focus:3]
        <>Hello {{result.data.name}}!</>
      ),
      loading: () => <Spinner />,
      error: ({ error, features }) => (
        <div>
          <p>Error: {error.message}</p>
          <p><button onClick={features.retry}>Try Again?</button></p>
        </div>
      ),
    }}
  />  // [!code focus]
}
```

```.svelte [Svelte]
Coming Soon!
```

```.vue [Vue]
Coming Soon!
```

\== JS API

With the JS API, getters and methods can declaratively compute off of
the state of the request.

::: code-group

```glimmer-ts:line-numbers [Ember]
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import { service } from '@ember/service';

import { getRequestState } from '@warp-drive/ember'; // [!code focus]
import { findRecord } from '@warp-drive/utilities/json-api';

import type Store from '#/services/store.ts';

export default class Example extends Component { // [!code focus]
  @service declare store: Store;

  @cached
  get userRequest() {
    return this.store.request( // [!code focus:3]
      findRecord("user", this.args.userId)
    );
  }

  get user() {
    return getRequestState(this.userRequest).value?.data; // [!code focus]
  }

  <template>
    {{#if this.user}}
        Hello {{this.user.name}}! <!-- [!code focus] -->
    {{/if}}
  </template>
} // [!code focus]
```

```tsx:line-numbers [React]
import { useMemo } from 'react';
import { useStore, ReactiveContext } from '@warp-drive/react';
import { findRecord } from '@warp-drive/utilities/json-api';

import { getRequestState } from '@warp-drive/core/reactive';

function ReactiveExample($props) {
  const store = useStore();
  const request = useMemo(
    () => store.request(
      findRecord("user", $props.userId)
    ),
    [store, $props.userId]
  );

  const state = getRequestState(request).value?.data;

  return state ? <>Hello {state.name}!</> : '';
}

export function Example($props) {
  return (
    <ReactiveContext>
      <ReactiveExample ...$props />
    </ReactiveContext>
  );
}
```

```.svelte [Svelte]
Coming Soon!
```

```.vue [Vue]
Coming Soon!
```

\== Combined

The Component API and the JS API interop seamlessly. Requests
triggered by the JS API can be passed into the `<Request />` component
as args.

::: code-group

```glimmer-ts [Ember]
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import { service } from '@ember/service';

import { Request } from '@warp-drive/ember'; // [!code focus]
import { findRecord } from '@warp-drive/utilities/json-api';

import type Store from '#/services/store.ts';

export default class Example extends Component { // [!code focus]
  @service declare store: Store;

  @cached
  get userRequest() { // [!code focus:5]
    return this.store.request( 
      findRecord("user", this.args.userId)
    );
  }

  <template>
    <Request @request={{this.userRequest}}> <!-- [!code focus] -->
      <:content as |result|>  <!-- [!code focus] -->
        Hello {{result.data.name}}!
      </:content> <!-- [!code focus] -->
    </Request> <!-- [!code focus] -->
  </template>
}
```

```.vue [Vue]
Coming Soon!
```

```.svelte [Svelte]
Coming Soon!
```

:::
