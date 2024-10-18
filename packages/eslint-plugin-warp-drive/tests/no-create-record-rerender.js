// @ts-nocheck
const rule = require('../src/rules/no-create-record-rerender');
const RuleTester = require('eslint').RuleTester;

const eslintTester = new RuleTester({
  languageOptions: {
    parser: require('@babel/eslint-parser'),
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: {
      requireConfigFile: false,
      babelOptions: {
        babelrc: false,
        configFile: false,
        plugins: [[require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }]],
      },
    },
  },
});

eslintTester.run('no-create-record-rerender', rule, {
  valid: [
    {
      code: `
		    export default class MyComponent extends Component {
		      @service store;
		      @action newThing() {
		        this.newThing = this.store.createRecord('thing');
		      }
		    }
		  `,
    },
    {
      code: `
				export default class MyComponent extends Component {
					@service store;
					newThing = () => {
						this.store.createRecord('thing');
					}
				}
		  `,
    },
    {
      code: `
		    export default class MyComponent extends Component {
		      @service store;
		      constructor() {
		        this.makeModel = () => this.store.createRecord('thing');
		      }
		    }
		  `,
    },
    {
      code: `
		    export default Component.extend({
					store: service(),
		      init() {
		        this.makeModel = () => this.store.createRecord('thing');
		      }
		    })
		  `,
    },
    {
      code: `
				const pojo = {
					model: this.store.createRecord('thing')
				};
			`,
    },
    {
      code: `
				const pojo = {
					init() {
						this.model = this.store.createRecord('thing');
					}
				};
			`,
    },
  ],
  invalid: [
    {
      code: `
		    export default class MyComponent extends Component {
		      @service store;
		      constructor() {
		        this.model = this.store.createRecord('thing');
		      }
		    }
		  `,
      errors: [
        'Cannot call `store.createRecord` in a constructor. Calling `store.createRecord` inside constructors, getters, and class properties can cause issues with re-renders.',
      ],
    },
    {
      code: `
		    export default class MyComponent extends Component {
		      @service store;
		      get myModel() {
		        return this.store.createRecord('thing');
		      }
		    }
		  `,
      errors: [
        'Cannot call `store.createRecord` in a getter. Calling `store.createRecord` inside constructors, getters, and class properties can cause issues with re-renders.',
      ],
    },
    {
      code: `
        export default class MyComponent extends Component {
          @service store;
          model = this.store.createRecord('thing');
        }
      `,
      errors: [
        'Cannot call `store.createRecord` in a class property initializer. Calling `store.createRecord` inside constructors, getters, and class properties can cause issues with re-renders.',
      ],
    },
    {
      code: `
		    export default Component.extend({
					store: service(),
		      init() {
		        this.model = this.store.createRecord('foo');
		      }
		    })
		  `,
      errors: [
        'Cannot call `store.createRecord` in a lifecycle hook. Calling `store.createRecord` inside constructors, getters, and class properties can cause issues with re-renders.',
      ],
    },
    {
      code: `
		    export default Component.extend({
					store: service(),
		      model: this.store.createRecord('foo')
		    })
		  `,
      errors: [
        'Cannot call `store.createRecord` in an object property initializer. Calling `store.createRecord` inside constructors, getters, and class properties can cause issues with re-renders.',
      ],
    },
  ],
});
