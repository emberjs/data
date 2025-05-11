import { watch } from 'fs';
import { main } from './prepare-website';
import { join } from 'path';

const guidesPath = join(__dirname, '../../guides');

let debounce: ReturnType<typeof setTimeout> | null = null;

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
