# eslint-plugin-warp-drive

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `no-create-record-rerender` | 🐞⚡️ | ✅ |

> [!Note]
> This rule helps applications avoid patterns that often lead to excess or broken renders.

`store.createRecord` creates a record available to
the application as a whole. For instance: say we create a new `'user'` and add it to the `friends` relationship of `user:2`. When we do this, two distinct
changes are immediately observable to the entirety of
the application:

- the list of all users is updated (notifying the addition to the LiveArray used by `peekAll` and `findAll`)
- the membership of the `friends` array is immediately updated.

If these updates occur *during* a render, one of several outcomes might occur:

- parts of the screen might show an incorrect state
- the whole screen might re-render immediately once the current render completes (this is known as a backtracking re-render)
- an error might be thrown due to a backtracking re-render being detected

For this reason, the rule restricts `createRecord` from being used inside constructors, getters, or class properties as these typically compute their value during a render.

Instead, applications should create new records while responding to a user interaction or from within routing hooks, prior to the application initiating a render.

### Incorrect Code

```gjs
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';

class MyForm extends Component {
  @service store;
  // ERROR: Cannot call `store.createRecord` in a class property initializer.
  // Calling `store.createRecord` inside constructors, getters, and class
  // properties can cause issues with re-renders.
  model = this.store.createRecord('user');

  <template>
		{{!-- Some Template !--}}
	</template>
}

export default ParentComponent extends Component {
  @tracked isShowingForm = false;

  @action rerenderWithForm() {
    this.isShowingForm = true;
  }

	<template>
		{{#if this.isShowingForm}}
			<MyForm />
		{{/if}}
		<button type="button" {{on "click" this.rerenderWithForm}}>Show the form</button>
	</template>
}
```

### Correct Code

```gjs
// app/components/parent-component.gts
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';

class MyForm extends Component {
  <template>
		{{!-- Some Template !--}}
	</template>
}

export default class ParentComponent extends Component {
  @tracked isShowingForm = false;

  rerenderForm = () => {
    this.model = this.store.createRecord('user');
    this.isShowingForm = true;
  }

	<template>
		{{#if this.isShowingForm}}
			<MyForm @model={{this.model}} />
		{{/if}}
		<button type="button" {{on "click" this.rerenderForm}}>Show the child component</button>
	</template>
}
```

### In a Pinch

In cases where refactoring to creating a new record in model hooks or while responding to user interactions is impractical, a cached promise pattern may be used.

Note however, this approach effectively *intentionally embraces*
the two-render approach, but in a way in which each render can be
performed safely.

```ts
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import { getPromiseState } from '@warp-drive/ember';
import { service } from '@ember/service';

async function createUser() {
  // we must await something asynchronous
  // before creating the record to ensure
  // we are not part of the current render anymore
  await Promise.resolve();
  return store.createRecord('user', {});
}

class CreateUser extends Component {
  @service store;

  // by memoizing this promise, we ensure it is stable
  // (doesn't recompute each time we access it)
  @cached
  get newUserPromise() {
    return createUser(this.store);
  }

  @cached
  get user() {
    const state = getPromiseState(this.newUserPromise);
    return state.result ?? null;
  }

  <template>{{this.user.name}}</template>
}
```
