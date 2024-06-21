export async function getPackageList() {
  const { getPackages } = await import('@manypkg/get-packages');
  const { tool, packages, rootPackage, rootDir } = await getPackages(process.cwd());
  return {
    pkgManager: tool.type,
    packages,
    rootPackage,
    rootDir,
  };
}
