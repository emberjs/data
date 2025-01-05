const rule = require('../src/rules/require-singular-dasherized-resource-name');
const RuleTester = require('eslint').RuleTester;

const eslintTester = new RuleTester({
  parserOptions: { ecmaVersion: 2015 },
});

const messageId = 'warp-drive.require-singular-dasherized-resource-name';

eslintTester.run('resource-naming', rule, {
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
      code: `import Model, { belongsTo } from '@ember-data/model';

      export default class extends Model {
        @belongsTo('Post', { async: true, inverse: 'post-comments' }) post;
      }`,
      output: null,
      errors: [
        {
          message: 'The @{{decorator}} decorator resource name should be singular and dasherized, but found Post.',
          type: 'CallExpression',
        },
      ],
    },
  ],
});
