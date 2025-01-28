export async function getPackageList(dir = process.cwd()) {
  const { getPackages } = await import('@manypkg/get-packages');
  const { tool, packages, rootPackage, rootDir } = await getPackages(dir);
  return {
    pkgManager: tool.type,
    packages,
    rootPackage,
    rootDir,
  };
}
