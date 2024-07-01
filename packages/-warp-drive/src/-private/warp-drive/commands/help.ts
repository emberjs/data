import type { BinConfig } from '../../shared/parse-args.ts';

export function help(Bin: BinConfig) {
  return async () => {
    const { printDocs } = await import('../../shared/docs.ts');
    printDocs(Bin);
  };
}
