// @ts-nocheck
const rule = require('../src/rules/no-legacy-request-patterns');
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

const errorId = 'warp-drive.no-legacy-request-patterns';

eslintTester.run('no-legacy-request-patterns', rule, {
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
				this.v2Store.findRecord('user', '1');
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				this.db.findRecord('user', '1');
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				store.findRecord('user', '1');
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				db.findRecord('user', '1');
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				anything.reload();
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				anything.save();
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				anything.destroyRecord();
		  `,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				this.destroyRecord();
		  `,
      errors: [{ messageId: errorId }],
    },
  ],
});
