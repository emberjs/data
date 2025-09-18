import { describe, expect, it } from 'vitest';

import { toArtifacts } from '../../../src/schema-migration/model-to-schema.js';
import { createTestOptions, DEFAULT_TEST_OPTIONS } from '../test-helpers';

describe('model-to-schema transform (artifacts)', () => {
	describe('basic functionality', () => {
		it('produces schema and extension artifacts for basic model', () => {
			const input = `import Model, { attr, hasMany, belongsTo } from '@ember-data/model';

export default class User extends Model {
	@attr('string') name;
	@attr('string') email;
	@attr('boolean', { defaultValue: false }) isActive;
	@belongsTo('company', { async: false, inverse: null }) company;
	@hasMany('project', { async: true, inverse: 'owner' }) projects;

	get displayName() {
		return this.name || this.email;
	}

	async save() {
		return super.save();
	}
}`;

			const artifacts = toArtifacts('app/models/user.js', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(3);

			// Test artifact metadata
			expect(
				artifacts.map((a) => ({ type: a.type, suggestedFileName: a.suggestedFileName, name: a.name })),
			).toMatchSnapshot('artifact metadata');

			// Test generated code separately for better readability
			const schema = artifacts.find((a) => a.type === 'schema');
			const extension = artifacts.find((a) => a.type === 'extension');
			expect(schema?.code).toMatchSnapshot('schema code');
			expect(extension?.code).toMatchSnapshot('extension code');
		});

		it('produces only schema artifact when model has no methods or computed properties', () => {
			const input = `import Model, { attr } from '@ember-data/model';

export default class SimpleModel extends Model {
	@attr('string') name;
	@attr('number') count;
}`;

			const artifacts = toArtifacts('app/models/simple-model.js', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(2);
			expect(artifacts[0]?.type).toBe('schema');
			expect(artifacts[0]?.name).toBe('SimpleModelSchema');
		});

		it('handles model with mixins', () => {
			const input = `import Model, { attr } from '@ember-data/model';
import FileableMixin from 'app/mixins/fileable';
import TimestampableMixin from 'app/mixins/timestampable';

export default class Document extends Model.extend(FileableMixin, TimestampableMixin) {
	@attr('string') title;
	@attr('string') content;

	get wordCount() {
		return (this.content || '').split(' ').length;
	}
}`;

			const artifacts = toArtifacts('app/models/document.js', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(3);

			const schema = artifacts.find((a) => a.type === 'schema');
			expect(schema?.code).toContain('fileable');
			expect(schema?.code).toContain('timestampable');
			expect(schema?.code).toMatchSnapshot('schema with mixins');
		});

		it('supports alternate import sources', () => {
			const input = `import Model, { attr, hasMany } from '@auditboard/warp-drive/v1/model';

export default class CustomModel extends Model {
	@attr('string') name;
	@hasMany('item', { async: false }) items;
}`;

			const artifacts = toArtifacts(
				'app/models/custom-model.js',
				input,
				createTestOptions({
					emberDataImportSource: '@auditboard/warp-drive/v1/model',
				}),
			);
			expect(artifacts).toHaveLength(2);
			expect(artifacts[0]?.type).toBe('schema');
			expect(artifacts[0]?.code).toMatchSnapshot('custom import source');
		});

		it('handles complex field options correctly', () => {
			const input = `import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class ComplexModel extends Model {
	@attr('string', { defaultValue: 'default' }) name;
	@attr('date', { allowNull: true }) birthDate;
	@belongsTo('user', { async: true, inverse: 'profile', polymorphic: true }) owner;
	@hasMany('file', { async: false, inverse: null, as: 'fileable' }) attachments;
}`;

			const artifacts = toArtifacts('app/models/complex-model.js', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(2);
			expect(artifacts[0]?.code).toMatchSnapshot('complex field options');
		});

		it('preserves TypeScript syntax in extension properties', () => {
			const input = `import Model, { attr } from '@ember-data/model';
import { service } from '@ember/service';

export default class TypedModel extends Model {
	@service declare router: RouterService;
	@attr('string') declare name: string;

	complexMethod(): Promise<void> {
		return new Promise(resolve => {
			setTimeout(() => resolve(), 1000);
		});
	}

	get computedValue(): string {
		return \`Processed: \${this.name}\`;
	}
}`;

			const artifacts = toArtifacts('app/models/typed-model.ts', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(3);

			const extension = artifacts.find((a) => a.type === 'extension');
			expect(extension?.code).toMatchSnapshot('typescript extension');
		});

		it('correctly extracts kebab-case file names to schema types', () => {
			const input = `import Model, { attr } from '@ember-data/model';

export default class ProjectPlan extends Model {
	@attr('string') title;
}`;

			const artifacts = toArtifacts('app/models/project-plan.js', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(2);
			expect(artifacts[0]?.name).toBe('ProjectPlanSchema');
			expect(artifacts[0]?.suggestedFileName).toBe('project-plan.schema.js');
			// Verify the schema is valid by checking both structure and content
			expect(artifacts[0]?.code).toContain("'type': 'project-plan'");
			expect(artifacts[0]?.code).toContain('export const ProjectPlanSchema');
			expect(artifacts[0]?.code).toContain("'name': 'title'");
		});
	});

	describe('edge cases', () => {
		it('skips files that do not import from model sources', () => {
			const input = `import Component from '@glimmer/component';

export default class NotAModel extends Component {
	@attr('string') name;
}`;

			const artifacts = toArtifacts('app/components/not-a-model.js', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(0);
		});

		it('skips files that do not extend Model', () => {
			const input = `import Model, { attr } from '@ember-data/model';
import EmberObject from '@ember/object';

export default class NotExtendingModel extends EmberObject {
	@attr('string') name;
}`;

			const artifacts = toArtifacts('app/models/not-extending-model.js', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(0);
		});

		it('handles models with no fields gracefully', () => {
			const input = `import Model from '@ember-data/model';

export default class EmptyModel extends Model {
}`;

			const artifacts = toArtifacts('app/models/empty-model.js', input, DEFAULT_TEST_OPTIONS);
			// Empty models still generate a schema artifact (with just identity) and schema-type artifact
			expect(artifacts).toHaveLength(2);
			expect(artifacts[0]?.type).toBe('schema');
			expect(artifacts[0]?.code).toContain('export const EmptyModelSchema');
			expect(artifacts[1]?.type).toBe('schema-type');
		});

		it('handles aliased imports correctly', () => {
			const input = `import Model, { attr as attribute, hasMany as manyRelation } from '@ember-data/model';

export default class AliasedModel extends Model {
	@attribute('string') name;
	@manyRelation('item') items;
}`;

			const artifacts = toArtifacts('app/models/aliased-model.js', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(2);
			expect(artifacts[0]?.code).toMatchSnapshot('aliased imports');
		});

		it('ignores decorators from unsupported sources', () => {
			const input = `import Model, { attr } from '@ember-data/model';
import { customDecorator } from '@unsupported/source';

export default class MixedSourceModel extends Model {
	@attr('string') name;
	@customDecorator items; // Should be ignored and moved to extension
}`;

			const artifacts = toArtifacts('app/models/mixed-source-model.js', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(3);

			const schema = artifacts.find((a) => a.type === 'schema');
			const extension = artifacts.find((a) => a.type === 'extension');

			// Only 'name' should be in schema, not 'items'
			expect(schema?.code).toContain("'name': 'name'");
			expect(schema?.code).not.toContain('items');

			// Verify the schema is valid by checking structure
			expect(schema?.code).toContain('export const MixedSourceModelSchema');
			expect(schema?.code).toContain("'type': 'mixed-source-model'");

			// 'items' should be in extension
			expect(extension?.code).toContain('items');
		});

		it.skip('handles models extending base classes correctly', () => {
			const input = `import BaseModel from 'soxhub-client/core/base-model';
import BaseModelMixin from '@auditboard/client-core/mixins/base-model';
import { attr } from '@ember-data/model';

export default class AuditBoardModel extends BaseModel.extend(BaseModelMixin) {
	@attr('string') name;
	@attr('number') id;
}`;

			const artifacts = toArtifacts('app/models/auditboard-model.js', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(1);
			expect(artifacts[0]?.code).toMatchSnapshot('base model extension');
		});

		it('preserves complex object literal options', () => {
			const input = `import Model, { belongsTo } from '@ember-data/model';

export default class ComplexOptionsModel extends Model {
	@belongsTo('user', {
		async: true,
		inverse: 'profile',
		polymorphic: false,
		resetOnRemoteUpdate: false
	}) owner;
}`;

			const artifacts = toArtifacts('app/models/complex-options-model.js', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(2);
			expect(artifacts[0]?.code).toMatchSnapshot('complex options');
		});
	});

	describe('mixin handling', () => {
		it('extracts mixin names and converts them to trait references', () => {
			const input = `import Model, { attr } from '@ember-data/model';
import FileableMixin from '../mixins/fileable';

export default class Document extends Model.extend(FileableMixin) {
	@attr('string') title;
}`;

			const artifacts = toArtifacts('app/models/document.js', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(2);

			const schema = artifacts.find((a) => a.type === 'schema');
			expect(schema?.code).toMatchSnapshot('single mixin schema');
		});

		it('handles multiple mixins correctly', () => {
			const input = `import Model, { attr } from '@ember-data/model';
import FileableMixin from '../mixins/fileable';
import TimestampableMixin from '../mixins/timestampable';
import AuditableMixin from '../mixins/auditable';

export default class ComplexDocument extends Model.extend(FileableMixin, TimestampableMixin, AuditableMixin) {
	@attr('string') title;
}`;

			const artifacts = toArtifacts('app/models/complex-document.js', input, DEFAULT_TEST_OPTIONS);
			expect(artifacts).toHaveLength(2);

			const schema = artifacts.find((a) => a.type === 'schema');
			expect(schema?.code).toMatchSnapshot('multiple mixins schema');
		});
	});

	describe('TypeScript type artifacts', () => {
		it('generates schema-type artifact with proper interface for basic models', () => {
			const input = `import Model, { attr, hasMany, belongsTo } from '@ember-data/model';

export default class User extends Model {
	@attr('string') name;
	@attr('boolean', { defaultValue: false }) isActive;
	@belongsTo('company', { async: false }) company;
	@hasMany('project', { async: true }) projects;
}`;

			const artifacts = toArtifacts('app/models/user.js', input, DEFAULT_TEST_OPTIONS);

			// Should have schema and schema-type artifacts (no extension for data-only models)
			expect(artifacts).toHaveLength(2);
			expect(artifacts.map((a) => a.type).sort()).toEqual(['schema', 'schema-type']);

			const schemaType = artifacts.find((a) => a.type === 'schema-type');
			expect(schemaType?.code).toMatchSnapshot('basic schema type interface');
			expect(schemaType?.suggestedFileName).toBe('user.schema.types.js');
		});

		it('generates schema-type and extension artifacts when model has methods and computed properties', () => {
			const input = `import Model, { attr } from '@ember-data/model';

export default class ProcessedModel extends Model {
	@attr('string') name;
	@attr('string') content;

	get displayName() {
		return \`Processed: \${this.name}\`;
	}

	processContent() {
		return (this.content || '').toUpperCase();
	}
}`;

			const artifacts = toArtifacts('app/models/processed-model.js', input, DEFAULT_TEST_OPTIONS);

			// Should have schema, schema-type, and extension artifacts
			expect(artifacts).toHaveLength(3);
			expect(artifacts.map((a) => a.type).sort()).toEqual(['extension', 'schema', 'schema-type']);

			const schemaType = artifacts.find((a) => a.type === 'schema-type');
			const extension = artifacts.find((a) => a.type === 'extension');

			expect(schemaType?.code).toMatchSnapshot('model schema type interface');
			expect(extension?.code).toMatchSnapshot('model extension code');
			expect(schemaType?.suggestedFileName).toBe('processed-model.schema.types.js');
			expect(extension?.suggestedFileName).toBe('processed-model.js');
		});

		it('handles custom type mappings in schema type interfaces', () => {
			const input = `import Model, { attr } from '@ember-data/model';

export default class TypedModel extends Model {
	@attr('uuid') id;
	@attr('currency') amount;
	@attr('json') metadata;
}`;

			const customTypeMappings = {
				uuid: 'string',
				currency: 'number',
				json: 'Record<string, unknown>',
			};

			const artifacts = toArtifacts(
				'app/models/typed-model.js',
				input,
				createTestOptions({ typeMapping: customTypeMappings }),
			);
			const schemaType = artifacts.find((a) => a.type === 'schema-type');

			expect(schemaType?.code).toMatchSnapshot('custom type mappings interface');
		});

		it('handles relationship types correctly in schema type interfaces', () => {
			const input = `import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class RelationshipModel extends Model {
	@attr('string') name;
	@belongsTo('user', { async: false }) owner;
	@belongsTo('company', { async: true }) company;
	@hasMany('file', { async: false }) attachments;
	@hasMany('tag', { async: true }) tags;
}`;

			const artifacts = toArtifacts('app/models/relationship-model.js', input, DEFAULT_TEST_OPTIONS);
			const schemaType = artifacts.find((a) => a.type === 'schema-type');

			expect(schemaType?.code).toMatchSnapshot('relationship types interface');
		});

		it('uses unknown type for unsupported transforms', () => {
			const input = `import Model, { attr } from '@ember-data/model';

export default class UnknownTypesModel extends Model {
	@attr('custom-transform') customField;
	@attr('another-unknown') anotherField;
	@attr('string') knownField;
}`;

			const artifacts = toArtifacts('app/models/unknown-types-model.js', input, DEFAULT_TEST_OPTIONS);
			const schemaType = artifacts.find((a) => a.type === 'schema-type');

			expect(schemaType?.code).toMatchSnapshot('unknown types interface');
			expect(schemaType?.code).toContain('unknown');
		});
	});

	describe('custom type mappings', () => {
		it('applies custom type mappings to attribute types', () => {
			const input = `import Model, { attr } from '@ember-data/model';

export default class CustomTypesModel extends Model {
	@attr('uuid') id;
	@attr('timestamp') createdAt;
	@attr('currency') price;
}`;

			const customTypeMappings = {
				uuid: 'string',
				timestamp: 'Date',
				currency: 'number',
			};

			const artifacts = toArtifacts(
				'app/models/custom-types-model.js',
				input,
				createTestOptions({ typeMapping: customTypeMappings }),
			);
			const schemaType = artifacts.find((a) => a.type === 'schema-type');

			expect(schemaType?.code).toMatchSnapshot('custom type mappings in schema types');
		});

		it('falls back to unknown for unmapped custom types', () => {
			const input = `import Model, { attr } from '@ember-data/model';

export default class UnmappedTypesModel extends Model {
	@attr('unknown-transform') field1;
	@attr('another-unknown') field2;
}`;

			const artifacts = toArtifacts('app/models/unmapped-types-model.js', input, DEFAULT_TEST_OPTIONS);
			const schemaType = artifacts.find((a) => a.type === 'schema-type');

			expect(schemaType?.code).toMatchSnapshot('unknown fallback for unmapped types');
			expect(schemaType?.code).toContain('unknown');
		});
	});

	describe('mirror flag', () => {
		it('uses @warp-drive-mirror imports when mirror flag is set', () => {
			const input = `import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class MirrorTestModel extends Model {
	@attr('string') name;
	@belongsTo('user', { async: true }) owner;
	@hasMany('tag', { async: false }) tags;
}`;

			const artifacts = toArtifacts('app/models/mirror-test-model.js', input, createTestOptions({ mirror: true }));
			const schemaType = artifacts.find((a) => a.type === 'schema-type');

			expect(schemaType?.code).toContain('@warp-drive-mirror/core/types/symbols');
			expect(schemaType?.code).toContain('@ember-data/model');
			expect(schemaType?.code).not.toContain('@warp-drive/core/types/symbols');
			expect(schemaType?.code).not.toContain('@warp-drive/legacy/model');
		});

		it('uses @warp-drive imports when mirror flag is not set', () => {
			const input = `import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class RegularTestModel extends Model {
	@attr('string') name;
	@belongsTo('user', { async: true }) owner;
	@hasMany('tag', { async: false }) tags;
}`;

			const artifacts = toArtifacts('app/models/regular-test-model.js', input, DEFAULT_TEST_OPTIONS);
			const schemaType = artifacts.find((a) => a.type === 'schema-type');

			expect(schemaType?.code).toContain('@warp-drive/core/types/symbols');
			expect(schemaType?.code).toContain('@ember-data/model');
			expect(schemaType?.code).not.toContain('@warp-drive-mirror/core/types/symbols');
			expect(schemaType?.code).not.toContain('@warp-drive-mirror/legacy/model');
		});
	});
});
