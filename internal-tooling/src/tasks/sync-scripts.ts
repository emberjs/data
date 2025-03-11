import debug from 'debug';
import chalk from 'chalk';
import { runPrettier, walkPackages, type ProjectPackage } from './-utils';

const log = debug('wd:sync-scripts');

const PUBLIC_PACKAGES = {
  lint: 'eslint . --quiet --cache --cache-strategy=content',
};

// does not have vite
const CLASSIC_TEST_APP = {
  'build:tests': 'IS_TESTING=true EMBER_CLI_TEST_COMMAND=true ember build --output-path=dist-test --suppress-sizes',
  'build:production': 'bun run build:tests -e production',
  start: 'bun run build:tests --watch',
  'check:types': 'tsc --noEmit',
};

const GLINT_TEST_APP = {
  'check:types': 'glint',
};

const EXAM_TEST_APP = {
  examine:
    'export EXAM_PARALLEL_COUNT=$(./bin/calculate-test-jobs); ember exam --test-port=0 --path=dist-test --parallel=$EXAM_PARALLEL_COUNT --load-balance',
  test: 'bun run examine',
  'test:production': 'bun run examine',
  'test:start': 'bun run ember test --test-port=0 --path=dist-test --serve --no-launch',
};

const TESTEM_TEST_APP = {
  test: 'ember test --test-port=0 --path=dist-test',
  'test:production': 'ember test --test-port=0 --path=dist-test --environment=production',
  'test:start': 'bun run test --serve --no-launch',
};

const DIAGNOSTIC_TEST_APP = {
  test: 'bun ./diagnostic.js',
  'test:production': 'bun ./diagnostic.js',
  'test:start': 'bun ./diagnostic.js --serve --no-launch',
};

const SPECIAL_CASED_TEST_APPS = new Set(['fastboot-test-app', 'embroider-basic-compat']);
const TOOLING_PACKAGES = new Set(['@ember-data/codemods', 'eslint-plugin-warp-drive']);

const PUBLIC_PACKAGES_EXCEPT_TOOLING = {
  prepack: 'pnpm run build:pkg',
  sync: 'echo "syncing"',
  start: 'vite',
};

const PUBLIC_PACKAGES_EXCEPT_BUILD_CONFIG_AND_TOOLING = {
  'build:pkg': 'vite build;',
};

function usesGlint(project: ProjectPackage) {
  const availableDependencies = Object.assign({}, project.pkg.dependencies, project.pkg.devDependencies);

  if (availableDependencies['@glint/environment-ember-loose']) {
    return true;
  }

  return false;
}

function usesDiagnostic(project: ProjectPackage) {
  const availableDependencies = Object.assign({}, project.pkg.dependencies, project.pkg.devDependencies);

  if (availableDependencies['@warp-drive/diagnostic']) {
    return true;
  }

  return false;
}

function usesTestem(project: ProjectPackage) {
  const availableDependencies = Object.assign({}, project.pkg.dependencies, project.pkg.devDependencies);

  if (availableDependencies.testem) {
    return true;
  }

  return false;
}

function usesExam(project: ProjectPackage) {
  const availableDependencies = Object.assign({}, project.pkg.dependencies, project.pkg.devDependencies);

  if (availableDependencies['ember-exam']) {
    return true;
  }

  return false;
}

function isTestApp(project: ProjectPackage) {
  // test apps must always have one of testem or diagnostic as a devDependency or dependency
  const availableDependencies = Object.assign({}, project.pkg.dependencies, project.pkg.devDependencies);

  if (availableDependencies.testem) {
    return true;
  }

  if (availableDependencies['@warp-drive/diagnostic']) {
    return true;
  }

  return false;
}

function isViteApp(project: ProjectPackage) {
  // test apps must always have one of testem or diagnostic as a devDependency or dependency
  const availableDependencies = Object.assign({}, project.pkg.dependencies, project.pkg.devDependencies);

  if (availableDependencies.vite && availableDependencies['@embroider/core']) {
    return true;
  }

  return false;
}

