import chalk from 'chalk';
import path from 'path';
import { Glob } from 'bun';
import { SchemaModule, parseSchemaFile } from '../utils/process-file';
import { write } from '../utils/utils';
import { SchemaConfig } from './get-config';

export async function gatherSchemaFiles(config: SchemaConfig) {
  const { fullSchemaDirectory, relativeSchemaDirectory } = config;
  write(`\n\t\tParsing schema files from ${chalk.bold(chalk.cyan(relativeSchemaDirectory))}`);
  const modules = new Map<string, SchemaModule>();

  const glob = new Glob(`**/*.ts`);
  for await (const filePath of glob.scan(fullSchemaDirectory)) {
    write(`\n\t\tParsing ${chalk.bold(chalk.cyan(filePath))}`);
    const fullPath = path.join(fullSchemaDirectory, filePath);
    const file = Bun.file(fullPath);
    const contents = await file.text();
    const schemaModule = await parseSchemaFile(filePath, contents);
    modules.set(filePath, schemaModule);
  }

  return modules;
}
