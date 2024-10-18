// @ts-nocheck
const rule = require('../src/rules/no-external-request-patterns');
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

const errorId = 'warp-drive.no-external-request-patterns';

eslintTester.run('no-external-request-patterns', rule, {
  valid: [
    {
      code: `
				this.store.request(findRecord('user', '1'));
			`,
    },
    {
      code: `
				store.request(findRecord('user', '1'));
			`,
    },
    {
      code: `
				this.request('user', '1');
			`,
    },
    {
      code: `
				this.findRecord('user', '1');
			`,
    },
    {
      code: `
				findRecord('user', '1');
			`,
    },
    {
      code: `
				save(user);
			`,
    },
    {
      code: `
				destroyRecord(user);
			`,
    },
    {
      code: `
				reload(user);
			`,
    },
    {
      code: `
				/expr/.test(val);
			`,
    },
    {
      code: `
				// bad but we don't try to detect this
				this[store].findRecord('user', '1');
			`,
    },
    {
      code: `
				// bad but we don't try to detect this
				this.store[findRecord]('user', '1');
			`,
    },
  ],
  invalid: [
    {
      code: `
				const foo = new XMLHttpRequest();
		  `,
      errors: [{ messageId: `${errorId}.no-method` }],
    },
    {
      code: `
				await fetch('/some-url');
		  `,
      errors: [{ messageId: `${errorId}.no-method` }],
    },
    {
      code: `
				this.$.get('/some-url');
		  `,
      errors: [{ messageId: `${errorId}` }],
    },
    {
      code: `
				$.get('/some-url');
		  `,
      errors: [{ messageId: `${errorId}` }],
    },
    {
      code: `
				jQ.get('/some-url');
		  `,
      errors: [{ messageId: `${errorId}` }],
    },
    {
      code: `
				jQuery.get('/some-url');
		  `,
      errors: [{ messageId: `${errorId}` }],
    },
    {
      code: `
				najax.get('/some-url');
		  `,
      errors: [{ messageId: `${errorId}` }],
    },
    {
      code: `
				this.najax.get('/some-url');
		  `,
      errors: [{ messageId: `${errorId}` }],
    },
    {
      code: `
				najax('/some-url');
		  `,
      errors: [{ messageId: `${errorId}.no-method` }],
    },
    {
      code: `
				this.apiAjax.get({});
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				this.ajax.get({});
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				this.apiAjax.request({});
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				this.ajax.request({});
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				this.apiAjax.delete({});
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				this.ajax.delete({});
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				this.apiAjax.post({});
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				this.ajax.post({});
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				anything.GET();
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				GET({});
		  `,
      errors: [{ messageId: `${errorId}.no-method` }],
    },
  ],
});
