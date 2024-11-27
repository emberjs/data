import { configure } from '@warp-drive/diagnostic/ember';
import { start } from '@warp-drive/diagnostic/runners/dom';

configure();

start({
  tryCatch: false,
  groupLogs: false,
  instrument: true,
  hideReport: true,
  useDiagnostic: true,
});
