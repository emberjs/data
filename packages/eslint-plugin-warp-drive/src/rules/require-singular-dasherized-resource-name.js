const { dasherize, singularize } = require('inflection');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce singular, dasherized resource names',
      category: 'Naming Convention',
      recommended: true,
      url: 'https://github.com/emberjs/data/tree/main/packages/eslint-plugin-warp-drive/docs/require-singular-dasherized-resource-name.md',
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const decorator =
          node.parent.type === 'Decorator' && ['belongsTo', 'hasMany'].includes(node.callee.name) && node;

        if (decorator) {
          const args = decorator.arguments;

          // TODO: add support for passing normalize function to rule to test
          const resource = args.at(0); // The first argument is the resource name
          const resourceName = resource.value;
          const normalizedResourceName = dasherize(singularize(resourceName));

          console.log({ resourceName, normalizedResourceName });
          console.log(resourceName === normalizedResourceName, 'true');

          if (resourceName !== normalizedResourceName) {
            context.report({
              node,
              message: `The @${node.callee.name} decorator resource name should be singular and dasherized (${normalizedResourceName}), but found '${resourceName}'.`,
              data: {
                decorator: decorator.callee.name,
              },
            });
            return;
          }
        }
      },
    };
  },
};
