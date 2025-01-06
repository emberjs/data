const rule = require('../src/rules/require-singular-dasherized-resource-name');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
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

ruleTester.run('require-singular-dasherized-resource-name', rule, {
  valid: [
    `import Model, { belongsTo } from '@ember-data/model';

      export default class extends Model {
        @belongsTo('post', { async: true, inverse: 'post-comments' }) post;
      }`,
    `import Model, { hasMany } from '@ember-data/model';

      export default class extends Model {
        @hasMany('post-comment', { async: true, inverse: 'post' }) comments;
      }`,
    `import Model, { belongsTo, hasMany } from '@ember-data/model';

      export default class extends Model {
        @belongsTo('post', { async: false, inverse: 'post-comments' }) post;
        @hasMany('user', { async: true, inverse: null }) owner;
      }`,
  ],

  invalid: [
    {
      code: `
        import Model, { belongsTo } from '@ember-data/model';
        export default class extends Model {
          @belongsTo('Posts', { async: true, inverse: 'post-comments' }) post;
        }
        `,
      output: null,
      errors: [
        {
          message:
            "The @belongsTo decorator resource name should be singular and dasherized (Post), but found 'Posts'.",
          type: 'CallExpression',
        },
      ],
    },
    {
      code: `
        import Model, { hasMany } from '@ember-data/model';
        export default class User extends Model {
          @hasMany('user_settings', { inverse: 'user' }) userSettings;
        }
        `,
      output: null,
      errors: [
        {
          message:
            "The @hasMany decorator resource name should be singular and dasherized (user-setting), but found 'user_settings'.",
          type: 'CallExpression',
        },
      ],
    },
  ],
});
