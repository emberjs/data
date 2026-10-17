/**
 * Tasks are groups of synchronous and asynchronous operations
 * that should be performed as the result of an event such as
 * a user interaction.
 *
 * Tasks have no `this`, they are isolated and should be treated
 * as pure functions that operate from a starting state set at
 * the moment the task is created to produce a final result.
 *
 * Tasks can yield values, which can be any value, including
 * asynchronous values.
 *
 * If the value is asynchronous, the task will pause until the
 * promise resolves, and then continue execution.
 *
 * Tasks always run to completion by default, meaning that they will
 * not be cancelled or interrupted.
 *
 * yield always returns both the awaited result, the state of the
 * task (e.g. cancelled) and the state of the application instance (e.g. destroyed)
 *
 * ```ts
 * const state = yield Promise.resolve('hello');
 * state.cancelled; // false;
 * state.live; // true;
 * state.value; // 'hello';
 * ```
 *
 * if the task errors:
 * -
 *
 * if a yielded promise rejects:
 * -
 *
 * each yielded value is exposed by:
 * -
 *
 * the return value is:
 * -
 *
 * Recommendations:
 * - define tasks in module scope
 * - don't cancel tasks
 * - don't abort network requests
 * - don't debounce
 * - if you do debounce, debounce the creation itself
 *
 * ```ts
 * const MyTask = createTask(function* () {});
 *
 * class MyComponent extends Component {
 *   @signal task = null;
 *
 *   doWork = (name) => {
 *      this.task = myTask(name);
 *   }
 * }
 * ```
 *
 * // example of a task created at component creation
 * // example of a task using a request to update a value
 */

type DEPTHCOUNT =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30;
// prettier-ignore
type INC_DEPTH<START extends DEPTHCOUNT> =
  START extends 0 ? 1 :
  START extends 1 ? 2 :
  START extends 2 ? 3 :
  START extends 3 ? 4 :
  START extends 4 ? 5 :
  START extends 5 ? 6 :
  START extends 6 ? 7 :
  START extends 7 ? 8 :
  START extends 8 ? 9 :
  START extends 9 ? 10 :
  START extends 10 ? 11 :
  START extends 11 ? 12 :
  START extends 12 ? 13 :
  START extends 13 ? 14 :
  START extends 14 ? 15 :
  START extends 15 ? 16 :
  START extends 16 ? 17 :
  START extends 17 ? 18 :
  START extends 18 ? 19 :
  START extends 19 ? 20 :
  START extends 20 ? 21 :
  START extends 21 ? 22 :
  START extends 22 ? 23 :
  START extends 23 ? 24 :
  START extends 24 ? 25 :
  START extends 25 ? 26 :
  START extends 26 ? 27 :
  START extends 27 ? 28 :
  START extends 28 ? 29 :
  START extends 29 ? 30 : never;

type SeriesItem<Series extends Arr, Prev, V, Index extends DEPTHCOUNT = 0> = {
  order: Index;
  input: Awaited<Prev>;
  output: V;
  next: Series[INC_DEPTH<Index>] extends undefined
    ? undefined
    : SeriesItem<Series, V, Series[INC_DEPTH<Index>], INC_DEPTH<Index>>;
};

type Arr = unknown[] | Readonly<unknown[]>;

type Series<T extends Arr> = T[0] extends undefined ? undefined : SeriesItem<T, undefined, T[0]>;

const a = [1, 4, 'hello', null, 10, 'hi', { hello: 'world' }] as const;

type Yield1 = Series<typeof a>;
type Yield2 = Yield1['next'];
type Yield3 = Yield2['next'];
type Yield4 = Yield3['next'];
type Yield5 = Yield4['next'];
type Yield6 = Yield5['next'];
type Yield7 = Yield6['next'];
type Yield8 = Yield7['next'];

function* doWork() {}

interface Generator<T = unknown, TReturn = any, TNext = any> extends IteratorObject<T, TReturn, TNext> {
  // NOTE: 'next' is defined using a tuple to ensure we report the correct assignability errors in all places.
  next(...[value]: [] | [TNext]): IteratorResult<T, TReturn>;
  return(value: TReturn): IteratorResult<T, TReturn>;
  throw(e: any): IteratorResult<T, TReturn>;
  [Symbol.iterator](): Generator<T, TReturn, TNext>;
}

interface BetterGeneratorResult<TYield> {
  done?: boolean;
  value: TYield;
}

interface BetterGenerator<Ser extends Series<unknown[]>> {
  next(...[value]: Ser extends undefined ? undefined : [Ser['input']]): BetterGeneratorResult<Ser['output']>;
  return(value: TReturn): BetterGeneratorResult<T>;
  throw(e: any): BetterGeneratorResult<T>;
  [Symbol.iterator](): BetterGenerator<Ser>;
}

type Arr = unknown[] | Readonly<unknown[]>;

export type Series<T extends Arr> = T[0] extends undefined ? undefined : SeriesItem<T, null, T[0]>;

export function createTask<T extends unknown[]>(fn: () => Generator<T>) {}

interface GeneratorTask {
  <T extends unknown[]>(...args: T): void;
}

createTask(function* () {
  const a = yield Promise.resolve();
  const b = yield 1;
  const c = yield { hello: 'world' };
  return null;
});
