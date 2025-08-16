import { configure } from '@warp-drive/diagnostic/ember-classic';
import { start } from '@warp-drive/diagnostic/runners/dom';

configure();

start({
  useDiagnostic: true,
});
