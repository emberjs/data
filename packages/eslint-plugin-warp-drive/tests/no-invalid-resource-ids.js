// @ts-nocheck
const rule = require('../src/rules/no-invalid-resource-ids');
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

const errorId = 'warp-drive.no-invalid-resource-ids';

eslintTester.run('no-invalid-resource-ids', rule, {
  valid: [
    {
      code: `
				db.findRecord({ type: 'user', id: '1' });
			`,
    },
    {
      code: `
				db.findRecord({ type: 'user', id });
			`,
    },
    {
      code: `
				db.findRecord({ type: 'user', id: trueId });
			`,
    },
    {
      code: `
				db.findRecord(identifier);
			`,
    },
    {
      code: `
				db.findRecord(type, '1');
			`,
    },
    {
      code: `
				db.findRecord('user', id);
			`,
    },
    {
      code: `
				db.findRecord('user', '1');
			`,
    },
    {
      code: `
				this.findRecord('user', '1');
			`,
    },
    {
      code: `
				this.store.findRecord('user', '1');
			`,
    },
    {
      code: `
        import { findRecord } from '@warp-drive/utilities/json-api';

        findRecord('user', '1');
			`,
    },
  ],
  invalid: [
    {
      code: `
				db.findRecord({ type: 'user', id: 1 });
			`,
      output: `
				db.findRecord({ type: 'user', id: '1' });
			`,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				db.findRecord('user', 1);
			`,
      output: `
				db.findRecord('user', '1');
			`,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				this.findRecord('user', 1);
			`,
      output: `
				this.findRecord('user', '1');
			`,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
				this.store.findRecord('user', 1);
			`,
      output: `
				this.store.findRecord('user', '1');
			`,
      errors: [{ messageId: errorId }],
    },
    {
      code: `
        import { findRecord } from '@warp-drive/utilities/json-api';

        findRecord('user', 1);
			`,
      output: `
        import { findRecord } from '@warp-drive/utilities/json-api';

        findRecord('user', '1');
			`,
      errors: [{ messageId: errorId + '.invalid-import' }],
    },
  ],
});
