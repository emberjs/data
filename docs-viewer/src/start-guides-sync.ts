#! /usr/bin/env bun

import { watch } from 'fs';
import { main } from './prepare-website';
import { join } from 'path';
import { postProcessApiDocs } from './site-utils';

const guidesPath = join(__dirname, '../../guides');
const contributingPath = join(__dirname, '../../contributing');
const apiDocsPath = join(__dirname, '../tmp/api');

let debounce: ReturnType<typeof setTimeout> | null = null;

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
    }, 10);
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
    }, 10);
  }
);

// @ts-expect-error missing from Bun types
watch(
  apiDocsPath,
  {
    recursive: false,
  },
  (eventName: 'rename' | 'change', fileName: string) => {
    console.log('triggered', eventName, fileName);
    if (debounce) {
      console.log('debounced');
      clearTimeout(debounce);
    }
    debounce = setTimeout(() => {
      console.log('rebuilding');
      postProcessApiDocs();
      debounce = null;
    }, 1000);
  }
);
