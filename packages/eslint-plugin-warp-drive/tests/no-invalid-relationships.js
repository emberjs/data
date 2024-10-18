'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require('../src/rules/no-invalid-relationships');
const RuleTester = require('eslint').RuleTester;

const parserOptions = { ecmaVersion: 2022, sourceType: 'module', requireConfigFile: false };

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

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

ruleTester.run('no-invalid-relationships', rule, {
  valid: [
    `import Model, { belongsTo } from '@ember-data/model';

      export default class extends Model {
        @belongsTo('post', { async: true, inverse: 'comments' }) post;
      }`,
    `import Model, { hasMany } from '@ember-data/model';

      export default class extends Model {
        @hasMany('comment', { async: true, inverse: 'post' }) comments;
      }`,
    `import Model, { belongsTo, hasMany } from '@ember-data/model';

      export default class extends Model {
        @belongsTo('post', { async: false, inverse: 'comments' }) post;
        @hasMany('user', { async: true, inverse: null }) owner;
      }`,
  ],

  invalid: [
    {
      code: `import Model, { belongsTo } from '@ember-data/model';

      export default class extends Model {
        @belongsTo('post') post;
      }`,
      output: null,
      errors: [
        {
          message: 'The @belongsTo decorator requires an `async` property to be specified.',
          type: 'CallExpression',
        },
        {
          message: 'The @belongsTo decorator requires an `inverse` property to be specified.',
          type: 'CallExpression',
        },
      ],
    },
    {
      code: `import Model, { belongsTo } from '@ember-data/model';

      export default class extends Model {
        @belongsTo('post', {}) post;
      }`,
      output: null,
      errors: [
        {
          message: 'The @belongsTo decorator requires an `async` property to be specified.',
          type: 'CallExpression',
        },
        {
          message: 'The @belongsTo decorator requires an `inverse` property to be specified.',
          type: 'CallExpression',
        },
      ],
    },
    {
      code: `import Model, { belongsTo } from '@ember-data/model';

      export default class extends Model {
        @belongsTo('post', { async: 'comments'}) post;
      }`,
      output: null,
      errors: [
        {
          message: 'The @belongsTo decorator requires an `async` property to be specified as a boolean.',
          type: 'CallExpression',
        },
        {
          message: 'The @belongsTo decorator requires an `inverse` property to be specified.',
          type: 'CallExpression',
        },
      ],
    },
    {
      code: `import Model, { belongsTo } from '@ember-data/model';

      export default class extends Model {
        @belongsTo('post', { async: true }) post;
      }`,
      output: null,
      errors: [
        {
          message: 'The @belongsTo decorator requires an `inverse` property to be specified.',
          type: 'CallExpression',
        },
      ],
    },
    {
      code: `import Model, { belongsTo } from '@ember-data/model';

      export default class extends Model {
        @belongsTo('post', { inverse: 'comments' }) post;
      }`,
      output: null,
      errors: [
        {
          message: 'The @belongsTo decorator requires an `async` property to be specified.',
          type: 'CallExpression',
        },
      ],
    },
    {
      code: `import Model, { hasMany } from '@ember-data/model';

      export default class extends Model {
        @hasMany('comment') comments;
      }`,
      output: null,
      errors: [
        {
          message: 'The @hasMany decorator requires an `async` property to be specified.',
          type: 'CallExpression',
        },
        {
          message: 'The @hasMany decorator requires an `inverse` property to be specified.',
          type: 'CallExpression',
        },
      ],
    },
    {
      code: `import Model, { hasMany } from '@ember-data/model';

      export default class extends Model {
        @hasMany('comment', {}) comments;
      }`,
      output: null,
      errors: [
        {
          message: 'The @hasMany decorator requires an `async` property to be specified.',
          type: 'CallExpression',
        },
        {
          message: 'The @hasMany decorator requires an `inverse` property to be specified.',
          type: 'CallExpression',
        },
      ],
    },
    {
      code: `import Model, { hasMany } from '@ember-data/model';

      export default class extends Model {
        @hasMany('comment', { async: 'comments'}) comments;
      }`,
      output: null,
      errors: [
        {
          message: 'The @hasMany decorator requires an `async` property to be specified as a boolean.',
          type: 'CallExpression',
        },
        {
          message: 'The @hasMany decorator requires an `inverse` property to be specified.',
          type: 'CallExpression',
        },
      ],
    },
    {
      code: `import Model, { hasMany } from '@ember-data/model';

      export default class extends Model {
        @hasMany('comment', { async: true }) comments;
      }`,
      output: null,
      errors: [
        {
          message: 'The @hasMany decorator requires an `inverse` property to be specified.',
          type: 'CallExpression',
        },
      ],
    },
    {
      code: `import Model, { hasMany } from '@ember-data/model';

      export default class extends Model {
        @hasMany('comment', { inverse: 'post' }) comments;
      }`,
      output: null,
      errors: [
        {
          message: 'The @hasMany decorator requires an `async` property to be specified.',
          type: 'CallExpression',
        },
      ],
    },
  ],
});
