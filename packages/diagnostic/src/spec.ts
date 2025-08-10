import { module, skip, test, todo } from './-define';
import type { Diagnostic as TestAssert, Hooks, TestContext } from './-types';
import { setupRenderingTest } from './ember';
import type { TestHelpers } from './helpers/install';
import { setupTest } from './react';

declare module './-types' {
  interface Diagnostic {
    dom: Assert['dom'];
  }
}

/**
 * Supported Frameworks for Spec Tests
 */
export type Framework = 'react' | 'ember';

/**
 * Supported Features Within Spec Tests
 */
export interface SpecTestContext<T extends object> extends TestContext {
  element: HTMLElement;
  render(context: T): Promise<void>;
  h: TestHelpers;
}

export interface SpecTest<LocalContext extends object, T extends object> {
  cb(this: LocalContext & SpecTestContext<T>, assert: TestAssert): void | Promise<void>;
  $props: T;
}

export interface IntermediateBuilder<LocalContext extends object, T, N extends string> {
  use<O extends object>(
    cb: SpecTest<LocalContext, O>['cb']
  ): SpecBuilder<LocalContext, T & { [key in N]: SpecTest<LocalContext, O> }>;
}

export interface TestRunner<
  LocalContext extends object,
  T extends { [key: string]: SpecTest<LocalContext, object> },
  SEEN = never,
> {
  test<K extends keyof T & string>(
    name: K,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    impl: (props: T[K]['$props']) => any
  ): TestRunner<LocalContext, T, SEEN | K>;
  skip<K extends keyof T & string>(
    name: K,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    impl: (props: T[K]['$props']) => any
  ): TestRunner<LocalContext, T, SEEN | K>;
  todo<K extends keyof T & string>(
    name: K,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    impl: (props: T[K]['$props']) => any
  ): TestRunner<LocalContext, T, SEEN | K>;
  never(
    name: Exclude<keyof T & string, SEEN> extends never
      ? null
      : `Expected Implementations for "${Exclude<keyof T & string, SEEN>}"`
  ): never;
}

export interface SuiteBuilder<
  LocalContext extends object,
  T extends { [key: string]: SpecTest<LocalContext, object> },
> {
  use<N extends Framework>(framework: N, implement: (b: TestRunner<LocalContext, T>) => void): void;
}

export interface SpecBuilder<LocalContext extends object, T extends { [key: string]: SpecTest<LocalContext, object> }> {
  specs: T;
  for<N extends string>(name: N): IntermediateBuilder<LocalContext, T, N>;
  build(): SuiteBuilder<LocalContext, T>;
}

const FrameworkSetup: Record<Framework, (hooks: Hooks) => void> = {
  ember: setupRenderingTest,
  react: setupTest,
};

