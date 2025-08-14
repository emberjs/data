import type { TOC } from '@ember/component/template-only';
import { service } from '@ember/service';
import Component from '@glimmer/component';

import type { ComponentLike } from '@glint/template';

import type { RequestManager } from '@warp-drive/core';
import { assert } from '@warp-drive/core/build-config/macros';
import type { ReactiveDocument } from '@warp-drive/core/reactive';
import type { Future } from '@warp-drive/core/request';
import type {
  ContentFeatures,
  RecoveryFeatures,
  RequestArgs,
  RequestLoadingState,
  RequestState,
  RequestSubscription,
  Store,
} from '@warp-drive/core/store/-private';
import { createRequestSubscription, DISPOSE, getRequestState, memoized, signal } from '@warp-drive/core/store/-private';
import type { RequestInfo, StructuredErrorDocument } from '@warp-drive/core/types/request';
import type { RenderingTestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test } from '@warp-drive/diagnostic/ember';
import { Throw } from '@warp-drive/ember';

export const and = (x: unknown, y: unknown): boolean => Boolean(x && y);

// fetch initial request, render rows from it
// user opens a row,
// invoke queryForPath with the value for the opened node
// to get the request to get the children
// fetch the children
// render the children as rows

/**
 * our tree is a LinkedList
 *
 * the nodes are "rows" in a flattened representation of the tree
 * whose chldren can be skipped if the node is collapsed, or rendered
 * if the node is expanded.
 *
 * 500 entities, 10-20 processes, 5 subprocesses, 4-8 controlsDatum
 */

const DefaultChrome: TOC<{
  Blocks: {
    default: [];
  };
}> = <template>{{yield}}</template>;

interface TreeArgs<RT extends ReactiveDocument<object[]>, T> {
  /**
   * Initial state of the Tree, whether it is collapsed or not.
   */
  isCollapsed?: boolean;
  value: RT;
  queryForPath: (node: Node<RT, T>) => RequestInfo<RT>;
  store: Store | RequestManager;
}

interface TreeNode<RT extends ReactiveDocument<object[]>, T> {
  isCollapsed: boolean;
  depth: number;
  parent: Node<RT, T> | TreeState<RT, T> | null;
  tree: TreeState<RT, T>;
}

class TreeState<RT extends ReactiveDocument<object[]>, T> implements TreeNode<RT, T> {
  @signal isCollapsed = false;
  declare args: TreeArgs<RT, T>;
  depth = 0;
  parent = null;

  // TODO this should return undefined | null if the node is not actually in the tree vs creating one
  // TODO this should use a string key potentially for lookup same as selected
  getNodeForValue = (value: object): Node<RT, T> => getNodeForValue(value, this);

  // TODO should a serializable state for selection (string[]) be used instead of object[]
  @signal selected: object[] = [];

  // [entity, process, subprocess, controlDatum]; // all as the correct store object for whatever we are using for this link e.g. V1 or V2 records
  select = (value: object[]) => {
    this.selected = value;
  };

  update(args: TreeArgs<RT, T>) {
    this.args = args;
    // TODO we may want to not update isCollapsed after the first initialization
    this.isCollapsed = args.isCollapsed ?? false;
  }

  request(node: Node<RT, T>): Future<RT> {
    const query = this.args.queryForPath(node);
    return this.args.store.request(query);
  }

  get tree() {
    return this;
  }

  @memoized
  get nodes() {
    return this.args.value.data!.map((v) => getNodeForValue(v, this));
  }

  *[Symbol.iterator]() {
    // iterate this.nodes
    for (const node of this.nodes) {
      yield node;

      // if node is expanded, iterate the node's children next
      if (!node.isCollapsed) {
        for (const child of node) {
          yield child;
        }
      }
    }
  }
}

const TreeMap = new WeakMap<object, TreeState<ReactiveDocument<object[]>, unknown>>();
function getTreeFor<RT extends ReactiveDocument<object[]>, T>(value: object): TreeState<RT, T> {
  let tree = TreeMap.get(value);
  if (!tree) {
    // @ts-expect-error satisfies in this direction is hard
    tree = new TreeState<RT, T>();
    // @ts-expect-error satisfies in this direction is hard
    TreeMap.set(value, tree);
  }
  // @ts-expect-error satisfies in this direction is hard
  return tree as TreeState<RT, T>;
}

