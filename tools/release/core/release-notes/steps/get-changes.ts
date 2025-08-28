import { exec } from '../../../utils/cmd';
import { Package, STRATEGY } from '../../../utils/package';
import path from 'path';

export const Committers = Symbol('Committers');
export type Entry = { packages: string[]; description: string; committer: string };
export interface LernaOutput {
  [Committers]: Map<string, string>;
  [key: string]: Map<string, Entry>;
}
export type LernaChangeset = {
  data: LernaOutput;
  byPackage: Record<string, Record<string, Map<string, Entry>>>;
};

const IgnoredPackages = new Set(['private-build-infra']);

// e.g. match lines ending in "asljasdfjh ([@runspired](https://github.com/runspired))""
const CommitterRegEx = /.*\s\(?\[@([a-zA-Z0-9-]+)\]\(https:\/\/github.com\/\1\)\)?$/;

function keyForLabel(label: string, strategy: STRATEGY): string {
  const labelKey = strategy.config.changelog?.collapseLabels?.labels.some((v) => v === label);
  return labelKey ? strategy.config.changelog!.collapseLabels!.title : label;
}

function packagesBySubPath(strategy: STRATEGY, packages: Map<string, Package>): Map<string, Package> {
  const subPathMap = new Map<string, Package>();
  const changelogRoots = strategy.config.changelogRoots || strategy.config.packageRoots;
  const changelogPaths = changelogRoots.map((v) => v.replace('/*', ''));

  for (const [, pkg] of packages) {
    if (pkg.pkgData.name === 'root') {
      subPathMap.set('root', pkg);
      continue;
    }
    if (pkg.pkgData.name === '@ember-data/json-api') {
      // we push everything to @warp-drive/json-api
      continue;
    }
    let relative = path.dirname(path.relative(process.cwd(), pkg.filePath));
    for (const root of changelogPaths) {
      if (relative.startsWith(root + '/')) {
        const shortPath = relative.substring(root.length + 1);
        if (subPathMap.has(shortPath)) {
          console.error(`Duplicate subpath: ${shortPath}`);
          process.exit(1);
        }
        relative = shortPath;
        break;
      }
    }
    subPathMap.set(relative, pkg);
  }

  const mappings = strategy.config.changelog?.mappings || {};
  Object.keys(mappings).forEach((mapping) => {
    const mapped = mappings[mapping];
    if (mapped === null) {
      subPathMap.set(mapping, packages.get('root')!);
      return;
    }
    const pkg = packages.get(mapped);
    if (!pkg) {
      throw new Error(`Could not find package for mapping: ${mapping}`);
    }
    subPathMap.set(mapping, pkg);
  });

  return subPathMap;
}

function packageForSubPath(strategy: STRATEGY, subPath: string, packages: Map<string, Package>): string | null {
  if (IgnoredPackages.has(subPath)) {
    return null;
  }
  const pkg = packages.get(subPath);
  if (pkg) {
    return pkg.pkgData.name;
  }
  throw new Error(`Could not find package for subpath: ${subPath}`);
}

function extractLoggedEntry(
  currentEntry: Entry,
  data: LernaOutput,
  byPackage: Record<string, Record<string, Map<string, Entry>>>,
  subPathMap: Map<string, Package>,
  strategy: STRATEGY,
  currentSection: string
): void {
  const PRMatches = currentEntry!.description.match(/^\[#(\d+)/);
  const PRNumber = PRMatches![1];

  // e.g. ([@runspired](https://github.com/runspired))
  const committerMatches = currentEntry!.description.match(CommitterRegEx);
  currentEntry!.committer = committerMatches![1];

  (data[currentSection] as Map<string, Entry>).set(PRNumber, currentEntry as Entry);

  currentEntry?.packages.forEach((subPath) => {
    const pkg = packageForSubPath(strategy, subPath, subPathMap);

    if (pkg) {
      byPackage[pkg] = byPackage[pkg] || {};
      byPackage[pkg][currentSection] = byPackage[pkg][currentSection] || new Map();
      byPackage[pkg][currentSection].set(PRNumber, currentEntry as Entry);
    }
  });
}

function parseLernaOutput(markdown: string, strategy: STRATEGY, packages: Map<string, Package>): LernaChangeset {
  // uncomment this to see lerna's markdown output if needed to debug
  // console.log(markdown);
  const subPathMap = packagesBySubPath(strategy, packages);
  const data: LernaOutput = {
    [Committers]: new Map(),
  };
  const byPackage: Record<string, Record<string, Map<string, Entry>>> = {};
  const lines = markdown.split('\n');

  let isParsingCommitters = false;
  let isParsingSection = false;
  let currentSection = '';
  let currentEntry: Entry | null = null;
  // console.log('lines', lines);

  for (const line of lines) {
    if (isParsingSection) {
      if (line === '') {
        isParsingSection = false;
        currentSection = '';
      } else {
        if (line.startsWith('* [#')) {
          currentEntry = {
            packages: ['Other'],
            description: line.substring(2),
            committer: '',
          };
          extractLoggedEntry(currentEntry, data, byPackage, subPathMap, strategy, currentSection);
        } else if (line.startsWith('* ')) {
          const packages = line
            .substring(2)
            .split(',')
            .map((v) => v.trim().replaceAll('`', ''));
          currentEntry = {
            packages,
            description: '',
            committer: '',
          };
        } else if (line.startsWith('  * ')) {
          currentEntry = structuredClone(currentEntry!);
          currentEntry!.description = line.substring(4);
          extractLoggedEntry(currentEntry, data, byPackage, subPathMap, strategy, currentSection);
        } else {
          isParsingSection = false;
          currentSection = '';
          currentEntry = null;
        }
      }
    } else if (isParsingCommitters) {
      if (line === '') {
        isParsingCommitters = false;
      } else {
        const committerMatches = line.match(CommitterRegEx);
        const committer = committerMatches![1];
        data[Committers].set(committer, line.substring(2));
      }
    } else if (line.startsWith('#### ')) {
      isParsingCommitters = false;
      isParsingSection = false;
      currentEntry = null;
      if (line.startsWith('#### Committers:')) {
        currentSection = 'Committers';
        isParsingCommitters = true;
      } else {
        currentSection = keyForLabel(line.substring(5), strategy);
        data[currentSection] = data[currentSection] || new Map();
        isParsingSection = true;
      }
    }
  }

  // Object.entries(data).forEach(([key, value]) => {
  //   console.log(key, value);
  // });

  return { data, byPackage };
}

export async function getChanges(strategy: STRATEGY, packages: Map<string, Package>, fromTag: string) {
  const changelogMarkdown = await exec(['sh', '-c', `bunx lerna-changelog --from=${fromTag}`]);
  return parseLernaOutput(changelogMarkdown, strategy, packages);
}
