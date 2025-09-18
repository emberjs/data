import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';

export interface ConfigOptions {
	dryRun?: boolean;
	verbose?: boolean;
	debug?: boolean;
	mirror?: boolean;
	emberDataImportSource?: string;
	intermediateModelPaths?: string[] | string;
	modelImportSource?: string;
	mixinImportSource?: string;
	modelSourceDir?: string;
	mixinSourceDir?: string;
	additionalModelSources?: Array<{ pattern: string; dir: string }>;
	additionalMixinSources?: Array<{ pattern: string; dir: string }>;
	resourcesImport?: string;
	traitsDir?: string;
	traitsImport?: string;
	extensionsDir?: string;
	extensionsImport?: string;
	resourcesDir?: string;
	typeMapping?: Record<string, string> | string;
	modelsOnly?: boolean;
	mixinsOnly?: boolean;
	skipProcessed?: boolean;
	config?: string;
	input?: string;
	output?: string;
	runPostTransformLinting?: boolean;
	runPostTransformPrettier?: boolean;
	eslintConfigPath?: string;
	prettierConfigPath?: string;
}

export interface FullConfig extends ConfigOptions {
	$schema?: string;
	version?: string;
	description?: string;
}

/**
 * Load configuration from a JSON file
 */
export function loadConfig(configPath: string): ConfigOptions {
	if (!existsSync(configPath)) {
		throw new Error(`Configuration file not found: ${configPath}`);
	}

	try {
		const content = readFileSync(configPath, 'utf8');
		const config = JSON.parse(content) as FullConfig;

		// Remove metadata fields that shouldn't be used as CLI options
		const { $schema: _schema, version: _version, description: _description, ...options } = config;

		// Resolve relative paths in config relative to the config file's directory
		const resolvedOptions = resolveConfigPaths(options, dirname(configPath));

		return resolvedOptions;
	} catch (error) {
		throw new Error(`Failed to parse configuration file: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Save configuration to a JSON file
 */
export function saveConfig(configPath: string, options: ConfigOptions): void {
	const fullConfig: FullConfig = {
		$schema: './config-schema.json',
		version: '1.0.0',
		description: 'Configuration for warp-drive-codemod',
		...options,
	};

	try {
		const content = JSON.stringify(fullConfig, null, 2);
		writeFileSync(configPath, content, 'utf8');
	} catch (error) {
		throw new Error(`Failed to save configuration file: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Merge CLI options with config file options, with CLI taking precedence
 */
export function mergeOptions(cliOptions: ConfigOptions, configOptions: ConfigOptions = {}): ConfigOptions {
	const merged: ConfigOptions = { ...configOptions };

	// CLI options override config file options
	for (const [key, value] of Object.entries(cliOptions)) {
		if (value !== undefined) {
			(merged as Record<string, unknown>)[key] = value;
		}
	}

	return merged;
}

/**
 * Interactive configuration generator
 */
export async function generateConfig(): Promise<ConfigOptions> {
	// Dynamic import to avoid type issues with inquirer
	const { default: inquirer } = await import('inquirer');

	console.log('🔧 Warp Drive Codemod Configuration Generator\n');
	console.log('This tool will help you create a configuration file for consistent codemod execution.\n');

	// Default to configuring for both transform types
	const answers: Record<string, unknown> = {
		transformType: 'both',
	};

	const promptAnswers: Record<string, unknown> = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'mirror',
			message: 'Use @warp-drive-mirror instead of @warp-drive for imports?',
			default: false,
		},
		{
			type: 'input',
			name: 'emberDataImportSource',
			message: 'EmberData import source (leave empty for default):',
			default: '',
		},
		{
			type: 'input',
			name: 'modelImportSource',
			message: 'Base import path for existing model imports (leave empty for default):',
			default: '',
		},
		{
			type: 'input',
			name: 'resourcesImport',
			message: 'Base import path for new resource type imports (leave empty for default):',
			default: '',
		},
	]);

	// Merge prompt answers with initial answers
	Object.assign(answers, promptAnswers);

	// Additional questions for model-to-schema transforms
	if (answers.transformType === 'model-to-schema' || answers.transformType === 'both') {
		const modelAnswers: Record<string, unknown> = await inquirer.prompt([
			{
				type: 'input',
				name: 'baseModelImportPath',
				message: 'Base model import path to recognize (leave empty for default):',
				default: '',
			},
			{
				type: 'input',
				name: 'resourcesDir',
				message: 'Directory to write generated Schemas to:',
				default: './schemas',
			},
			{
				type: 'input',
				name: 'extensionsDir',
				message: 'Directory to write generated Extensions to:',
				default: './extensions',
			},
		]);
		Object.assign(answers, modelAnswers);
	}

	// Additional questions for mixin-to-schema transforms
	if (answers.transformType === 'mixin-to-schema' || answers.transformType === 'both') {
		const mixinAnswers: Record<string, unknown> = await inquirer.prompt([
			{
				type: 'input',
				name: 'traitsDir',
				message: 'Directory to write generated trait schemas to:',
				default: './traits',
			},
			{
				type: 'input',
				name: 'extensionsDir',
				message: 'Directory to write generated Extensions to (if not already set):',
				default: (answers.extensionsDir as string) || './extensions',
				when: !answers.extensionsDir,
			},
		]);
		Object.assign(answers, mixinAnswers);
	}

	// Post-transform configuration
	const postTransformAnswers: Record<string, unknown> = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'runPostTransformLinting',
			message: 'Run ESLint unused-imports rules after transformation?',
			default: true,
		},
		{
			type: 'confirm',
			name: 'runPostTransformPrettier',
			message: 'Run Prettier formatting after transformation?',
			default: true,
		},
		{
			type: 'input',
			name: 'eslintConfigPath',
			message: 'Path to ESLint configuration file (leave empty for auto-detection):',
			default: '',
		},
		{
			type: 'input',
			name: 'prettierConfigPath',
			message: 'Path to Prettier configuration file (leave empty for auto-detection):',
			default: '',
		},
	]);

	// Type mapping configuration
	const typeMappingAnswer: Record<string, unknown> = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'configureTypeMapping',
			message: 'Would you like to configure custom type mappings?',
			default: false,
		},
	]);

	const typeMapping: Record<string, string> = {};
	if (typeMappingAnswer.configureTypeMapping) {
		console.log('\nConfigure type mappings for custom EmberData transforms:');
		let addMore = true;
		while (addMore) {
			const mappingAnswers: Record<string, unknown> = await inquirer.prompt([
				{
					type: 'input',
					name: 'transformType',
					message: 'Transform type (e.g., "uuid", "currency"):',
					validate: (input: string) => input.trim().length > 0 || 'Transform type cannot be empty',
				},
				{
					type: 'input',
					name: 'typescriptType',
					message: 'TypeScript type (e.g., "string", "number"):',
					validate: (input: string) => input.trim().length > 0 || 'TypeScript type cannot be empty',
				},
			]);

			typeMapping[mappingAnswers.transformType as string] = mappingAnswers.typescriptType as string;

			const continueAnswer: Record<string, unknown> = await inquirer.prompt([
				{
					type: 'confirm',
					name: 'addAnother',
					message: 'Add another type mapping?',
					default: false,
				},
			]);

			addMore = continueAnswer.addAnother as boolean;
		}
	}

	// Clean up the answers object and remove empty string values
	const { transformType: _transformType, ...config } = answers;

	const finalConfig: ConfigOptions = {
		...(Object.keys(typeMapping).length > 0 && { typeMapping }),
		...postTransformAnswers,
	};

	// Add non-empty config values
	Object.entries(config as ConfigOptions).forEach(([key, value]) => {
		if (value !== undefined && value !== '') {
			(finalConfig as Record<string, unknown>)[key] = value;
		}
	});

	return finalConfig;
}

