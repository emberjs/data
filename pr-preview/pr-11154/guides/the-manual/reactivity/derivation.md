---
url: /pr-preview/pr-11154/guides/the-manual/reactivity/derivation.md
---

# Async as Reactive State

The instinct when working with promises is to await them and store the result. In reactive systems this usually means a cluster of tracked properties: one for the value, one for loading state, one for errors.

WarpDrive offers a simpler model: **store the promise, derive its state**. `getPromiseState` reactively tracks where any promise is in its lifecycle — pending, fulfilled, or rejected — and makes that state available to the render layer.

## Reading Data

Here's a component that loads a user profile using the traditional approach:

```gts:line-numbers [Traditional Approach]
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

interface User { name: string; email: string }

export default class UserProfile extends Component<{
  Args: { userId: string }
}> {
  @tracked user: User | null = null;
  @tracked isLoading = true;
  @tracked loadError: Error | null = null;

  constructor(owner: unknown, args: { userId: string }) {
    super(owner, args);
    void this.loadUser();
  }

  async loadUser() {
    this.isLoading = true;
    this.loadError = null;
    try {
      const r = await fetch(`/api/users/${this.args.userId}`);
      this.user = await r.json();
    } catch (e) {
      this.loadError = e as Error;
    } finally {
      this.isLoading = false;
    }
  }

  <template>
    {{#if this.isLoading}}
      <p>Loading...</p>
    {{else if this.loadError}}
      <p class="error">{{this.loadError.message}}</p>
    {{else}}
      <h1>{{this.user.name}}</h1>
      <p>{{this.user.email}}</p>
    {{/if}}
  </template>
}
```

This works for the initial render, but has structural problems. `loadUser` is called once in the constructor — if `args.userId` changes, the component won't reload. If `loadUser` is called again to handle that, the old and new fetches race: whichever `.finally` runs last wins. If the component is torn down mid-fetch, setting tracked properties on a destroyed object causes errors.

Rewriting with async derivation:

```gts:line-numbers [Recommended Approach]
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import { getPromiseState } from '@warp-drive/ember';

interface User { name: string; email: string }

export default class UserProfile extends Component<{
  Args: { userId: string }
}> {
  @cached get userPromise(): Promise<User> {
    return fetch(`/api/users/${this.args.userId}`)
      .then(r => r.json());
  }

  get userState() {
    return getPromiseState(this.userPromise);
  }

  <template>
    {{#if this.userState.isPending}}
      <p>Loading...</p>
    {{else if this.userState.isError}}
      <p class="error">{{this.userState.reason.message}}</p>
    {{else}}
      <h1>{{this.userState.value.name}}</h1>
      <p>{{this.userState.value.email}}</p>
    {{/if}}
  </template>
}
```

`@cached` memoizes `userPromise` — it only re-evaluates when its reactive dependencies change. Since `this.args.userId` is reactive, a new fetch fires automatically whenever the ID changes, and `getPromiseState` tracks the new promise. When the component is torn down mid-request, there is nothing to clean up — the promise resolves harmlessly in the background.

## Mutating Data

The same pattern applies to writes. A save form written the traditional way must manually orchestrate several states:

```gts:line-numbers [Traditional Approach]
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';

export default class UserQuickEdit extends Component<{
  Args: { username: string }
}> {
  @tracked username: string = this.args.username;
  @tracked isSaving = false;
  @tracked saveError: Error | null = null;

  saveForm = (e: Event) => {
    e.preventDefault();
    if (this.isSaving) return;

    this.isSaving = true;
    void fetch('/api/username/', {
      method: 'POST',
      body: JSON.stringify({ username: this.username }),
    })
      .then(r => r.json())
      .then(() => { this.saveError = null; })
      .catch(e => { this.saveError = e; })
      .finally(() => { this.isSaving = false; });
  }

  updateUsername = (e: InputEvent) => {
    this.username = e.target.value;
  };

  <template>
    <form {{on "submit" this.saveForm}}>
      <label>
        Username
        <input type="text" value={{this.username}} {{on "input" this.updateUsername}} />
      </label>
      {{#if this.saveError}}
        <p class="error">{{this.saveError.message}}</p>
      {{/if}}
      <button type="submit" disabled={{this.isSaving}}>
        {{if this.isSaving 'Saving...' 'Save'}}
      </button>
    </form>
  </template>
}
```

Rewritten with async derivation:

```gts:line-numbers [Recommended Approach]
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';
import { getPromiseState } from '@warp-drive/ember';

export default class UserQuickEdit extends Component<{
  Args: { username: string }
}> {
  @tracked username: string = this.args.username;
  @tracked savePromise: Promise<unknown> | null = null;

  get saveState() {
    return this.savePromise ? getPromiseState(this.savePromise) : null;
  }

  saveForm = (e: Event) => {
    e.preventDefault();
    if (this.saveState?.isPending) return;

    this.savePromise = fetch('/api/username/', {
      method: 'POST',
      body: JSON.stringify({ username: this.username }),
    }).then(r => r.json());
  }

  updateUsername = (e: InputEvent) => {
    this.username = e.target.value;
  };

  <template>
    <form {{on "submit" this.saveForm}}>
      <label>
        Username
        <input type="text" value={{this.username}} {{on "input" this.updateUsername}} />
      </label>
      {{#if this.saveState.isError}}
        <p class="error">{{this.saveState.reason.message}}</p>
      {{/if}}
      <button type="submit" disabled={{this.saveState.isPending}}>
        {{if this.saveState.isPending 'Saving...' 'Save'}}
      </button>
    </form>
  </template>
}
```

The component now owns two pieces of state: the current username and the most recent save promise. Everything else — pending, error, success — is derived. If the user submits again after an error, `savePromise` is replaced with a new promise and the component automatically renders its state instead.

## Passing Promises as Args

Because promises are plain values, they compose naturally as component arguments. Rather than resolving async state at the data source and passing results down, pass the promise itself and resolve state where you render:

```gts:line-numbers [Parent]
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import UserProfile from './user-profile';
import type { User } from '#data/user';

export default class UserPage extends Component<{
  Args: { userId: string }
}> {
  @cached get userPromise(): Promise<User> {
    return fetch(`/api/users/${this.args.userId}`)
      .then(r => r.json());
  }

  <template>
    <UserProfile @user={{this.userPromise}} />
  </template>
}
```

```gts:line-numbers [UserProfile]
import type { TOC } from '@ember/component/template-only';
import { Await } from '@warp-drive/ember';
import type { User } from '#data/user';

const UserProfile: TOC<{ Args: { user: Promise<User> } }> = <template>
  <Await @promise={{@user}}>
    <:pending>
      <p>Loading...</p>
    </:pending>
    <:error as |error|>
      <p class="error">{{error.message}}</p>
    </:error>
    <:success as |user|>
      <h1>{{user.name}}</h1>
      <p>{{user.email}}</p>
    </:success>
  </Await>
</template>

export default UserProfile;
```

The parent owns the fetch and controls when it re-fires. The child has no JavaScript at all — it declares what to render for each state and lets `<Await>` handle the rest. The same component works whether the data loads instantly from cache or takes seconds over a slow connection.

This is the pattern to reach for across WarpDrive: **pass promises, resolve state where you render**. We call this [**`Reactive Control Flow`**](./control-flow.md).
