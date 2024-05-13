import child_process from 'child_process';

export function CompileTypesPlugin(useGlint) {
  return {
    name: 'compile-types-with-tsc',

    closeBundle: () => {
      child_process.spawnSync(useGlint ? 'glint' : 'tsc', ['--build'], { stdio: 'inherit' });
    },
  };
}
