// Types for compiled templates
declare module 'fastboot-test-app/templates/*' {
  import type { TemplateFactory } from 'htmlbars-inline-precompile';

  const tmpl: TemplateFactory;
  export default tmpl;
}
