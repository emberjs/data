import { launchProgram } from './node.js';

function startNodeServer() {
  const args = process.argv.slice();

  if (args.length) {
    const options = JSON.parse(args[2]);
    launchProgram(options);
  }
}

startNodeServer();
