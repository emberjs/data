import chalk from 'chalk';
import path from 'path';
import { write } from '../utils/utils';

export type SchemaConfig = Awaited<ReturnType<typeof getSchemaConfig>>;

export async function getSchemaConfig() {
  const args = Bun.argv.slice(2);
  const [schemaPath] = args;

  write(
    `\n\t ${chalk.yellow('$')} ${chalk.bold(chalk.greenBright('@warp-drive/') + chalk.magentaBright('schema'))} ${chalk.cyan(chalk.bold('parse'))} ${schemaPath ?? chalk.red('<missing path>')}`
  );

  if (!schemaPath) {
    write(`\n\t${chalk.bold('💥 Error')} Please supply a path to the schema file to parse!\n`);
    process.exit(1);
  }

  const schemaFile = Bun.file(schemaPath);
  const schemaFileExists = await schemaFile.exists();

  if (!schemaFileExists) {
    write(`\n\t${chalk.bold('💥 Error')} ${chalk.white(schemaPath)} does not exist!`);
    process.exit(1);
  }

  const config = await schemaFile.json();
  const schemaDirectory = path.join(process.cwd(), path.dirname(schemaPath), config.schemas);
  const schemaDestination = path.join(process.cwd(), path.dirname(schemaPath), config.dest);

  return {
    _config: config,
    schemaPath,
    relativeSchemaDirectory: path.relative(process.cwd(), schemaDirectory),
    relativeSchemaDestination: path.relative(process.cwd(), schemaDestination),
    fullSchemaDirectory: schemaDirectory,
    fullSchemaDestination: schemaDestination,
  };
}
