import { findWorkspaceDir } from '@pnpm/find-workspace-dir';
import path from 'path';
import chalk from 'chalk';
import fs from 'fs';

const workspaceRoot = (await findWorkspaceDir(process.cwd())) as string;

if (!workspaceRoot) {
  throw new Error('Could not find workspace root');
}

const docsViewerRoot = path.join(workspaceRoot, 'docs-viewer');
const projectRoot = path.join(docsViewerRoot, './projects');

export { workspaceRoot, docsViewerRoot, projectRoot };

export function log(message: string) {
  console.log(chalk.grey(`[docs-viewer]\t${message}`));
}

export async function getCurrentVersion(tool: string) {
  const proc = Bun.spawn([tool, '--version'], {
    env: process.env,
    stdio: ['inherit', 'pipe', 'inherit'],
  });
  await proc.exited;
  const version = await new Response(proc.stdout).text();
  return version.trim().replace('v', '');
}

export function determinePackageManager(dir: string) {
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(dir, 'package-lock.json'))) {
    return 'npm';
  }
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) {
    return 'yarn';
  }

  return 'npm';
}

export async function generateDocs() {
  const currentVersion = require(path.join(workspaceRoot, 'package.json')).version;
  const absoluteVersion = currentVersion.split('-')[0];
  const command = ['bun', 'gen', '--skip-install', '--project', 'ember-data', '--version', absoluteVersion];
  const proc = Bun.spawn(command, {
    cwd: path.join(projectRoot, 'ember-jsonapi-docs'),
    env: Object.assign({}, process.env, { COREPACK_INTEGRITY_KEYS: 0 }),
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  await proc.exited;

  const command2 = ['bun', 'fix:files'];
  const proc2 = Bun.spawn(command2, {
    cwd: path.join(projectRoot, 'ember-api-docs-data'),
    env: process.env,
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  await proc2.exited;
}

export function repoDetails(gitUrl: string) {
  const repoPath = gitUrl.replace('.git', '').replace('git@github.com:', '');
  const [org, name] = repoPath.split('/');
  const installPathFromRoot = path.join('./projects', name);
  const location = path.join(docsViewerRoot, installPathFromRoot);

  return {
    org,
    name,
    repoPath,
    gitUrl,
    installPathFromRoot,
    location,
    relativePath: path.relative(__dirname, path.join(docsViewerRoot, installPathFromRoot)),
    httpsUrl: `https://github.com/${repoPath}.git`,
  };
}

export async function installDeps(packageManager: 'pnpm' | 'npm' | 'yarn', details: ReturnType<typeof repoDetails>) {
  const proc = Bun.spawn(
    [packageManager, 'install', packageManager === 'pnpm' ? '--ignore-workspace' : '', '--no-frozen-lockfile'].filter(
      Boolean
    ),
    {
      cwd: details.location,
      env: process.env,
      stdio: ['inherit', 'inherit', 'inherit'],
    }
  );
  await proc.exited;
}

export async function maybeMakePNPMInstallable(details: ReturnType<typeof repoDetails>) {
  // get the version to use from package.json
  const packageJson = require(path.join(details.location, 'package.json'));

  const nodeVersion = await getCurrentVersion('node');
  const pnpmVersion = await getCurrentVersion('pnpm');

  if (
    !packageJson.volta ||
    packageJson.volta.node !== nodeVersion ||
    packageJson.volta.pnpm !== pnpmVersion ||
    packageJson.packageManager ||
    packageJson.engines?.node !== nodeVersion
  ) {
    delete packageJson.packageManager;
    packageJson.volta = {
      node: nodeVersion,
      pnpm: pnpmVersion,
    };
    packageJson.engines = packageJson.engines || {};
    packageJson.engines.node = nodeVersion;

    // if this is ember-api-docs we need to also force it to use dart-sass
    if (packageJson.name === 'ember-api-docs') {
      packageJson.pnpm = packageJson.pnpm || {};
      packageJson.pnpm.overrides = packageJson.pnpm.overrides || {};
      packageJson.pnpm.overrides['node-sass'] = 'npm:sass@^1.86.0';
    }

    fs.writeFileSync(path.join(details.location, 'package.json'), JSON.stringify(packageJson, null, 2));

    // run install to pickup the lockfile change
    await installDeps('pnpm', details);

    if (packageJson.name === 'ember-api-docs') {
      const buildFile = fs.readFileSync(path.join(details.location, 'ember-cli-build.js'), 'utf8');
      // deactivate prember
      const newFile = buildFile.replace('prember: {', '__prember: {');
      fs.writeFileSync(path.join(details.location, 'ember-cli-build.js'), newFile);

      if (process.env.CI) {
        // in CI we need to change the routing setup to prepare for deployment to github pages
        const routerFile = fs.readFileSync(path.join(details.location, 'config/environment.js'), 'utf8');
        let newFile = routerFile.replace("rootURL: '/'", "rootURL: '/data/'");
        newFile = newFile.replace("locationType: 'auto'", "locationType: 'hash'");
        newFile = newFile.replace("routerRootURL: '/'", "routerRootURL: '/data/'");
        fs.writeFileSync(path.join(details.location, 'config/environment.js'), newFile);
      }
    }

    const proc = Bun.spawn(['git', 'commit', '-am', '"ensure volta works as expected"'], {
      cwd: details.location,
      env: process.env,
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    await proc.exited;
  }
}
