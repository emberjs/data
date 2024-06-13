import fs from 'fs';
import { execSync } from 'node:child_process';

type NpmInfo = {
  'dist-tags': Record<string, string>;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  peerDependenciesMeta: Record<string, { optional?: boolean }>;
};

const InfoCache: Record<string, NpmInfo> = {};

// eslint-disable-next-line @typescript-eslint/require-await
export async function exec(cmd: string) {
  return execSync(cmd);
}

export async function getTags(project: string): Promise<Set<string>> {
  if (!InfoCache[project]) {
    const info = await exec(`npm view ${project} --json`);
    InfoCache[project] = JSON.parse(String(info)) as unknown as NpmInfo;
  }

  const keys = Object.keys(InfoCache[project]['dist-tags']);
  return new Set(keys);
}

export async function getInfo(project: string): Promise<NpmInfo> {
  if (!InfoCache[project]) {
    const info = await exec(`npm view ${project} --json`);
    InfoCache[project] = JSON.parse(String(info)) as unknown as NpmInfo;
  }

  return InfoCache[project];
}

export function getPackageManagerFromLockfile(): 'yarn' | 'npm' | 'bun' | 'pnpm' {
  if (fs.existsSync('pnpm-lock.yaml')) {
    return 'pnpm';
  } else if (fs.existsSync('package-lock.json')) {
    return 'npm';
  } else if (fs.existsSync('yarn.lock')) {
    return 'yarn';
  } else if (fs.existsSync('bun.lock')) {
    return 'bun';
  }
  return 'npm';
}
