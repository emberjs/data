import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import { write as performWrite } from '../../shared/utils';

const TAB = '  ';
function write(str: string) {
  performWrite(str.replaceAll('\t', TAB));
}

export async function install(flags: { full: Map<string, string | number | boolean | null> }) {
  const root = flags.full.get('root') as string;
  const pkgPath = path.join(root, 'package.json');
  const pkgExists = fs.existsSync(pkgPath);
  const tsconfigPath = flags.full.get('tsconfig') as string;
  const tsconfigFilePath = path.join(root, tsconfigPath);
  const tsConfigExists = fs.existsSync(tsconfigFilePath);
  const srcPath = flags.full.get('src_dir') as string;
  const srcDir = path.join(root, srcPath);
  const srcDirExists = fs.existsSync(srcDir);

  const lines = [
    `Project: ${chalk.cyan(root)}`,
    `Package Manager: ${chalk.cyan(flags.full.get('use'))}`,
    `Configs & Directories`,

    `\tpkg  \t${pkgExists ? '✅ ' + chalk.greenBright(pkgPath) : '⚠️  ' + chalk.yellowBright(pkgPath) + chalk.grey(' (will generate)')}`,
    `\ttypes\t${tsConfigExists ? '✅ ' + chalk.greenBright(tsconfigFilePath) : '⚠️  ' + chalk.yellowBright(tsconfigFilePath) + chalk.grey(' (will generate)')}`,
    `\tsrc  \t${srcDirExists ? '✅ ' + chalk.greenBright(srcDir) : '⚠️  ' + chalk.yellowBright(srcDir) + chalk.grey(' (will generate)')}`,
  ];

  const features = [
    {
      name: 'core',
      selections: ['json:api'],
      packages: {
        '@ember-data/request': '5.4.0-canary.128',
        '@ember-data/request-utils': '5.4.0-canary.128',
        '@warp-drive/core-types': '5.4.0-canary.128',
        '@warp-drive/build-config': '5.4.0-canary.128',
      },
    },
    {
      name: 'normalized cache',
      selections: ['json:api'],
      packages: {
        '@ember-data/store': '5.4.0-canary.128',
        '@ember-data/json-api': '5.4.0-canary.128',
      },
    },
    {
      name: 'reactivity',
      selections: ['ember'],
      packages: {
        '@ember-data/tracking': '5.4.0-canary.128',
        '@warp-drive/schema-record': '5.4.0-canary.128',
      },
    },
    {
      name: 'ember',
      packages: {
        '@warp-drive/ember': '5.4.0-canary.128',
      },
    },
    {
      name: 'experimental features',
      selections: ['data-worker', 'persisted-cache'],
      packages: {
        '@warp-drive/experiments': '5.4.0-canary.128',
      },
    },
  ];

  const files = [
    {
      name: 'core',
      selections: ['ember', 'normalized cache', 'data-worker'],
      files: [
        './data/handlers/.gitkeep',
        './data/builders/.gitkeep',
        './data/schemas/.gitkeep',
        './data/derivations/.gitkeep',
        './services/store.ts',
        './workers/data-worker.ts',
        './app.ts',
        '../ember-cli-build.js',
      ],
    },
  ];

  write(`\n\n\n\tWarpDrive Install\n\t${chalk.cyan('=================')}\n\n`);
  write(lines.map((l) => `\t` + chalk.white(l)).join(`\n`));
  write(`\n\tFeatures`);
  write(
    features
      .map((feature) => {
        const packages = Object.entries(feature.packages).map(([name, version]) => {
          return chalk.magenta(name.padEnd(25, ' ')) + ' : ' + chalk.yellow(version);
        });
        return `\t\t${chalk.bold(chalk.cyan(feature.name))}\n\t\t\tselections: ${feature.selections?.map((s) => chalk.magenta(s)).join(', ') ?? chalk.grey('N/A')}\n\t\t\tpackages:\n\t\t\t\t${packages.join('\n\t\t\t\t')}`;
      })
      .join(`\n`)
  );
  write(`\n\tGenerated Files`);
  write(`\n\n\n`);
}
