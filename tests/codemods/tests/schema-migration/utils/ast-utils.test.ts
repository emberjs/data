import { describe, expect, it } from 'vitest';

import type { PropertyInfo } from '../../../../../packages/codemods/src/schema-migration/utils/ast-utils.js';
import {
  createExtensionArtifactWithTypes,
  createTypeArtifact,
  generateInterfaceCode,
  getTypeScriptTypeForAttribute,
} from '../../../../../packages/codemods/src/schema-migration/utils/ast-utils.js';

describe('AST utilities', () => {
  describe('getTypeScriptTypeForAttribute', () => {
    it('returns correct built-in types with proper nullability', () => {
      const result1 = getTypeScriptTypeForAttribute('string', false, true);
      expect(result1.tsType).toBe('string | null');

      const result2 = getTypeScriptTypeForAttribute('string', true, true);
      expect(result2.tsType).toBe('string');

      const result3 = getTypeScriptTypeForAttribute('number', false, false);
      expect(result3.tsType).toBe('number');
    });

    it('uses custom type mappings when provided', () => {
      const customMappings = {
        uuid: 'string',
        currency: 'number',
        json: 'Record<string, unknown>',
      };

      const options = { typeMapping: customMappings };

      const result1 = getTypeScriptTypeForAttribute('uuid', false, true, options);
      expect(result1.tsType).toBe('string | null');

      const result2 = getTypeScriptTypeForAttribute('currency', true, true, options);
      expect(result2.tsType).toBe('number');

      const result3 = getTypeScriptTypeForAttribute('json', false, false, options);
      expect(result3.tsType).toBe('Record<string, unknown>');
    });

    it('falls back to unknown for unsupported types', () => {
      const result1 = getTypeScriptTypeForAttribute('unsupported-type', false, true);
      expect(result1.tsType).toBe('unknown | null');

      const result2 = getTypeScriptTypeForAttribute('weird-transform', true, false);
      expect(result2.tsType).toBe('unknown');
    });

    it('prefers custom mappings over built-in types', () => {
      const customMappings = {
        string: 'CustomString',
        number: 'CustomNumber',
      };

      const options = { typeMapping: customMappings };

      const result1 = getTypeScriptTypeForAttribute('string', true, false, options);
      expect(result1.tsType).toBe('CustomString');

      const result2 = getTypeScriptTypeForAttribute('number', false, true, options);
      expect(result2.tsType).toBe('CustomNumber | null');
    });
  });

  describe('generateInterfaceCode', () => {
    it('generates basic interface with properties', () => {
      const properties = [
        { name: 'name', type: 'string', readonly: true, optional: false },
        { name: 'age', type: 'number', readonly: true, optional: true },
        { name: 'isActive', type: 'boolean', readonly: false, optional: false },
      ];

      const code = generateInterfaceCode('TestInterface', properties);
      expect(code).toMatchSnapshot('basic interface');
    });

    it('generates interface with extends clause', () => {
      const properties = [{ name: 'title', type: 'string', readonly: true, optional: false }];

      const code = generateInterfaceCode('TestInterface', properties, 'BaseInterface');
      expect(code).toMatchSnapshot('interface with extends');
    });

    it('generates interface with imports', () => {
      const properties = [{ name: 'user', type: 'User', readonly: true, optional: false }];

      const imports = ['import type User from "app/models/user";'];
      const code = generateInterfaceCode('TestInterface', properties, undefined, imports);
      expect(code).toMatchSnapshot('interface with imports');
    });

    it('generates interface with comments', () => {
      const properties = [
        { name: 'name', type: 'string', readonly: true, optional: false, comment: 'The user name' },
        { name: 'email', type: 'string', readonly: true, optional: true, comment: 'Optional email address' },
      ];

      const code = generateInterfaceCode('TestInterface', properties);
      expect(code).toMatchSnapshot('interface with comments');
    });

    it('generates empty interface when no properties', () => {
      const code = generateInterfaceCode('EmptyInterface', []);
      expect(code).toMatchSnapshot('empty interface');
    });
  });

  describe('createTypeArtifact', () => {
    it('creates resource-type artifact with correct filename and type', () => {
      const properties = [{ name: 'name', type: 'string', readonly: true, optional: false }];

      const artifact = createTypeArtifact('user', 'UserSchema', properties, 'resource');

      expect(artifact.type).toBe('resource-type');
      expect(artifact.name).toBe('UserSchema');
      expect(artifact.suggestedFileName).toBe('user.schema.types.ts');
      expect(artifact.code).toMatchSnapshot('resource-type artifact code');
    });

    it('creates extension-type artifact with correct filename and type', () => {
      const properties = [{ name: 'displayName', type: 'unknown', readonly: false, optional: false }];

      const artifact = createTypeArtifact('user', 'UserExtension', properties, 'extension');

      expect(artifact.type).toBe('extension-type');
      expect(artifact.name).toBe('UserExtension');
      expect(artifact.suggestedFileName).toBe('user.ts');
      expect(artifact.code).toMatchSnapshot('extension-type artifact code');
    });

    it('creates trait-type artifact with correct filename and type', () => {
      const properties = [{ name: 'name', type: 'string', readonly: true, optional: false }];

      const artifact = createTypeArtifact('fileable', 'FileableTrait', properties, 'trait');

      expect(artifact.type).toBe('trait-type');
      expect(artifact.name).toBe('FileableTrait');
      expect(artifact.suggestedFileName).toBe('fileable.schema.types.ts');
      expect(artifact.code).toMatchSnapshot('trait-type artifact code');
    });

    it('creates legacy type artifact when no context provided', () => {
      const properties = [{ name: 'name', type: 'string', readonly: true, optional: false }];

      const artifact = createTypeArtifact('test', 'TestInterface', properties);

      expect(artifact.type).toBe('type');
      expect(artifact.suggestedFileName).toBe('test.schema.types.ts');
    });

    it('includes extends clause and imports when provided', () => {
      const properties = [{ name: 'name', type: 'string', readonly: true, optional: false }];

      const artifact = createTypeArtifact('user', 'UserInterface', properties, 'schema', 'BaseInterface', [
        'import type BaseInterface from "./base";',
      ]);

      expect(artifact.code).toMatchSnapshot('artifact with extends and imports');
    });
  });

  describe('createExtensionArtifactWithTypes', () => {
    it('creates extension artifact with corresponding type artifact', () => {
      const baseName = 'user';
      const extensionName = 'UserExtension';
      const _extensionCode = `export class UserExtension {
  get displayName() {
    return this.name;
  }
}`;
      const properties: PropertyInfo[] = [
        {
          name: 'displayName',
          originalKey: 'displayName',
          value: 'computed("name", function() { return this.name; })',
          typeInfo: { name: 'displayName', type: 'function', optional: false, readonly: false },
        },
      ];

      const artifacts = createExtensionArtifactWithTypes(baseName, extensionName, properties, 'class');

      expect(artifacts.extensionArtifact).toBeDefined();
      expect(artifacts.typeArtifact).toBeDefined();

      const extension = artifacts.extensionArtifact;
      const extensionType = artifacts.typeArtifact;

      expect(extension.name).toBe(extensionName);
      expect(extension.suggestedFileName).toBe('user.ts');
      expect(extensionType.type).toBe('extension-type');
      expect(extensionType.name).toBe('UserExtensionSignature');
      expect(extensionType.suggestedFileName).toBe('user.ts');
    });

    it('creates only extension artifact when no properties provided', () => {
      const baseName = 'user';
      const extensionName = 'UserExtension';
      const properties: PropertyInfo[] = [];

      const artifacts = createExtensionArtifactWithTypes(baseName, extensionName, properties, 'object');

      expect(artifacts.extensionArtifact).toBeNull();
      expect(artifacts.typeArtifact).toBeNull();
    });
  });

  describe('type mapping integration', () => {
    it('applies custom type mappings consistently across all functions', () => {
      const customTypeMappings = {
        uuid: 'string',
        currency: 'number',
        json: 'Record<string, unknown>',
      };

      const options = { typeMapping: customTypeMappings };

      // Test individual type resolution
      const result1 = getTypeScriptTypeForAttribute('uuid', false, true, options);
      expect(result1.tsType).toBe('string | null');

      const result2 = getTypeScriptTypeForAttribute('currency', true, false, options);
      expect(result2.tsType).toBe('number');

      const result3 = getTypeScriptTypeForAttribute('json', false, false, options);
      expect(result3.tsType).toBe('Record<string, unknown>');

      // Test interface generation with custom types
      const properties = [
        { name: 'id', type: 'string', readonly: true, optional: false },
        { name: 'amount', type: 'number', readonly: true, optional: false },
        { name: 'metadata', type: 'Record<string, unknown>', readonly: true, optional: true },
      ];

      const code = generateInterfaceCode('TestInterface', properties);
      expect(code).toMatchSnapshot('interface with custom type mappings');
      // Should map uuid to string, currency to number, json to Record<string, unknown>
    });
  });
});
