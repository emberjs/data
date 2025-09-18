import { toArtifacts } from '../../../packages/codemods/src/schema-migration/model-to-schema.ts';
import { readFileSync } from 'fs';

const input = readFileSync('tests/__testfixtures__/migrate-to-schema/models/basic-attributes.input.ts', 'utf-8');
const artifacts = toArtifacts('app/models/user.ts', input, {
  resourcesImport: 'test-app/data/resources',
  verbose: false
});

console.log('Number of artifacts:', artifacts.length);
artifacts.forEach((artifact, i) => {
  console.log(`Artifact ${i}: type=${artifact.type}, name=${artifact.name}`);
  console.log('Code preview:', artifact.code.substring(0, 300) + '...');
  console.log('---');
});