class Spec<LocalContext extends object, T extends { [key: string]: SpecTest<LocalContext, object> }>
  implements SpecBuilder<LocalContext, T>
{
  private name: string;
  private setup: (hooks: Hooks<SpecTestContext<T>>) => void;
  private isBuilt = false;

  constructor(name: string, setup: (hooks: Hooks<LocalContext & SpecTestContext<T>>) => void) {
    this.name = name;
    this.setup = setup;
  }

  specs = {} as T;

  for<N extends string>(name: N): IntermediateBuilder<LocalContext, T, N> {
    if (this.isBuilt) {
      throw new Error('Cannot add new tests after the Spec has been built');
    }
    return {
      use: (cb: SpecTest<LocalContext, object>['cb']) => {
        // @ts-expect-error we are upgrading the type here
        this.specs[name] = {
          cb,
          $props: {} as object, // Placeholder for properties
        } as SpecTest<LocalContext, object>;
        return this;
      },
    } as IntermediateBuilder<LocalContext, T, N>;
  }
  build(): SuiteBuilder<LocalContext, T> {
    if (this.isBuilt) {
      throw new Error('Spec has already been built');
    }
    this.isBuilt = true;
    return {
      use: <N extends Framework>(framework: N, implement: (b: TestRunner<LocalContext, T>) => void) => {
        const { setup, specs, name: moduleName } = this;
        module(`Spec | ${moduleName} | ${framework}`, function (hooks) {
          FrameworkSetup[framework](hooks);
          setup(hooks as Hooks<SpecTestContext<T>>);
          const TestsToImplement = new Set(Object.keys(specs));
          const testRunner: TestRunner<LocalContext, T> = {
            test: (name, impl) => {
              if (!specs[name]) {
                throw new Error(`Test "${name}" does not exist in spec "${moduleName}"`);
              }
              if (!TestsToImplement.has(name)) {
                throw new Error(`Test "${name}" has already been implemented in spec "${moduleName}"`);
              }
              TestsToImplement.delete(name);
              test(name, async function (assert) {
                const context = this as LocalContext & SpecTestContext<T>;

                const frameworkRender = context.render.bind(context);
                context.render = async (props) => {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                  return frameworkRender(impl(props));
                };

                await specs[name].cb.call(context, assert);
              });

              return testRunner;
            },

            skip: (name, impl) => {
              if (!specs[name]) {
                throw new Error(`Test "${name}" does not exist in spec "${moduleName}"`);
              }
              if (!TestsToImplement.has(name)) {
                throw new Error(`Test "${name}" has already been implemented in spec "${moduleName}"`);
              }
              TestsToImplement.delete(name);
              skip(name, async function (assert) {
                const context = this as LocalContext & SpecTestContext<T>;

                const frameworkRender = context.render.bind(context);
                context.render = async (props) => {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                  return frameworkRender(impl(props));
                };

                await specs[name].cb.call(context, assert);
              });

              return testRunner;
            },

            todo: (name, impl) => {
              if (!specs[name]) {
                throw new Error(`Test "${name}" does not exist in spec "${moduleName}"`);
              }
              if (!TestsToImplement.has(name)) {
                throw new Error(`Test "${name}" has already been implemented in spec "${moduleName}"`);
              }
              TestsToImplement.delete(name);
              todo(name, async function (assert) {
                const context = this as LocalContext & SpecTestContext<T>;

                const frameworkRender = context.render.bind(context);
                context.render = async (props) => {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                  return frameworkRender(impl(props));
                };

                await specs[name].cb.call(context, assert);
              });

              return testRunner;
            },

            never: (name) => {
              if (name !== null) {
                throw new Error(`never() should only be called with null`);
              }
              if (TestsToImplement.size > 0) {
                throw new Error(
                  `Expected the ${framework} implementation for the spec ${moduleName} to have tests for "${Array.from(
                    TestsToImplement
                  ).join(', ')}"`
                );
              }
              return testRunner as never;
            },
          };

          implement(testRunner);

          if (TestsToImplement.size > 0) {
            throw new Error(
              `Expected the ${framework} implementation for the spec ${moduleName} to have tests for "${Array.from(
                TestsToImplement
              ).join(', ')}"`
            );
          }
        });
      },
    } as SuiteBuilder<LocalContext, T>;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export function spec<LocalContext extends object = {}>(
  name: string,
  setup: (hooks: Hooks<LocalContext & SpecTestContext<object>>) => void
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
): SpecBuilder<LocalContext, {}> {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  return new Spec<LocalContext, {}>(name, setup);
}

// const GreetingsSpec = spec('Greetings', function (hooks) {})
//   .for('example')
//   .use<{ hello: 'world' }>(async function (assert) {
//     await this.render({ hello: 'world' });
//   })
//   .for('example 1')
//   .use<{ hello: 'moon' }>(async function (assert) {
//     await this.render({ hello: 'moon' });
//   })
//   .for('example 2')
//   .use<{ goodnight: 'bar' }>(async function (assert) {
//     await this.render({ goodnight: 'bar' });
//   })
//   .build();

// GreetingsSpec.use('ember', (b) => {
//   b.test('example', () => <template></template>)
//     .test('example 1', () => <template></template>)
//     .test('example 2', () => <template></template>)
//     .never(null);
// });
