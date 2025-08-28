import chalk from 'chalk';
import path from 'path';
import { globby } from 'globby';
import fs from 'fs';
import JSONC from 'comment-json';
import debug from 'debug';

const log = debug('wd:build:move-types');
log.enabled = true;

/** @type {import('bun-types')} */

/**
 * Moves `*.d.ts` files from `dist/declarations` to the directory
 * specified by tsconfig.json
 */
export function MoveTypesToDestination(options, resolve) {
  return {
    name: 'MoveTypesToDestination',
    async closeBundle() {
      const tsconfigPath = resolve('./tsconfig.json').slice(7).replace('/node_modules/.vite-temp/', '/');
      if (!fs.existsSync(tsconfigPath)) {
        log(`No tsconfig detected, skipping MoveTypesToDestination`);
        return;
      }
      const tsconfig = JSONC.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      const relativeOutputPath = tsconfig.compilerOptions?.declarationDir ?? './declarations';
      const relativeInputPath = './dist/declarations';
      const projectDir = tsconfigPath.replace('/tsconfig.json', '/');
      const outputPath = path.join(projectDir, relativeOutputPath);
      const inputPath = path.join(projectDir, relativeInputPath);

      console.log(
        chalk.grey(
          chalk.bold(
            `\nCopying ${chalk.cyan('**/*.d.ts')} files\n\tfrom: ${chalk.yellow(relativeInputPath)}\n\tto: ${chalk.yellow(
              relativeOutputPath
            )}`
          )
        )
      );

      const files = await globby([`${inputPath}/**/*.d.ts`]);

      if (files.length === 0) {
        log(chalk.red(`\nNo **/*.d.ts files found in ${chalk.white(relativeInputPath)}\n`));
        return;
      }

      log(chalk.grey(`\nFound ${chalk.cyan(files.length)} files\n`));

      for (const file of files) {
        const relativeFile = path.relative(projectDir, file);
        const innerPath = path.relative(inputPath, file);
        const outputFile = path.resolve(outputPath, innerPath);
        const relativeOutFile = path.relative(projectDir, outputFile);

        log(chalk.grey(`\t${chalk.cyan(relativeFile)} => ${chalk.green(relativeOutFile)}`));

        // ensure the output directory exists
        const outDir = path.dirname(outputFile);
        fs.mkdirSync(outDir, { recursive: true });
        fs.renameSync(file, outputFile);
      }

      console.log(chalk.grey(chalk.bold(`\n✅ Copied ${chalk.cyan(files.length)} files\n`)));
    },
  };
}
