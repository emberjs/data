export const TS_CONFIG = {
  include: ['app/**/*', 'config/**/*', 'tests/**/*'],
  compilerOptions: {
    lib: ['DOM', 'ESNext'],
    module: 'esnext',
    target: 'esnext',
    moduleResolution: 'bundler',
    moduleDetection: 'force',
    strict: true,
    pretty: true,
    exactOptionalPropertyTypes: false,
    downlevelIteration: true,
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
    forceConsistentCasingInFileNames: true,
    allowJs: true,
    baseUrl: '.',
    noImplicitOverride: false,
    noImplicitAny: false,
    experimentalDecorators: true,
    incremental: true,
    noEmit: true,
    declaration: false,
    types: [],
  },
} as const;
