# Reactive Control Flow

:::warning **✨ Pardon Our Stardust! ✨**
🚧 This section is still in spacedock for construction 🚧 
:::

### Treating Promises & Futures as First Class Values

You might be tempted to `await` futures and promises. Don't.


### Deriving From Promises and Requests

Instead of awaiting promises or futures, ***Warp*Drive** enables reactively deriving
from their state. In the examples below, we memoize the promise or future instead of
memoizing it's result. This allows us to treat async as reactive state machines.

For instance, say our component displays some additional information like a total users online count. This data isn't important to the overall function of the component, but is
expensive to query. We can load it separately, using derived state to update the rendered output once the result is available.

:::tabs

== Promises

::: code-group

```glimmer-ts:line-numbers [Ember]
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';

import { getPromiseState } from '@warp-drive/core/reactive';

import { Flags } from '#/dev-flags';

async function getUsersOnlineCount(channel: string) {
  // if your flags service is reactive
  // this will re-run if the flag changes
  if (Flags.isEnabled('user-online-count')) {
    const response = fetch(`/users/stats/online?channel=${channel}`);
    return await response.json();
  }
}

export default class ChannelListItem extends Component {
  @cached // we memoize the promise call
  get onlineUsersPromise() {
    // since args are reactive, this will re-run
    // if we switch channels
    return getUsersOnlineCount(this.args.channel);
  }

  // we don't need to memoize onlineUsers as `getPromiseState`
  // already memoizes based on the promise reference
  // and we should only memoize only expensive derivations
  get onlineUsers() {
    const state = getPromiseState(this.onlineUsersPromise);

    if (!state.isSuccess || typeof state.value !== 'number')
      return '';

    return `${state.value} online`;
  }

  <template>
    <li>{{@channel}} {{this.onlineUsers}}<li>
  </template>
}

```

```tsx:line-numbers [React]
**✨ Pardon Our Stardust!**

This section is still in spacedock for construction.
```

```svelte [Svelte]
**✨ Pardon Our Stardust!**

This section is still in spacedock for construction.
```

```vue [Vue]
**✨ Pardon Our Stardust!**

This section is still in spacedock for construction.
```

== Requests

::: code-group

```glimmer-ts:line-numbers [Ember]
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import { service } from '@ember/service';

import { getRequestState } from '@warp-drive/core/reactive'; // [!code focus]
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
**✨ Pardon Our Stardust!**

This section is still in spacedock for construction.
```

```svelte [Svelte]
**✨ Pardon Our Stardust!**

This section is still in spacedock for construction.
```

```vue [Vue]
**✨ Pardon Our Stardust!**

This section is still in spacedock for construction.
```

:::

