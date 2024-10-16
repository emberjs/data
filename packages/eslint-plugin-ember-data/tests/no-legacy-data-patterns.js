// @ts-nocheck
const rule = require('../rules/no-legacy-data-patterns');
const RuleTester = require('eslint').RuleTester;

const eslintTester = new RuleTester({
	// eslint-disable-next-line n/no-unpublished-require
	parser: require.resolve('@babel/eslint-parser'),
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		requireConfigFile: false,
		babelOptions: {
			babelrc: false,
			plugins: [['@babel/plugin-proposal-decorators', { decoratorsBeforeExport: true }]],
		},
	},
});

const errorId = 'auditboard.warp-drive.no-legacy-data-patterns';

eslintTester.run('no-legacy-data-patterns', rule, {
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
				this.store.findRecord('user', '1');
		  `,
			errors: [{ messageId: errorId }],
		},
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
				this.apiAjax.request({});
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
				this.apiAjax.post({});
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
