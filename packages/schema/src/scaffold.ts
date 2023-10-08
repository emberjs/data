import chalk from 'chalk';
import path from 'path';
import os from 'os';

function write($text: string) {
  console.log(chalk.gray($text));
}

const Scaffolds = [
  'resource',
  'trait',
  'field',
  'derivation',
  'transform',
];

function getRelativePathToRoot($path: string) {
  return `~/${path.relative(os.homedir(), $path)}`;
}

async function loadOrCreateConfig(): Promise<Record<string, unknown> & { DID_GENERATE: boolean }> {
  const configPath = path.join(process.cwd(), './schema.json');
  const filePointer = Bun.file(configPath);
  const fileExists = await filePointer.exists();

  if (fileExists) {
    const config = await filePointer.json();
    config.DID_GENERATE = false;
    return config;
  }

  const config: Record<string, unknown> = {
    schemas: "./schemas",
    "dest": "./dist"
  }

  write(`\n\t🔨 Generating new ${chalk.yellow('schema.json')} configuration file in ${chalk.cyan(getRelativePathToRoot(process.cwd()))}`);

  await Bun.write(filePointer, JSON.stringify(config, null, 2));
  config.DID_GENERATE = true;
  return config as Record<string, unknown> & { DID_GENERATE: true };
}

function classify($name: string) {
  let str = $name.split('-').map((word) => {
    return word[0].toUpperCase() + word.slice(1);
  }).join('');
  str = str.split('_').map((word) => {
    return word[0].toUpperCase() + word.slice(1);
  }).join('');
  str = str[0].toUpperCase() + str.slice(1);
  return str;
}

function singularize($name: string) {
  if ($name.endsWith('ies')) {
    return $name.slice(0, -3) + 'y';
  } else if ($name.endsWith('es')) {
    return $name.slice(0, -2);
  } else if ($name.endsWith('s')) {
    return $name.slice(0, -1);
  } else {
    return $name;
  }
}

function generateFirstResource($type: string) {
  const className = classify(singularize($type));

  return `import { collection, createonly, derived, field, optional, readonly, resource, Resource } from '@warp-drive/schema-decorators';

@Resource // Resource is a default "Trait" that provides the "id" and "$type" fields used by @warp-drive/schema-record
class ${className} {
  // @optional - An optional field is one that may be omitted during create.
  // @readonly - A readonly field is one that may never be created or edited.
  // @createonly - A createonly field is one that may only be set during create.

  // We use declare to tell TypeScript that this field exists
  // We use the declared type to set the "cache" type for the field (what the API returns)
  // declare myField: string;

  // We use the field decorator to provide a "Transform" function for the field.
  // The transform's return type will be used as the "UI" type for the field.
  // e.g. "Date" instead of "string"
  // @field('luxon') declare someDateField: string;

  // We use the collection decorator to create a linkage to a collection of other resources
  // @collection('comment', { inverse: 'post' }) declare comments: Comment[];

  // We use the resource decorator to create a linkage to another resource
  // if the related resource will not always be present use \`| null\` with the type
  // @resource('user', { inverse: 'posts' }) declare author: User;

  // We use the derived decorator to create a field that is derived from other fields
  // Note your project can provide its own decorators that can simplify this.
  // @derived('concat', { fields: ['firstName', 'lastName'], separator: ' ' }) declare fullName: string;
}

export { ${className} };
`;
}


function generateResource($type: string) {
  const className = classify(singularize($type));

  return `import { Resource } from '@warp-drive/schema-decorators';

@Resource
class ${className} {
  // ...
}

export { ${className} };
`;
}


async function main() {
  const args = Bun.argv.slice(2);
  const [resource, name] = args;

  write(`\n\t $ ${chalk.bold(chalk.greenBright('@warp-drive/') + chalk.magentaBright('schema'))} ${chalk.bold('scaffold')} ${resource ?? chalk.red('<mising type>')} ${name ?? chalk.red('<missing name>')}`);

  if (!Scaffolds.includes(resource)) {
    write(`\n\t${chalk.bold('💥 Error')} ${chalk.white(resource)} is not a valid scaffold.`);
    write(`\n\t${chalk.bold('Available Scaffolds')}\n\t\t◆ ${Scaffolds.join(',\n\t\t◆ ')}\n`);
    return;
  }

  if (!name) {
    write(`\n\t${chalk.bold('💥 Error')} Please supply a name for the ${chalk.white(resource)} to scaffold!\n`);
    return;
  }

  const config = await loadOrCreateConfig();
  const relativeWritePath = resource === 'resource' ? `${config.schemas}/${name}.ts` : `${config.schemas}/-${resource}s/${name}.ts`;

  const file = Bun.file(path.join(process.cwd(), relativeWritePath));
  const fileExists = await file.exists();

  if (fileExists) {
    write(`\n\t${chalk.bold('💥 Error')} ${chalk.white(relativeWritePath)} already exists! Skipping Scaffold.\n`);
    return;
  }

  switch (resource) {
    case 'resource':
      await Bun.write(file, config.DID_GENERATE ? generateFirstResource(name) : generateResource(name));
      break;
    default:
      break;
  }

  write(`\n\t🔨 Scaffolding new ${chalk.bold(chalk.cyan(name))} ${chalk.bold(chalk.white(resource))} in ${relativeWritePath}...`);
  console.log(args);
}

await main();
