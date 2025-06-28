import { runBinCommand } from '../shared/parse-args.ts';
import { Bin } from './cmd.config.ts';

export function main(): Promise<void> {
  return runBinCommand(Bin);
}
