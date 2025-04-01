#! /usr/bin/env bun

/**
 * Rebuilds the data used by the docs viewer app
 */

import { generateDocs } from './-utils.ts';

async function main() {
  await generateDocs();
}

main();
