import { type TraverseOptions } from '@babel/traverse';

export type Schema = {
  name: string;
  traits: string[];
  fields: unknown[];
};

export type Context = {
  klasses: Map<string, Schema>;
};

export function buildTraverse(context: Partial<Context>): TraverseOptions {
  const klasses = new Map<string, Schema>();
  context.klasses = klasses;

  let currentClass = {} as Schema;
  return {
    FunctionDeclaration() {
      throw new Error('Functions are not allowed in schemas.');
    },
    VariableDeclaration() {
      throw new Error('Variables are not allowed in schemas.');
    },

    ClassDeclaration: {
      enter(path) {
        console.log('entering');
        currentClass = {} as Schema;

        // gather name
        const id = path.node.id?.name;
        if (!id) {
          throw new Error('Schemas must have a class name.');
        }
        currentClass.name = id!;

        // enforce no extends
        if (path.node.superClass) {
          throw new Error('Schemas cannot extend from base classes. Use traits.');
        }

        // gather traits
        currentClass.traits =
          path.node.decorators?.map((decorator) => {
            if (decorator.expression.type !== 'Identifier') {
              throw new Error('Traits may not have arguments.');
            }
            return decorator.expression.name;
          }) ?? [];

        // gather fields
        currentClass.fields = path.node.body.body.map((field) => {
          if (field.type !== 'ClassProperty') {
            throw new Error('Schemas may only have fields.');
          }

          return field;
        });
      },
      exit(path) {
        console.log('exiting');
        console.log(currentClass);
      },
    },
  };
}
