import type { Package } from '@manypkg/get-packages';

export async function getPackageList(): Promise<{
  pkgManager: string;
  packages: Package[];
  rootPackage: Package | undefined;
  rootDir: string;
}> {
  const { getPackages } = await import('@manypkg/get-packages');
  const { tool, packages, rootPackage, rootDir } = await getPackages(process.cwd());
  return {
    pkgManager: tool.type,
    packages,
    rootPackage,
    rootDir,
  };
}