const NodeMap = new WeakMap<
  object,
  TreeNode<
    ReactiveDocument<object[]>,
    TreeState<ReactiveDocument<object[]>, unknown> | Node<ReactiveDocument<object[]>, unknown>
  >
>();

function getNodeForValue<RT extends ReactiveDocument<object[]>, T>(
  value: object,
  parent: TreeState<RT, T> | Node<RT, T>
): Node<RT, T> {
  let node = NodeMap.get(value);
  if (!node) {
    // @ts-expect-error satisfies in this direction is hard
    node = new Node<RT, T>(value, parent);
    // @ts-expect-error satisfies in this direction is hard
    NodeMap.set(value, node);
  }
  // @ts-expect-error satisfies in this direction is hard
  return node as Node<RT, T>;
}

class Node<RT extends ReactiveDocument<object[]>, T> implements TreeNode<RT, T> {
  _isCollapsed = true;
  declare value: unknown;
  declare parent: TreeState<RT, T> | Node<RT, T>;

  // TODO some sort of reactive args need to be received to control external expand/collapse as a group
  constructor(value: unknown, parent: TreeState<RT, T> | Node<RT, T>) {
    this.value = value;
    this.parent = parent;
  }

  // TODO invalidate the request so that if it re-requests we hit network
  invalidate = () => {};

  // TODO this and isCollapsed should be integrated with each other
  get isSelected() {
    const index = this.depth - 1;
    if (this.tree.selected.length <= index) {
      return false;
    }
    return this.tree.selected[index] === this.value;
  }

  get isCollapsed() {
    // TODO respond to args changes in args.isCollapsed
    return !this.isSelected || this._isCollapsed;
  }

  get tree(): TreeState<RT, T> {
    return this.parent.tree;
  }

  toggle = () => {
    this._isCollapsed = !this._isCollapsed;
  };

  @memoized
  get request() {
    return this.tree.request(this);
  }

  get state() {
    return getRequestState(this.request);
  }

  @memoized
  get nodes() {
    const { state } = this;
    if (state.isSuccess) {
      return state.value.data!.map((v) => getNodeForValue(v, this));
    } else {
      return [];
    }
  }

  @memoized
  get depth(): number {
    return this.parent.depth + 1;
  }

  *[Symbol.iterator](): Iterator<Node<RT, T>> {
    // iterate this.nodes
    for (const node of this.nodes) {
      yield node;

      // if node is expanded, iterate the node's children
      if (!node.isCollapsed) {
        for (const child of node) {
          yield child;
        }
      }
    }
  }
}

function notNull(x: null): never;
function notNull<T>(x: T): Exclude<T, null>;
function notNull<T>(x: T | null) {
  assert('Expected a non-null value, but got null', x !== null);
  return x;
}

const not = (x: unknown) => !x;
const IdleBlockMissingError = new Error(
  'No idle block provided for <Tree /> component, and no query or request was provided.'
);
const ContentOrRowMissingError = new Error(
  'No content or row block provided for <Tree /> component, but the request was successful.'
);
const BothContentAndRowPresentError = new Error(
  'Both content and row blocks were provided for <Tree /> component, but only one is allowed.'
);

export interface TreeComponentArgs<RT extends ReactiveDocument<object[]>, E, T> extends RequestArgs<RT, E> {
  chrome?: ComponentLike<{
    Blocks: { default: [] };
    Args: { state: RequestState | null; features: ContentFeatures<RT> };
  }>;
  /**
   * Initial state of the Tree, whether it is collapsed or not.
   */
  isCollapsed?: boolean;
  queryForPath: (node: Node<RT, T>) => RequestInfo<RT>;
}

interface TreeComponentSignature<RT extends ReactiveDocument<object[]>, E, T> {
  Args: TreeComponentArgs<RT, E, T>;
  Blocks: {
    /**
     * The block to render when the component is idle and waiting to be given a request.
     *
     */
    idle: [];

    /**
     * The block to render when the request is loading.
     *
     */
    loading: [state: RequestLoadingState];

    /**
     * The block to render when the request was cancelled.
     *
     */
    cancelled: [
      /**
       * The Error the request rejected with.
       */
      error: StructuredErrorDocument<E>,
      /**
       * Utilities to assist in recovering from the error.
       */
      features: RecoveryFeatures,
    ];

    /**
     * The block to render when the request failed. If this block is not provided,
     * the error will be rethrown.
     *
     * Thus it is required to provide an error block and proper error handling if
     * you do not want the error to crash the application.
     */
    error: [
      /**
       * The Error the request rejected with.
       */
      error: StructuredErrorDocument<E>,
      /**
       * Utilities to assist in recovering from the error.
       */
      features: RecoveryFeatures,
    ];

    /**
     * The block to render for each row in the tree's iterable list
     *
     */
    row: [value: Node<RT, T>, index: number];

    /**
     * The block to render for each row in the tree's iterable list
     *
     */
    content: [value: TreeState<RT, T>, features: ContentFeatures<RT>];
    always: [state: RequestState<RT, StructuredErrorDocument<E>>];
  };
}

