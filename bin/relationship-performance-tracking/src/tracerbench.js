const path = require('path');

const fs = require('fs-extra');
const { InitialRenderBenchmark, Runner } = require('@tracerbench/core');

// The number of samples TracerBench will run. Higher sample count is more accurate.
// However, the duration of the test will increase. The recommendation is somewhere between 30-60 samples.
const samplesCount = 60;

const markers = [
  {
    start: 'start-find-all',
    label: 'start-find-all',
  },
  {
    start: 'start-outer-materialization',
    label: 'start-outer-materialization',
  },
  {
    start: 'stop-outer-materialization',
    label: 'stop-outer-materialization',
  },
  {
    start: 'end-find-all',
    label: 'end-find-all',
  },
];

const browser = {
  type: 'canary',
  additionalArguments: [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--mute-audio',
    '--v8-cache-options=none',
    '--disable-cache',
    '--disable-v8-idle-tasks',
    '--crash-dumps-dir=./tmp',
  ],
};

const TRACER_BENCH_RESULTS_PATH = path.resolve(
  __dirname,
  `../../../packages/unpublished-relationship-performance-test-app/tracerbench-results`
);

const control = new InitialRenderBenchmark({
  name: 'control',
  url: 'http://localhost:4200/?tracerbench=true',
  markers,
  browser,
  saveTraces: () => path.resolve(TRACER_BENCH_RESULTS_PATH, 'control-trace.json'),
});

const experiment = new InitialRenderBenchmark({
  name: 'experiment',
  url: 'http://localhost:4201/?tracerbench=true',
  markers,
  browser,
  saveTraces: () => path.resolve(TRACER_BENCH_RESULTS_PATH, 'experiment-trace.json'),
});

console.log('Computing results...');
const runner = new Runner([control, experiment]);
runner
  .run(samplesCount)
  .then(results => {
    return fs.writeFileSync(
      path.resolve(TRACER_BENCH_RESULTS_PATH, 'trace-results.json'),
      JSON.stringify(results, null, 2)
    );
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
