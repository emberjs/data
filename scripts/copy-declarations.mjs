import chalk from 'chalk';
import path from 'path';
import { globby } from 'globby';
import fs from 'fs';

/** @type {import('bun-types')} */

/**
 * A small script to copy all `.d.ts` files from a `src` directory
 * to a `dest` directory.
 *
 * This is useful because TypeScript doesn't include `.d.ts` files
 * in the output directory when using `tsc` to compile. So any manually
 * written `.d.ts` files wouldn't get copied into the published types
 * directory.
 *
 * Input directory defaults to `src`.
 * Output directory defaults to `unstable-preview-types`.
 *
 * Paths are relative to the current working directory from which
 * the script is run.
 *
 * @example
 * ```sh
 * bun ../../scripts/copy-declarations.mjs addon dist-types
 * ```
 */
async function main() {
  const args = Bun.argv.slice(2);

  if (args.length === 0) {
    args.push('src', 'unstable-preview-types');
  } else if (args.length === 1) {
    args.push('unstable-preview-types');
  }

  const [inputDir, outputDir] = args;
  const inputPath = path.resolve(process.cwd(), inputDir);
  const outputPath = path.resolve(process.cwd(), outputDir);
  const relativeInputPath = path.relative(process.cwd(), inputPath);
  const relativeOutputPath = path.relative(process.cwd(), outputPath);

  console.log(chalk.grey(chalk.bold(`\nCopying ${chalk.cyan('**/*.d.ts')} files\n\tfrom: ${chalk.yellow(relativeInputPath)}\n\tto: ${chalk.yellow(relativeOutputPath)}`)));

  const files = await globby([`${inputPath}/**/*.d.ts`]);

  if (files.length === 0) {
    console.log(chalk.red(`\nNo **/*.d.ts files found in ${chalk.white(relativeInputPath)}\n`));
    process.exitCode = 1;
  }

  console.log(chalk.grey(`\nFound ${chalk.cyan(files.length)} files\n`));

  for (const file of files) {
    const relativeFile = path.relative(process.cwd(), file);
    const innerPath = path.relative(inputPath, file);
    const outputFile = path.resolve(outputPath, innerPath);
    const relativeOutFile = path.relative(process.cwd(), outputFile);

    console.log(chalk.grey(`\t${chalk.cyan(relativeFile)} => ${chalk.green(relativeOutFile)}`));

    // ensure the output directory exists
    const outDir = path.dirname(outputFile);
    fs.mkdirSync(outDir, { recursive: true });

    const inFile = Bun.file(file);
    const outFile = Bun.file(outputFile);
    await Bun.write(outFile, inFile);
  }

  console.log(chalk.grey(chalk.bold(`\n✅ Copied ${chalk.cyan(files.length)} files\n`)));
}

await main();
