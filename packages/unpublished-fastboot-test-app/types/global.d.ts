// Types for compiled templates
declare module 'fastboot-test-app/templates/*' {
  type TemplateFactory = import('htmlbars-inline-precompile').TemplateFactory;
  const tmpl: TemplateFactory;
  export default tmpl;
}