/**
 * Validate that required directories and import paths are specified for a given transform type
 */
export function validateConfigForTransform(
	config: ConfigOptions,
	transformType: 'model-to-schema' | 'mixin-to-schema',
): string[] {
	const errors: string[] = [];

	// Validate required import paths for all transforms
	if (!config.modelImportSource) {
		errors.push('modelImportSource is required for all transforms');
	}
	if (!config.resourcesImport) {
		errors.push('resourcesImport is required for all transforms');
	}

	if (transformType === 'model-to-schema') {
		if (!config.resourcesDir) {
			errors.push('resourcesDir is required for model-to-schema transforms');
		}
		if (!config.extensionsDir) {
			errors.push('extensionsDir is required for model-to-schema transforms');
		}
	} else if (transformType === 'mixin-to-schema') {
		if (!config.traitsDir) {
			errors.push('traitsDir is required for mixin-to-schema transforms');
		}
		if (!config.extensionsDir) {
			errors.push('extensionsDir is required for mixin-to-schema transforms');
		}
	}

	return errors;
}

/**
 * Resolve relative paths in configuration options relative to a base directory
 * @param config The configuration options
 * @param baseDir The base directory to resolve relative paths against (typically the config file's directory)
 */
export function resolveConfigPaths(config: ConfigOptions, baseDir: string): ConfigOptions {
	const resolved = { ...config };

	// List of config properties that contain paths
	const pathProperties: Array<keyof ConfigOptions> = [
		'traitsDir',
		'extensionsDir',
		'resourcesDir',
		'modelSourceDir',
		'mixinSourceDir',
	];

	for (const prop of pathProperties) {
		const value = resolved[prop];
		if (typeof value === 'string' && value) {
			// If the path is relative, resolve it relative to the base directory
			if (!isAbsolute(value)) {
				(resolved as Record<string, unknown>)[prop] = resolve(baseDir, value);
			}
		}
	}

	// Handle additionalModelSources and additionalMixinSources arrays
	if (resolved.additionalModelSources) {
		resolved.additionalModelSources = resolved.additionalModelSources.map((source) => ({
			...source,
			dir: isAbsolute(source.dir) ? source.dir : resolve(baseDir, source.dir),
		}));
	}

	if (resolved.additionalMixinSources) {
		resolved.additionalMixinSources = resolved.additionalMixinSources.map((source) => ({
			...source,
			dir: isAbsolute(source.dir) ? source.dir : resolve(baseDir, source.dir),
		}));
	}

	return resolved;
}

