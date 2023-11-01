import parse from '../dist/parse.js';
import fs from 'fs';
import path from 'path';
import schemas from './schemas.js';

const input = fs.readFileSync(path.join(import.meta.dir, './example.aql'), 'utf8');
await parse(input, schemas);
