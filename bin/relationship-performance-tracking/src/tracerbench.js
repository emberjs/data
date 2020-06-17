const path = require('path');

const fs = require('fs-extra');
const { InitialRenderBenchmark, Runner } = require('@tracerbench/core');

// The number of samples TracerBench will run. Higher sample count is more accurate.
// However, the duration of the test will increase. The recommendation is somewhere between 30-60 samples.
const samplesCount = 60;

const routes = [
  {
    routeName: 'materialization',
    markers: [
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
    ],
  },
  {
    routeName: 'add-children',
    markers: [
      {
        start: 'start-push-initial-payload',
        label: 'start-push-initial-payload',
      },
      {
        start: 'end-push-initial-payload',
        label: 'end-push-initial-payload',
      },
      {
        start: 'start-push-update-payload',
        label: 'start-push-update-payload',
      },
      {
        start: 'end-push-update-payload',
        label: 'end-push-update-payload',
      },
    ],
  },
  {
    routeName: 'unload',
    markers: [
      {
        start: 'start-push-payload',
        label: 'start-push-payload',
      },
      {
        start: 'end-push-payload',
        label: 'end-push-payload',
      },
      {
        start: 'start-unloadRecord',
        label: 'start-unloadRecord',
      },
      {
        start: 'end-unloadRecord',
        label: 'end-unloadRecord',
      },
    ],
  },
  {
    routeName: 'destroy',
    markers: [
      {
        start: 'start-push-payload',
        label: 'start-push-payload',
      },
      {
        start: 'end-push-payload',
        label: 'end-push-payload',
      },
      {
        start: 'start-destroyRecord',
        label: 'start-destroyRecord',
      },
      {
        start: 'end-destroyRecord',
        label: 'end-destroyRecord',
      },
    ],
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

(async () => {
  try {
    for (let i = 0; i < routes.length; i++) {
      const { routeName, markers } = routes[i];
      const prefix = `00${i + 1}`.slice(-2) + '-' + routeName;
      const control = new InitialRenderBenchmark({
        name: 'control',
        url: `http://localhost:4200/#/${routeName}/?tracerbench=true`,
        markers,
        browser,
        saveTraces: () => path.resolve(TRACER_BENCH_RESULTS_PATH, `${prefix}-control-trace.json`),
      });

      const experiment = new InitialRenderBenchmark({
        name: 'experiment',
        url: `http://localhost:4201/#/${routeName}/?tracerbench=true`,
        markers,
        browser,
        saveTraces: () => path.resolve(TRACER_BENCH_RESULTS_PATH, `${prefix}-experiment-trace.json`),
      });

      console.log(`${prefix}: computing results...`);
      const runner = new Runner([control, experiment]);
      const results = await runner.run(samplesCount);
      fs.writeFileSync(
        path.resolve(TRACER_BENCH_RESULTS_PATH, `${prefix}-trace-results.json`),
        JSON.stringify(results, null, 2)
      );
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
