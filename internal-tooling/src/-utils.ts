import type { BunFile } from 'bun';
import path from 'path';
import type { CommentObject } from 'comment-json';
import { findWorkspaceDir } from '@pnpm/find-workspace-dir';
import { findWorkspacePackages, type Project } from '@pnpm/find-workspace-packages';

export async function getMonorepoRoot() {
  const workspaceDir = await findWorkspaceDir(process.cwd());

  if (workspaceDir) {
    return workspaceDir;
  }

  const MAX_DEPTH = 10;
  // are we in the root?
  let currentDir = process.cwd();
  let depth = 0;
  while (depth < MAX_DEPTH) {
    const lockfileFile = path.join(currentDir, 'pnpm-lock.yaml');
    if (await Bun.file(lockfileFile).exists()) {
      return currentDir;
    }
    currentDir = path.join(currentDir, '../');
    depth++;
  }

  throw new Error(`Could not find monorepo root from cwd ${process.cwd()}`);
}

export async function getPackageJson({ packageDir, packagesDir }: { packageDir: string; packagesDir: string }) {
  const packageJsonPath = path.join(packagesDir, packageDir, 'package.json');
  const packageJsonFile = Bun.file(packageJsonPath);
  const pkg = await packageJsonFile.json();
  return { file: packageJsonFile, pkg, path: packageJsonPath, nicePath: path.join(packageDir, 'package.json') };
}

type PkgJsonFile = {
  name: string;
  version: string;
  files?: string[];
  license?: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  main?: string;
  peerDependenciesMeta?: Record<string, { optional: boolean }>;
};

export type TsConfigFile = {
  include?: string[];
  compilerOptions?: {
    lib?: string[];
    module?: string;
    target?: string;
    moduleResolution?: string;
    moduleDetection?: string;
    erasableSyntaxOnly?: boolean;
    allowImportingTsExtensions?: boolean;
    verbatimModuleSyntax?: boolean;
    isolatedModules?: boolean;
    isolatedDeclarations?: boolean;
    pretty?: boolean;
    strict?: boolean;
    experimentalDecorators?: boolean;
    allowJs?: boolean;
    checkJs?: boolean;
    rootDir?: string;
    baseUrl?: string;
    declarationMap?: boolean;
    inlineSourceMap?: boolean;
    inlineSources?: boolean;
    skipLibCheck?: boolean;
    declaration?: boolean;
    declarationDir?: string;
    incremental?: boolean;
    composite?: boolean;
    emitDeclarationOnly?: boolean;
    noEmit?: boolean;
    paths?: Record<string, string[]>;
    types?: string[];
  };
  references?: { path: string }[];
};

interface BaseProjectPackage {
  project: Project;
  packages: Map<string, Project>;
  pkgFile: BunFile;
  tsconfigFile: BunFile;
  pkgPath: string;
  tsconfigPath: string;
  pkg: PkgJsonFile;
  save: (editStatus: { pkgEdited: boolean; configEdited: Boolean }) => Promise<void>;
}

export interface ProjectPackageWithTsConfig extends BaseProjectPackage {
  tsconfig: CommentObject & TsConfigFile;
  hasTsConfig: true;
}

interface ProjectPackageWithoutTsConfig extends BaseProjectPackage {
  tsconfig: null;
  hasTsConfig: false;
}

export type ProjectPackage = ProjectPackageWithTsConfig | ProjectPackageWithoutTsConfig;

async function collectAllPackages(dir: string) {
  const packages = await findWorkspacePackages(dir);
  const pkgMap = new Map<string, Project>();
  for (const pkg of packages) {
    if (!pkg.manifest.name) {
      throw new Error(`Package at ${pkg.dir} does not have a name`);
    }
    pkgMap.set(pkg.manifest.name, pkg);
  }

  return pkgMap;
}

export async function walkPackages(
  cb: (pkg: ProjectPackage, projects: Map<string, ProjectPackage>) => void | Promise<void>,
  options: {
    excludeTests?: boolean;
    excludePrivate?: boolean;
    excludeRoot?: boolean;
    excludeTooling?: boolean;
    excludeConfig?: boolean;
  } = {}
) {
  const config = Object.assign(
    { excludeTests: false, excludePrivate: false, excludeRoot: true, excludeTooling: true, excludeConfig: true },
    options
  );
  const JSONC = await import('comment-json');
  const dir = await getMonorepoRoot();
  const packages = await collectAllPackages(dir);
  const projects = new Map<string, ProjectPackageWithTsConfig>();

  for (const [name, project] of packages) {
    if (config.excludeRoot && name === 'root') continue;
    if (config.excludePrivate && project.manifest.private) continue;
    if (config.excludeTooling && name === '@warp-drive/internal-tooling') continue;
    if (config.excludeConfig && name === '@warp-drive/config') continue;
    if (config.excludeTests && project.dir === 'tests') continue;

    const pkgPath = path.join(project.dir, 'package.json');
    const tsconfigPath = path.join(project.dir, 'tsconfig.json');
    const pkgFile = Bun.file(pkgPath);
    const tsconfigFile = Bun.file(tsconfigPath);
    const pkg = (await pkgFile.json()) as PkgJsonFile;
    const hasTsConfig = await tsconfigFile.exists();
    const tsconfig = hasTsConfig ? (JSONC.parse(await tsconfigFile.text()) as CommentObject & TsConfigFile) : null;

    const pkgObj = {
      project,
      packages,
      pkgFile,
      tsconfigFile,
      pkgPath,
      hasTsConfig,
      tsconfigPath,
      pkg,
      tsconfig,
      save: async ({ pkgEdited, configEdited }: { pkgEdited: boolean; configEdited: Boolean }) => {
        if (pkgEdited) await pkgFile.write(JSON.stringify(pkg, null, 2));
        if (configEdited) await tsconfigFile.write(JSONC.stringify(tsconfig, null, 2));
      },
    } as ProjectPackageWithTsConfig;

    projects.set(name, pkgObj);
  }

  for (const project of projects.values()) {
    await cb(project, projects);
  }
}
