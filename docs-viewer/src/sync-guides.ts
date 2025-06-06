#! /usr/bin/env bun

import { watch, existsSync, readdirSync } from 'fs';
import { main } from './prepare-website';
import { join } from 'path';
import { postProcessApiDocs } from './site-utils';
import { $ } from 'bun';

const guidesPath = join(__dirname, '../../guides');
const contributingPath = join(__dirname, '../../contributing');
const apiDocsPath = join(__dirname, '../tmp/api');
const oldPackages = join(__dirname, '../../packages');
const newPackages = join(__dirname, '../../warp-drive-packages');

async function updateApiDocs() {
  await $`typedoc`;
  postProcessApiDocs();
}

// ensure directory exists and can be watched
if (!existsSync(apiDocsPath)) {
  await updateApiDocs();
}

const Packages: string[] = [];
for (const packagePath of readdirSync(oldPackages)) {
  if (existsSync(join(oldPackages, packagePath, 'typedoc.config.mjs'))) {
    Packages.push(join(oldPackages, packagePath, 'src'));
  }
}
for (const packagePath of readdirSync(newPackages)) {
  if (existsSync(join(newPackages, packagePath, 'typedoc.config.mjs'))) {
    Packages.push(join(newPackages, packagePath, 'src'));
  }
}

let debounce: ReturnType<typeof setTimeout> | null = null;
let packageDebounce: ReturnType<typeof setTimeout> | null = null;

for (const packagePath of Packages) {
  watch(
    packagePath,
    {
      recursive: true,
    },
    () => {
      console.log('package changed', packagePath);
      if (packageDebounce) {
        console.log('debounced');
        clearTimeout(packageDebounce);
      }
      debounce = setTimeout(() => {
        console.log('rebuilding');
        updateApiDocs();
        debounce = null;
      }, 1000);
    }
  );
}

// @ts-expect-error missing from Bun types
watch(
  guidesPath,
  {
    recursive: true,
  },
  (eventName: 'rename' | 'change', fileName: string) => {
    console.log('triggered', eventName, fileName);
    if (debounce) {
      console.log('debounced');
      clearTimeout(debounce);
    }
    debounce = setTimeout(() => {
      console.log('rebuilding');
      main();
      debounce = null;
    }, 100);
  }
);

// @ts-expect-error missing from Bun types
watch(
  contributingPath,
  {
    recursive: true,
  },
  (eventName: 'rename' | 'change', fileName: string) => {
    console.log('triggered', eventName, fileName);
    if (debounce) {
      console.log('debounced');
      clearTimeout(debounce);
    }
    debounce = setTimeout(() => {
      console.log('rebuilding');
      main();
      debounce = null;
    }, 100);
  }
);

await $`vitepress dev docs.warp-drive.io`;
