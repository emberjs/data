import chalk from 'chalk';
import { SchemaModule } from '../utils/process-file';
import { write } from '../utils/utils';
import { Schema } from './json-schema-spec';

export async function compileJSONSchemas(modules: Map<string, SchemaModule>) {
  const compiled: Schema[] = [];

  for (const [filePath, module] of modules) {
    if (module.exports.length === 0) {
      write(
        `\n\t\t${chalk.bold(chalk.yellow('⚠️  caution: '))} No exported schemas found in ${chalk.bold(chalk.yellow(filePath))}`
      );
    }

    if (module.exports.length > 1) {
      write(
        `\n\t\t${chalk.bold(chalk.red('❌  error: '))} Multiple exported schemas found in ${chalk.bold(chalk.red(filePath))}`
      );
      process.exit(1);
    }

    const klassSchema = module.exports[0];
    const { FullKlassType, KlassType, fullType } = module.$potentialPrimaryResourceType;

    if (klassSchema.name !== FullKlassType && klassSchema.name !== KlassType) {
      write(
        `\n\t\t${chalk.bold(chalk.yellow('⚠️  caution: '))} Exported schema ${chalk.bold(klassSchema.name)} in ${fullType} does not seem to match the expected name of ${chalk.bold(FullKlassType)}`
      );
    }

    const schema: Partial<Schema> = {
      '@type': fullType,
    };

    // compile traits

    // compile fields
  }

  return compiled;
}
