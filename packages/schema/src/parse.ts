import chalk from 'chalk';
import path from 'path';
import { Glob } from 'bun';
import babel from '@babel/parser';
import _traverse from '@babel/traverse';
import { buildTraverse } from './parser/build-traverse';
import { parse } from 'url';

// bun compile has a bug where traverse gets unwrapped improperly
// so we have to manually grab the default export
const traverse = (_traverse as unknown as { default: typeof _traverse }).default;

function normalizeResourceType(fileName: string) {
  const dirname = path.dirname(fileName);
  const [resourceType] = path.basename(fileName).split('.');

  const fullType = dirname === '.' ? resourceType : `${dirname}/${resourceType}`;
  const matchType = resourceType;
  const KlassType = matchType
    .split('-')
    .map((word) => {
      return word[0].toUpperCase() + word.slice(1);
    })
    .join('');

  return {
    fullType,
    matchType,
    KlassType,
  };
}

function parseContent($contents: string) {
  const ast = babel.parse($contents, {
    sourceType: 'module',
    plugins: ['classProperties', 'classPrivateProperties', 'classStaticBlock', ['typescript', {}], ['decorators', {}]],
  });

  const context = {};
  traverse(ast, buildTraverse(context));

  return context;
}

async function parseSchemas(fileName: string, $contents: string) {
  const $potentialPrimaryResourceType = normalizeResourceType(fileName);
  console.log($potentialPrimaryResourceType);

  const context = parseContent($contents);

  // TODO - expand the schema into something useful

  return context;
}

function write($text: string) {
  process.stdout.write(chalk.gray($text));
}

async function main() {
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

  const schemaContent = await schemaFile.json();

  const schemaDirectory = path.join(process.cwd(), path.dirname(schemaPath), schemaContent.schemas);
  const schemaDestination = path.join(process.cwd(), path.dirname(schemaPath), schemaContent.dest);

  write(
    `\n\t\tParsing schemas from ${chalk.bold(
      chalk.cyan(path.relative(process.cwd(), schemaDirectory))
    )} into ${chalk.cyan(path.relative(process.cwd(), schemaDestination))}`
  );

  const glob = new Glob(`**/*.ts`);
  for await (const filePath of glob.scan(schemaDirectory)) {
    write(`\n\t\tParsing ${chalk.bold(chalk.cyan(filePath))}`);
    const fullPath = path.join(schemaDirectory, filePath);
    const file = Bun.file(fullPath);
    const contents = await file.text();
    const schemas = await parseSchemas(filePath, contents);
    console.log(schemas);
  }
}

await main();
