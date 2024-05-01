import { type Node } from '@babel/types';

const SerializableTypes = new Set([
  'StringLiteral',
  'NullLiteral',
  'NumericLiteral',
  'BooleanLiteral',
  'ArrayExpression',
  'ObjectExpression',
]);

export type PrimitiveValue = string | number | boolean | null;
export interface ObjectValue {
  [key: string]: JSONValue;
}
export type ArrayValue = JSONValue[];
export type JSONValue = PrimitiveValue | ArrayValue | ObjectValue;

function getJsonValueFromNode(node: Node): JSONValue {
  if (!SerializableTypes.has(node.type)) {
    console.log(node);
    throw new Error(`Values in Schemas must be JSON Serializable. Type ${node.type} is not serializable to JSON.`);
  }

  switch (node.type) {
    case 'StringLiteral':
      return node.value;
    case 'BooleanLiteral':
      return node.value;
    case 'NullLiteral':
      return null;
    case 'NumericLiteral':
      return node.value;
    case 'ArrayExpression':
      return node.elements.map((element) => {
        if (!element) {
          throw new Error('Empty array elements like null are not supported.');
        }
        if (element.type === 'SpreadElement') {
          throw new Error('Spread elements are not supported.');
        }
        return getJsonValueFromNode(element);
      });
    case 'ObjectExpression':
      return extractJSONObject(node);
    default:
      throw new Error(`Unsupported node type: ${node.type}`);
  }
}

export function extractJSONObject(node: Node): ObjectValue {
  if (node.type !== 'ObjectExpression') {
    throw new Error('Only ObjectExpression is supported.');
  }

  const properties: ObjectValue = {};
  node.properties.forEach((property) => {
    if (property.type !== 'ObjectProperty') {
      throw new Error('Only ObjectProperty is supported.');
    }
    if (property.key.type !== 'Identifier') {
      throw new Error('Only Identifier is supported.');
    }

    if (!SerializableTypes.has(property.value.type)) {
      console.log(property);
      throw new Error(
        `Values in Schemas must be JSON Serializable. Type ${property.value.type} is not serializable to JSON.`
      );
    }

    properties[property.key.name] = getJsonValueFromNode(property.value);
  });

  return properties;
}
