import { type TraverseOptions } from '@babel/traverse';
import { type ClassProperty, type Node } from '@babel/types';

// TODO do this via import matching
const TypeDecorators = new Set(['createonly', 'optional', 'readonly', 'nullable', 'readonly'] as const);
type TypeDecorator = 'createonly' | 'optional' | 'readonly' | 'nullable' | 'readonly';

function isTypeDecorator(decorator: string): decorator is TypeDecorator {
  return TypeDecorators.has(decorator as unknown as TypeDecorator);
}

function numToIndexStr(num: number): string {
  switch (num) {
    case 0:
      return '1st';
    case 1:
      return '2nd';
    case 2:
      return '3rd';
    default:
      return `${num + 1}th`;
  }
}

function extractType(field: ClassProperty) {
  if (field.typeAnnotation) {
    if (field.typeAnnotation.type !== 'TSTypeAnnotation') {
      throw new Error('Only TSTypeAnnotation is supported.');
    }
    if (field.typeAnnotation.typeAnnotation.type === 'TSUnionType') {
      return field.typeAnnotation.typeAnnotation.types.map((type) => {
        return type.type;
      });
    } else {
      return field.typeAnnotation.typeAnnotation.type;
    }
  }
  return null;
}

function extractFieldType(node: Node) {
  if (!node) {
    return null;
  }
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'StringLiteral') {
    return `'${node.value}'`;
  }
  console.log(node);
  throw new Error('Only Identifier is supported.');
}

function extractOptions(node: Node) {
  if (!node) {
    return null;
  }
  if (node.type === 'ObjectExpression') {
    const properties: Record<string, unknown> = {};
    node.properties.forEach((property) => {
      if (property.type !== 'ObjectProperty') {
        throw new Error('Only ObjectProperty is supported.');
      }
      if (property.key.type !== 'Identifier') {
        throw new Error('Only Identifier is supported.');
      }
      properties[property.key.name] = property.value;
    });
    return properties;
  }
  console.log(node);
  throw new Error('Only ObjectExpression is supported.');
}

export type FieldSchema = {
  kind: string;
  name: string;
  type: string | null;
  options: {} | null;
  typeOptions: {
    nullable: boolean;
    optional: boolean;
    createonly: boolean;
    readonly: boolean;
  };
  typeInfo: {
    uiType: string;
    cacheType: string;
  };
};

export type Schema = {
  name: string;
  traits: string[];
  fields: FieldSchema[];
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

          if (field.key.type !== 'Identifier') {
            throw new Error('Fields must only be string keys.');
          }

          const fieldSchema = {
            kind: 'field',
            name: field.key.name,
            type: null,
            options: null,
            typeOptions: {
              nullable: false,
              optional: false,
              createonly: false,
              readonly: false,
            },
            typeInfo: {
              optional: field.optional,
              uiType: extractType(field),
              cacheType: extractType(field),
            },
          } as FieldSchema;

          if (field.decorators) {
            for (let i = 0; i < field.decorators.length; i++) {
              const decorator = field.decorators[i];

              if (decorator.expression.type === 'Identifier' && isTypeDecorator(decorator.expression.name)) {
                fieldSchema.typeOptions[decorator.expression.name] = true;
              } else if (i === field.decorators.length - 1) {
                if (decorator.expression.type === 'Identifier') {
                  fieldSchema.kind = decorator.expression.name;
                } else if (decorator.expression.type === 'CallExpression') {
                  if (decorator.expression.callee.type !== 'Identifier') {
                    throw new Error(`Unable to parse the ${numToIndexStr(i)} field decorator for ${fieldSchema.name}`);
                  }
                  fieldSchema.kind = decorator.expression.callee.name;
                  fieldSchema.type = extractFieldType(decorator.expression.arguments[0]);
                  fieldSchema.options = extractOptions(decorator.expression.arguments[1]);
                } else {
                  console.log(decorator.expression);
                  throw new Error(`Unable to parse the ${numToIndexStr(i)} field decorator for ${fieldSchema.name}`);
                }
              } else {
                throw new Error(`Decorators used to declare the field type must be last.`);
              }
            }
          }

          return fieldSchema;
        });
      },
      exit(path) {
        console.log('exiting');
        console.dir(currentClass, { depth: 10 });
      },
    },
  };
}
