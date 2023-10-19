import { setApplication } from '@ember/test-helpers';

import { configure } from '@warp-drive/diagnostic/ember';
import { start } from '@warp-drive/diagnostic/runners/dom';

import Application from '../app';
import config from '../config/environment';

configure();

setApplication(Application.create(config.APP));
start({
  tryCatch: false,
  debug: false,
  groupLogs: false,
  instrument: true,
  hideReport: true,
  useDiagnostic: true,
});
