/* global Bun */
import path from 'path';
const isBun = typeof Bun !== 'undefined';
let closeHandler = () => {};

export default {
  async launchProgram(config = {}) {
    const projectRoot = process.cwd();
    const name = await import(path.join(projectRoot, 'package.json'), { with: { type: 'json' } }).then(
      (pkg) => pkg.name
    );
    const options = { name, projectRoot, ...config };

    if (!isBun) {
      // @ts-expect-error
      options.useWorker = config.useWorker ?? true;
      const nodeImpl = await import('./node.js');
      const program = await nodeImpl.launchProgram(options);
      closeHandler = program.endProgram;
      return program.config;
    }

    // if we are bun but should use node
    if (!config.useBun) {
      const compatImpl = await import('./compat-shim.js');
      const program = await compatImpl.launchProgram(options);
      closeHandler = program.endProgram;
      return program.config;
    }

    // use bun
    // @ts-expect-error
    options.useWorker = config.useWorker ?? true;
    const nodeImpl = await import('./bun.js');
    const program = await nodeImpl.launchProgram(options);
    closeHandler = program.endProgram;
    return program.config;
  },
  async endProgram() {
    closeHandler();
  },
};