export async function main() {
  log(
    `\n\t${chalk.gray('=').repeat(60)}\n\t\t${chalk.magentaBright('@warp-drive/')}${chalk.greenBright('internal-tooling')} Sync Scripts\n\t${chalk.gray('=').repeat(60)}\n\n\t\t${chalk.gray(`Syncing default scripts for each package type`)}\n\n`
  );

  let anyFileEdited = false;

  await walkPackages(async (project: ProjectPackage, projects: Map<string, ProjectPackage>) => {
    log(`\t📦 Syncing ${project.pkg.name}`);
    let pkgEdited = false;
    let tsconfigEdited = false;

    /////////////////////////////////////////////////////////////////////
    // ensure that the package.json scripts are up to date with defaults
    /////////////////////////////////////////////////////////////////////

    if (!project.isPrivate) {
      if (!project.pkg.scripts) {
        project.pkg.scripts = {};
        pkgEdited = true;
        log(`\t\t🔧 Added scripts hash to package.json`);
      }

      for (const [script, command] of Object.entries(PUBLIC_PACKAGES)) {
        if (!project.pkg.scripts[script]) {
          project.pkg.scripts[script] = command;
          pkgEdited = true;
          log(`\t\t🔧 Added ${script} script to package.json`);
        } else if (project.pkg.scripts[script] !== command) {
          project.pkg.scripts[script] = command;
          pkgEdited = true;
          log(`\t\t🔧 Updated ${script} script in package.json`);
        }
      }

      if (project.pkg.name !== '@warp-drive/build-config' && !TOOLING_PACKAGES.has(project.pkg.name)) {
        for (const [script, command] of Object.entries(PUBLIC_PACKAGES_EXCEPT_BUILD_CONFIG_AND_TOOLING)) {
          if (!project.pkg.scripts[script]) {
            project.pkg.scripts[script] = command;
            pkgEdited = true;
            log(`\t\t🔧 Added ${script} script to package.json`);
          } else if (project.pkg.scripts[script] !== command) {
            project.pkg.scripts[script] = command;
            pkgEdited = true;
            log(`\t\t🔧 Updated ${script} script in package.json`);
          }
        }
      }

      if (!TOOLING_PACKAGES.has(project.pkg.name)) {
        for (const [script, command] of Object.entries(PUBLIC_PACKAGES_EXCEPT_TOOLING)) {
          if (!project.pkg.scripts[script]) {
            project.pkg.scripts[script] = command;
            pkgEdited = true;
            log(`\t\t🔧 Added ${script} script to package.json`);
          } else if (project.pkg.scripts[script] !== command) {
            project.pkg.scripts[script] = command;
            pkgEdited = true;
            log(`\t\t🔧 Updated ${script} script in package.json`);
          }
        }
      }
    } else if (project.isTest && isTestApp(project) && !SPECIAL_CASED_TEST_APPS.has(project.pkg.name)) {
      if (isViteApp(project)) {
        throw new Error(`Update sync-scripts to handle vite test apps`);
      }

      if (!project.pkg.scripts) {
        project.pkg.scripts = {};
        pkgEdited = true;
        log(`\t\t🔧 Added scripts hash to package.json`);
      }

      const isGlint = usesGlint(project);
      const isTestem = usesTestem(project);
      const isExam = usesExam(project);
      const isDiagnostic = usesDiagnostic(project);

      if (isGlint) {
        log(`\t\t\t📡 Detected glint test app`);
      }
      if (isTestem) {
        log(`\t\t\t📡 Detected testem test app`);
      }
      if (isExam) {
        log(`\t\t\t📡 Detected exam test app`);
      }
      if (isDiagnostic) {
        log(`\t\t\t📡 Detected diagnostic test app`);
      }

      const expectedScripts = Object.assign(
        {},
        CLASSIC_TEST_APP,
        isGlint ? GLINT_TEST_APP : {},
        isTestem ? TESTEM_TEST_APP : {},
        isExam ? EXAM_TEST_APP : {},
        isDiagnostic ? DIAGNOSTIC_TEST_APP : {}
      ) as Record<string, string>;

      for (const [script, command] of Object.entries(expectedScripts)) {
        if (!project.pkg.scripts[script]) {
          project.pkg.scripts[script] = command;
          pkgEdited = true;
          log(`\t\t🔧 Added ${script} script to package.json`);
        } else if (project.pkg.scripts[script] !== command) {
          project.pkg.scripts[script] = command;
          pkgEdited = true;
          log(`\t\t🔧 Updated ${script} script in package.json`);
        }
      }
    } else {
      log(`\t\t🔒 Skipping private package ${project.pkg.name}`);
    }

    if (pkgEdited || tsconfigEdited) {
      anyFileEdited = true;
      await project.save({ pkgEdited, configEdited: tsconfigEdited });
    }
  });

  if (anyFileEdited) await runPrettier();
}
