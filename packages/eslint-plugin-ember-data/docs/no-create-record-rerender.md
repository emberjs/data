# eslint-plugin-warp-drive

## no-create-record-rerender

Helps avoid patterns that often lead to excess or broken renders.

## Don't use `createRecord` inside constructors, getters, or class properties

Calling `createRecord` in these places can cause unexpected re-renders and may blow up in EmberData 4.12+.

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