/**
 * Normalize directory paths from CLI arguments
 * @param options The configuration options from CLI
 * @param cwd The current working directory
 */
export function normalizeCliPaths(options: ConfigOptions, cwd: string = process.cwd()): ConfigOptions {
	const normalized = { ...options };

	// List of config properties that contain paths
	const pathProperties: Array<keyof ConfigOptions> = [
		'traitsDir',
		'extensionsDir',
		'resourcesDir',
		'modelSourceDir',
		'mixinSourceDir',
	];

	for (const prop of pathProperties) {
		const value = normalized[prop];
		if (typeof value === 'string' && value) {
			// If the path is relative, resolve it relative to cwd
			if (!isAbsolute(value)) {
				(normalized as Record<string, unknown>)[prop] = resolve(cwd, value);
			}
		}
	}

	// Handle additionalModelSources and additionalMixinSources arrays
	if (normalized.additionalModelSources) {
		normalized.additionalModelSources = normalized.additionalModelSources.map((source) => ({
			...source,
			dir: isAbsolute(source.dir) ? source.dir : resolve(cwd, source.dir),
		}));
	}

	if (normalized.additionalMixinSources) {
		normalized.additionalMixinSources = normalized.additionalMixinSources.map((source) => ({
			...source,
			dir: isAbsolute(source.dir) ? source.dir : resolve(cwd, source.dir),
		}));
	}

	return normalized;
}
