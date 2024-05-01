import { getSchemaConfig } from './parser/steps/get-config';
import { gatherSchemaFiles } from './parser/steps/gather-schema-files';
import { compileJSONSchemas } from './parser/compile/json';

async function main() {
  const config = await getSchemaConfig();

  const modules = await gatherSchemaFiles(config);
  const compiledJson = await compileJSONSchemas(modules);

  console.log(compiledJson);
}

await main();
