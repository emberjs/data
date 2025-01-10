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
    fixable: 'code',
    defaultOptions: [
      {
        moduleName: 'inflection',
        methodNames: ['dasherize', 'singularize'],
      },
    ],
    schema: {
      type: 'array',
      items: [
        {
          type: 'object',
          properties: {
            moduleName: { type: 'string' },
            methodNames: { type: 'array' },
          },
          additionalProperties: false,
        },
      ],
    },
  },

  async create(context) {
    const params = context.options[0] ?? {
      moduleName: '@ember-data/request-utils/string',
      methodNames: ['dasherize', 'singularize'],
    };
    const { moduleName, methodNames } = params;
    let normalize;

    try {
      const mod = await import('@ember-data/request-utils/string');
      // const mod = await import(moduleName);
      normalize = (value) => {
        return methodNames.reduce((acc, methodName) => {
          return mod[methodName](acc);
        }, value);
      };
    } catch (error) {
      console.log(error);
      context.report({
        message: `Failed to load module '${moduleName}' or methods '${methodNames.join(', ')}'`,
      });
      return {};
    }

    return {
      CallExpression(node) {
        const decorator =
          node.parent.type === 'Decorator' && ['belongsTo', 'hasMany'].includes(node.callee.name) && node;

        if (decorator) {
          const args = decorator.arguments;

          // TODO: add support for passing normalize function to rule to test
          const resource = args.at(0); // The first argument is the resource name
          const resourceName = resource.value;
          const normalizedResourceName = normalize(resourceName);

          if (resourceName !== normalizedResourceName) {
            context.report({
              node,
              message: `The @${node.callee.name} decorator resource name should be singular and dasherized (${normalizedResourceName}), but found '${resourceName}'.`,
              data: {
                decorator: decorator.callee.name,
              },
              fix(fixer) {
                return fixer.replaceText(resource, `'${normalizedResourceName}'`);
              },
            });
            return;
          }
        }
      },
    };
  },
};