class Tree<RT extends ReactiveDocument<object[]>, E, T> extends Component<TreeComponentSignature<RT, E, T>> {
  /**
   * The store instance to use for making requests. If contexts are available, this
   * will be the `store` on the context, else it will be the store service.
   *
   * @internal
   */
  @service('store') declare _store: Store;

  get store(): Store | RequestManager {
    const store = this.args.store || this._store;
    assert(
      `No store was provided to the <Request> component. Either provide a store via the @store arg or by registering a store service.`,
      store
    );
    return store;
  }

  @memoized
  get treeState(): TreeState<RT, T> | null {
    const value = this.state.reqState.isSuccess ? this.state.reqState.value : null;
    if (!value) {
      return null;
    }

    const tree = getTreeFor<RT, T>(this.state.request);
    tree.update({
      isCollapsed: this.args.isCollapsed,
      value: value,
      queryForPath: this.args.queryForPath,
      store: this.store,
    });

    return tree;
  }

  _state: RequestSubscription<RT, E> | null = null;
  get state(): RequestSubscription<RT, E> {
    let { _state } = this;
    const { store } = this;
    const { subscription } = this.args;
    if (_state && (_state.store !== store || subscription)) {
      _state[DISPOSE]();
      _state = null;
    }

    if (subscription) {
      return subscription;
    }

    if (!_state) {
      this._state = _state = createRequestSubscription(store, this.args);
    }

    return _state;
  }

  /**
   * The chrome component to use for rendering the request.
   *
   * @private
   */
  @memoized
  get Chrome(): ComponentLike<{
    Blocks: { default: [] };
    Args: { state: RequestState | null; features: ContentFeatures<RT> };
  }> {
    return this.args.chrome || DefaultChrome;
  }

  willDestroy(): void {
    if (this._state) {
      this._state[DISPOSE]();
      this._state = null;
    }
  }

  <template>
    <this.Chrome @state={{if this.state.isIdle null this.state.reqState}} @features={{this.state.contentFeatures}}>
      {{#if (and this.state.isIdle (has-block "idle"))}}
        {{yield to="idle"}}

      {{else if this.state.isIdle}}
        <Throw @error={{IdleBlockMissingError}} />

      {{else if this.state.reqState.isLoading}}
        {{yield this.state.reqState.loadingState to="loading"}}

      {{else if (and this.state.reqState.isCancelled (has-block "cancelled"))}}
        {{yield (notNull this.state.reqState.reason) this.state.errorFeatures to="cancelled"}}

      {{else if (and this.state.reqState.isError (has-block "error"))}}
        {{yield (notNull this.state.reqState.reason) this.state.errorFeatures to="error"}}

      {{else if (and this.state.reqState.isSuccess (has-block "row"))}}
        {{if (has-block "content")}}
          <Throw @error={{BothContentAndRowPresentError}} />
        {{/if}}
        {{#each this.treeState.nodes as |node index|}}
          {{yield node index to="row"}}
        {{/each}}
      {{else if (and this.state.reqState.isSuccess (has-block "content"))}}
        {{yield (notNull this.treeState) this.state.contentFeatures to="content"}}

      {{else if this.state.reqState.isSuccess}}
        <Throw @error={{ContentOrRowMissingError}} />

      {{else if (not this.state.reqState.isCancelled)}}
        <Throw @error={{(notNull this.state.reqState.reason)}} />
      {{/if}}

      {{yield this.state.reqState to="always"}}
    </this.Chrome>
  </template>
}

module('<Tree />', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (this: RenderingTestContext) {
    const tree = createTree({});

    this.render(
      <template>
        <Tree @request={{}}>
          <:row as |node index|></:row>
          <:content as |tree features|></:content>
        </Tree>
      </template>
    );
  });
});
