import { describe, expect, it } from 'vitest';

import { toArtifacts } from '../../../../../packages/codemods/src/schema-migration/mixin-to-schema.js';

describe('mixin-to-schema transform (artifacts)', () => {
  describe('basic functionality', () => {
    it('produces trait and extension artifacts for direct Mixin.create', () => {
      const input = `import { attr, hasMany } from '@ember-data/model';
import Mixin from '@ember/object/mixin';
import { computed } from '@ember/object';

export default Mixin.create({
	files: hasMany('file', { as: 'fileable', async: false }),
	name: attr('string'),
	isActive: attr('boolean', { defaultValue: false }),
	titleCaseName: computed('name', function () { return (this.name || '').toUpperCase(); })
});`;

      const artifacts = toArtifacts('app/mixins/fileable.js', input, {});
      expect(artifacts).toHaveLength(3); // Trait, trait-type, and extension artifacts

      // Test artifact metadata
      expect(
        artifacts.map((a) => ({ type: a.type, suggestedFileName: a.suggestedFileName, name: a.name }))
      ).toMatchSnapshot('artifact metadata');

      // Test generated code separately for better readability
      const trait = artifacts.find((a) => a.type === 'trait');
      const traitType = artifacts.find((a) => a.type === 'trait-type');
      const extension = artifacts.find((a) => a.type === 'extension');
      expect(trait?.code).toMatchSnapshot('trait code');
      expect(traitType?.code).toMatchSnapshot('trait type code');
      expect(extension?.code).toMatchSnapshot('extension code');
    });

    it('supports alias of Mixin import and still produces a trait artifact', () => {
      const input = `import MyMixin from '@ember/object/mixin';
import { attr } from '@ember-data/model';

export default MyMixin.create({ name: attr('string') });`;

      const artifacts = toArtifacts('app/mixins/aliased.js', input, {});
      expect(
        artifacts.map((a) => ({ type: a.type, name: a.name, suggestedFileName: a.suggestedFileName }))
      ).toMatchSnapshot('metadata');
      expect(artifacts[0]?.code).toMatchSnapshot('code');
    });

    it('produces a trait artifact if identifier default export is initialized by Mixin.create', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { hasMany } from '@ember-data/model';

const Fileable = Mixin.create({ files: hasMany('file', { async: false }) });
export default Fileable;`;

      const artifacts = toArtifacts('app/mixins/fileable.js', input, {});
      expect(
        artifacts.map((a) => ({ type: a.type, name: a.name, suggestedFileName: a.suggestedFileName }))
      ).toMatchSnapshot('metadata');
      expect(artifacts[0]?.code).toMatchSnapshot('code');
    });

    it('does not produce artifacts if there is no @ember/object/mixin import', () => {
      const input = `import { attr } from '@ember-data/model';

export default SomethingElse.create({ name: attr('string') });`;

      const artifacts = toArtifacts('app/mixins/not-ember-mixin.js', input, {});
      expect(artifacts).toHaveLength(0);
    });

    it('converts mixin with no trait fields to extension artifact', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { computed } from '@ember/object';

export default Mixin.create({
	complexMethod() { return 'processed'; },
	computedValue: computed(function() { return 'computed'; })
});`;

      const artifacts = toArtifacts('app/mixins/no-traits.js', input, {});
      expect(
        artifacts.map((a) => ({ type: a.type, name: a.name, suggestedFileName: a.suggestedFileName }))
      ).toMatchSnapshot('metadata');
      expect(artifacts[0]?.code).toMatchSnapshot('code');
    });

    it('preserves newlines and tabs in extension artifact properties without escaping', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { computed } from '@ember/object';
import { service } from '@ember/service';

export default Mixin.create({
	library: service('library'),
	projectPlans: computed('_modelName', 'intId', 'library.projectPlans.[]', function () {
		return this.get('library.projectPlans')
			?.filterBy('plannableType', classify(this._modelName))
			.filterBy('plannableId', this.intId);
	})
});`;

      const artifacts = toArtifacts('app/mixins/plannable.js', input, {});
      expect(
        artifacts.map((a) => ({ type: a.type, name: a.name, suggestedFileName: a.suggestedFileName }))
      ).toMatchSnapshot('metadata');
      expect(artifacts[0]?.code).toMatchSnapshot('code');
    });

    it('collects the real fileable mixin shape into trait and extension artifacts', () => {
      const input = `import { computed } from '@ember/object';
import { readOnly } from '@ember/object/computed';
import Mixin from '@ember/object/mixin';

import { arrayHasLength } from '@auditboard/client-core/core/computed-extensions';
import { attr, hasMany } from '@ember-data/model';

import { sortBy } from 'soxhub-client/utils/sort-by';

export default Mixin.create({
	files: hasMany('file', { as: 'fileable', async: false, inverse: 'fileable' }),
	sortedFiles: sortBy('files', 'createdAt:desc'),
	hasFiles: arrayHasLength('files'),
	numFiles: readOnly('files.length'),

	showFilesRequiringReviewError: attr('boolean', { defaultValue: false }),
	filesRequiringReview: computed('files.@each.status', function () {
		return this.files.filter((file) => !file.isReviewed);
	}),
	hasFilesRequiringReview: arrayHasLength('filesRequiringReview'),
	numFilesRequiringReview: readOnly('filesRequiringReview.length'),

	hasDuplicateFileName(file) {
		return Boolean(this.files.find((fileRecord) => fileRecord.name === file.name));
	},
});`;

      const artifacts = toArtifacts('apps/client/app/mixins/fileable.js', input, {});
      expect(artifacts).toHaveLength(3); // Trait, trait-type, and extension artifacts
      expect(
        artifacts.map((a) => ({ type: a.type, suggestedFileName: a.suggestedFileName, name: a.name }))
      ).toMatchSnapshot('artifact metadata');

      // Test generated code separately for better readability
      const trait = artifacts.find((a) => a.type === 'trait');
      const traitType = artifacts.find((a) => a.type === 'trait-type');
      const extension = artifacts.find((a) => a.type === 'extension');
      expect(trait?.code).toMatchSnapshot('trait code');
      expect(traitType?.code).toMatchSnapshot('trait-type code');
      expect(extension?.code).toMatchSnapshot('extension code');
    });
  });

  describe('import validation', () => {
    it('only processes decorators from @ember-data/model by default (trait artifact)', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { attr, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';

export default Mixin.create({
	name: attr('string'),
	files: hasMany('file'),
	customProp: computed('name', function() { return this.name; })
});`;

      const artifacts = toArtifacts('app/mixins/default-source.js', input, {});
      expect(artifacts.map((a) => ({ type: a.type, name: a.name }))).toMatchSnapshot('artifact types');
      expect(artifacts.map((a) => a.code)).toMatchSnapshot('generated code');
    });

    it('allows alternate import source via options (trait artifact)', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { attr, hasMany } from '@my-custom/model';
import { computed } from '@ember/object';

export default Mixin.create({
	name: attr('string'),
	files: hasMany('file'),
	customProp: computed('name', function() { return this.name; })
});`;

      const artifacts = toArtifacts('app/mixins/custom-source.js', input, {
        emberDataImportSource: '@my-custom/model',
      });
      expect(artifacts).toMatchSnapshot();
    });

    it('supports @auditboard/warp-drive/v1/model as alternate import source when configured', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { attr, hasMany } from '@auditboard/warp-drive/v1/model';
import { computed } from '@ember/object';

export default Mixin.create({
	name: attr('string'),
	files: hasMany('file'),
	customProp: computed('name', function() { return this.name; })
});`;

      const artifacts = toArtifacts('app/mixins/auditboard-source.js', input, {
        emberDataImportSource: '@auditboard/warp-drive/v1/model',
      });
      expect(artifacts).toMatchSnapshot();
    });

    it('ignores decorators from unsupported import sources (only attr recognized)', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { attr } from '@ember-data/model';
import { hasMany } from '@unsupported/source';
import { computed } from '@ember/object';

export default Mixin.create({
	name: attr('string'),
	files: hasMany('file'), // This should be ignored
	customProp: computed('name', function() { return this.name; })
});`;

      const artifacts = toArtifacts('app/mixins/unsupported-source.js', input, {});
      expect(artifacts).toMatchSnapshot();
    });

    it('handles aliased imports correctly (trait artifact)', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { attr as attribute, hasMany as manyRelation, belongsTo as oneRelation } from '@ember-data/model';

export default Mixin.create({
	name: attribute('string'),
	files: manyRelation('file'),
	owner: oneRelation('user')
});`;

      const artifacts = toArtifacts('app/mixins/aliased-imports.js', input, {});
      expect(artifacts).toMatchSnapshot();
    });

    it('correctly ignores renamed imports from unsupported sources (only hasMany recognized)', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { hasMany as many } from '@ember-data/model';
import { attr as attribute } from '@unsupported/source';

export default Mixin.create({
	files: many('file'), // Should be recognized as hasMany from valid source
	name: attribute('string') // Should be ignored, treated as regular function call
});`;

      const artifacts = toArtifacts('app/mixins/renamed-mixed-sources.js', input, {});
      expect(artifacts).toMatchSnapshot();
    });

    it('produces an extension artifact when no valid EmberData imports are found', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { computed } from '@ember/object';
import { attr } from '@unsupported/source';

export default Mixin.create({
	name: attr('string'), // This will be ignored because @unsupported/source is not valid
	customProp: computed('name', function() { return this.name; })
});`;

      const artifacts = toArtifacts('app/mixins/no-valid-imports.js', input, {});
      expect(artifacts).toMatchSnapshot();
    });

    it('processes belongsTo decorator correctly (trait artifact)', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { belongsTo } from '@ember-data/model';

export default Mixin.create({
	owner: belongsTo('user', { async: true })
});`;

      const artifacts = toArtifacts('app/mixins/belongs-to.js', input, {});
      expect(artifacts).toMatchSnapshot();
    });

    it('skips artifacts when there is no mixin structure at all', () => {
      const input = `import { computed } from '@ember/object';

export default class MyClass {
	name = 'test';
}`;

      const artifacts = toArtifacts('app/mixins/not-a-mixin.js', input, {});
      expect(artifacts).toHaveLength(0);
    });

    it('handles CLI option name conversion from kebab-case to camelCase (trait artifact)', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { attr } from '@my-custom/model';

export default Mixin.create({
	name: attr('string')
});`;

      const artifacts = toArtifacts('app/mixins/cli-option.js', input, {
        emberDataImportSource: '@my-custom/model',
      });
      expect(artifacts).toMatchSnapshot();
    });
  });

  describe('TypeScript type artifacts', () => {
    it('generates trait-type artifact with empty interface for basic mixins', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { attr, hasMany } from '@ember-data/model';

export default Mixin.create({
	files: hasMany('file', { as: 'fileable', async: false }),
	name: attr('string'),
	isActive: attr('boolean', { defaultValue: false })
});`;

      const artifacts = toArtifacts('app/mixins/fileable.js', input, {});

      // Should have trait and trait-type artifacts (no extension if no computed/methods)
      expect(artifacts).toHaveLength(2);
      expect(artifacts.map((a) => a.type).sort()).toEqual(['trait', 'trait-type']);

      const traitType = artifacts.find((a) => a.type === 'trait-type');
      expect(traitType?.code).toMatchSnapshot('basic trait type interface');
      expect(traitType?.suggestedFileName).toBe('fileable.schema.types.ts');
    });

    it('generates trait-type and extension artifacts when mixin has computed properties and methods', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { attr } from '@ember-data/model';
import { computed } from '@ember/object';

export default Mixin.create({
	name: attr('string'),

	displayName: computed('name', function() {
		return \`Name: \${this.name}\`;
	}),

	getName() {
		return this.name || 'Unknown';
	}
});`;

      const artifacts = toArtifacts('app/mixins/nameable.js', input, {});

      // Should have trait, extension, and trait-type artifacts (no extension-type needed)
      expect(artifacts).toHaveLength(3);
      expect(artifacts.map((a) => a.type).sort()).toEqual(['extension', 'trait', 'trait-type']);

      const extension = artifacts.find((a) => a.type === 'extension');
      const traitType = artifacts.find((a) => a.type === 'trait-type');

      expect(traitType?.code).toMatchSnapshot('mixin trait type interface');
      expect(extension?.code).toMatchSnapshot('mixin extension code');
      expect(traitType?.suggestedFileName).toBe('nameable.schema.types.ts');
      expect(extension?.suggestedFileName).toBe('nameable.js');
    });

    it('generates only trait-type artifact when mixin has only data fields', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { attr, belongsTo } from '@ember-data/model';

export default Mixin.create({
	title: attr('string'),
	author: belongsTo('user', { async: true })
});`;

      const artifacts = toArtifacts('app/mixins/simple.js', input, {});

      // Should have trait and trait-type only (no extension for data-only mixins)
      expect(artifacts).toHaveLength(2);
      expect(artifacts.map((a) => a.type).sort()).toEqual(['trait', 'trait-type']);

      const traitType = artifacts.find((a) => a.type === 'trait-type');
      expect(traitType?.code).toMatchSnapshot('data-only trait type interface');
    });

    it('handles custom type mappings in mixin trait type interfaces', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { attr } from '@ember-data/model';

export default Mixin.create({
	id: attr('uuid'),
	amount: attr('currency'),
	metadata: attr('json')
});`;

      const customTypeMappings = {
        uuid: 'string',
        currency: 'number',
        json: 'Record<string, unknown>',
      };

      const artifacts = toArtifacts('app/mixins/typed.js', input, { customTypeMappings });
      const traitType = artifacts.find((a) => a.type === 'trait-type');

      expect(traitType?.code).toMatchSnapshot('mixin custom type mappings interface');
    });
  });

  describe('mirror flag', () => {
    it('generates correct imports regardless of mirror flag for mixins', () => {
      const input = `import Mixin from '@ember/object/mixin';
import { attr } from '@ember-data/model';

export default Mixin.create({
	name: attr('string'),
	email: attr('string')
});`;

      // Test with mirror flag
      const artifactsMirror = toArtifacts('app/mixins/basic.js', input, { mirror: true });
      const traitMirror = artifactsMirror.find((a) => a.type === 'trait');

      // Test without mirror flag
      const artifactsRegular = toArtifacts('app/mixins/basic.js', input, {});
      const traitRegular = artifactsRegular.find((a) => a.type === 'trait');

      // Mixins themselves don't generate @warp-drive imports, so they should be the same
      expect(traitMirror?.code).toBe(traitRegular?.code);
    });
  });

  describe('mixin inheritance', () => {
    it('produces trait with extended traits when using createWithMixins', () => {
      const input = `import { attr, hasMany } from '@ember-data/model';
import Mixin from '@ember/object/mixin';
import BaseModelMixin from './base-model';
import TimestampMixin from './timestamp';

export default Mixin.createWithMixins(BaseModelMixin, TimestampMixin, {
	description: attr('string'),
	files: hasMany('file', { async: false })
});`;

      const artifacts = toArtifacts('app/mixins/fileable.js', input, {});

      // Should produce trait and type artifacts (no extension since no methods/computed properties)
      expect(artifacts).toHaveLength(2);

      const trait = artifacts.find((a) => a.type === 'trait');
      const typeArtifact = artifacts.find((a) => a.type === 'trait-type');

      expect(trait).toBeDefined();
      expect(typeArtifact).toBeDefined();

      // Test that the trait includes the traits property
      expect(trait?.code).toContain('"traits": [');
      expect(trait?.code).toContain('"base-model"');
      expect(trait?.code).toContain('"timestamp"');
      expect(trait?.code).toContain('"name": "fileable"');
      expect(trait?.code).toContain('"mode": "legacy"');

      // Test that the type interface extends the parent trait interfaces
      expect(typeArtifact?.code).toContain('extends BaseModelTrait, TimestampTrait');

      // Test artifact metadata
      expect(
        artifacts.map((a) => ({ type: a.type, suggestedFileName: a.suggestedFileName, name: a.name }))
      ).toMatchSnapshot('inheritance artifact metadata');

      // Test generated code
      expect(trait?.code).toMatchSnapshot('inheritance trait code');
      expect(typeArtifact?.code).toMatchSnapshot('inheritance type code');
    });

    it('produces trait with single extended trait', () => {
      const input = `import { attr } from '@ember-data/model';
import Mixin from '@ember/object/mixin';
import BaseModelMixin from './base-model';

export default Mixin.createWithMixins(BaseModelMixin, {
	description: attr('string')
});`;

      const artifacts = toArtifacts('app/mixins/describable.js', input, {});

      const trait = artifacts.find((a) => a.type === 'trait');
      const typeArtifact = artifacts.find((a) => a.type === 'trait-type');

      expect(trait).toBeDefined();
      expect(typeArtifact).toBeDefined();

      // Test that the trait includes the single trait
      expect(trait?.code).toContain('"traits": [');
      expect(trait?.code).toContain('"base-model"');

      // Test that the type interface extends the single parent trait interface
      expect(typeArtifact?.code).toContain('extends BaseModelTrait');

      expect(trait?.code).toMatchSnapshot('single inheritance trait code');
      expect(typeArtifact?.code).toMatchSnapshot('single inheritance type code');
    });

    it('produces trait without traits property when no inheritance', () => {
      const input = `import { attr } from '@ember-data/model';
import Mixin from '@ember/object/mixin';

export default Mixin.create({
	description: attr('string')
});`;

      const artifacts = toArtifacts('app/mixins/describable.js', input, {});

      const trait = artifacts.find((a) => a.type === 'trait');
      const typeArtifact = artifacts.find((a) => a.type === 'trait-type');

      expect(trait).toBeDefined();
      expect(typeArtifact).toBeDefined();

      // Test that the trait does NOT include the traits property
      expect(trait?.code).not.toContain('"traits"');

      // Test that the type interface does not extend anything
      expect(typeArtifact?.code).not.toContain('extends');

      expect(trait?.code).toMatchSnapshot('no inheritance trait code');
      expect(typeArtifact?.code).toMatchSnapshot('no inheritance type code');
    });
  });

  describe('resource type stub generation', () => {
    it('generates stub for missing resource type files', () => {
      const input = `import { attr, hasMany, belongsTo } from '@ember-data/model';
import Mixin from '@ember/object/mixin';

export default Mixin.create({
	files: hasMany('file', { async: false }),
	user: belongsTo('user', { async: false }),
	name: attr('string')
});`;

      const options = {
        modelImportSource: 'test-app/models',
        resourcesImport: 'test-app/data/resources',
        resourcesDir: './test-output/resources',
        verbose: false,
        debug: false,
      };

      const artifacts = toArtifacts('app/mixins/fileable.js', input, options);

      // Should have trait, trait-type, and resource-type-stub artifacts
      expect(artifacts).toHaveLength(4); // trait, trait-type, file stub, user stub

      // Find the resource type stub artifacts
      const stubArtifacts = artifacts.filter((a) => a.type === 'resource-type-stub');
      expect(stubArtifacts).toHaveLength(2); // file and user

      const fileStub = stubArtifacts.find((a) => a.name === 'File');
      expect(fileStub).toBeDefined();
      expect(fileStub?.suggestedFileName).toBe('file.schema.types.ts');
      expect(fileStub?.code).toContain('export default interface File');
      expect(fileStub?.code).toContain('// Stub interface for File - generated automatically');

      const userStub = stubArtifacts.find((a) => a.name === 'User');
      expect(userStub).toBeDefined();
      expect(userStub?.suggestedFileName).toBe('user.schema.types.ts');
      expect(userStub?.code).toContain('export default interface User');
      expect(userStub?.code).toContain('// Stub interface for User - generated automatically');
    });

    it('generates multiple stubs for multiple missing resource types', () => {
      const input = `import { attr, hasMany, belongsTo } from '@ember-data/model';
import Mixin from '@ember/object/mixin';

export default Mixin.create({
	files: hasMany('file', { async: false }),
	user: belongsTo('user', { async: false }),
	comments: hasMany('comment', { async: true }),
	name: attr('string')
});`;

      const options = {
        modelImportSource: 'test-app/models',
        resourcesImport: 'test-app/data/resources',
        resourcesDir: './test-output/resources',
        verbose: false,
        debug: false,
      };

      const artifacts = toArtifacts('app/mixins/commentable.js', input, options);

      // Should have trait, extension, trait-type, and multiple resource-type-stub artifacts
      expect(artifacts.length).toBeGreaterThanOrEqual(4);

      // Find the resource type stub artifacts
      const stubArtifacts = artifacts.filter((a) => a.type === 'resource-type-stub');
      expect(stubArtifacts).toHaveLength(3); // file, user, comment

      const stubNames = stubArtifacts.map((a) => a.name).sort();
      expect(stubNames).toEqual(['Comment', 'File', 'User']);
    });
  });
});
