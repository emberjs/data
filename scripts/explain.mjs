import chalk from 'chalk';

/** @type {import('bun-types')} */

const MarkerLines = new Set([
  'devDependencies:',
  'dependencies:',
  'peerDependencies:',
]);
const GraphMarkers = new Set([
  '├',
  '│',
  '└',
  '─',
  '┬',
]);

async function main() {
  const args = Bun.argv.slice(2);
  const pkgName = args[0];

  console.log(chalk.grey(chalk.bold(`Explaining ${chalk.yellow(pkgName)} in ${chalk.yellow(process.cwd())}`)));

  const output = Bun.spawnSync(['pnpm', 'why', pkgName], {
    cwd: process.cwd(),
    env: process.env,
    shell: true
  });

  const versions = {};
  let currentSection = null;

  const logLines = output.stdout.toString().split('\n').filter(Boolean);

  for (const line of logLines) {
    if (MarkerLines.has(line)) {
      currentSection = line;
      continue;
    }

    if (currentSection) {
      const sections = line.split(' ');
      while (GraphMarkers.has(sections[0].charAt(0))) {
        sections.shift();
      }
      const [pkg, version, kind] = sections;
      versions[pkg] = versions[pkg] ?? new Set();
      versions[pkg].add(version);
    }
  }

  console.log(versions);
}

await main();
