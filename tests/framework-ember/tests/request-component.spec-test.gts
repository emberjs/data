import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import GlimmerComponent from '@glimmer/component';

import { memoized } from '@warp-drive/core/store/-private';
import type { SingleResourceDataDocument } from '@warp-drive/core/types/spec/document';
import type { Type } from '@warp-drive/core/types/symbols';
import { useEmber } from '@warp-drive/diagnostic/ember';
import { Request } from '@warp-drive/ember';
import { RequestSpec } from '@warp-drive-internal/specs/request-component.spec';

const arr = (...args: unknown[]) => args;

RequestSpec.use(useEmber(), function (b) {
  b
    /* this comment just to make prettier behave */

    .test('it renders each stage of a request that succeeds', function (props) {
      const { request, countFor, store } = props;
      return <template>
        <Request @store={{store}} @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>;
    })

    .test('it renders only once when the promise already has a result cached', function (props) {
      const { request, countFor, store } = props;

      return <template>
        <Request @store={{store}} @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:cancelled as |error|>Cancelled {{error.message}}<br />Count: {{countFor error}}</:cancelled>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>;
    })

    .test('it transitions to error state correctly', function (props) {
      const { request, countFor, store } = props;

      return <template>
        <Request @store={{store}} @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>;
    })

    .test('we can retry from error state', function (props) {
      const { request, countFor, retry, store } = props;

      return <template>
        <Request @store={{store}} @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:error as |error state|>{{error.message}}<br />Count:
            {{~countFor error~}}
            <button {{on "click" (fn retry state)}} test-id="retry-button">Retry</button>
          </:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>;
    })

    .test('externally retriggered request works as expected', function (props) {
      const { source, countFor, retry, store } = props;

      return <template>
        <Request @store={{store}} @request={{source.request}}>
          <:loading as |state|>Pending<br />Count: {{countFor state}}</:loading>
          <:error as |error state|>{{error.message}}<br />Count:
            {{~countFor error~}}
            <button {{on "click" (fn retry state)}} test-id="retry-button">Retry</button>
          </:error>
          <:content as |result state|>{{result.data.name}}<br />Count:
            {{countFor (arr result.data.name state.isRefreshing state.latestRequest)}}</:content>
        </Request>
      </template>;
    })

    .test('externally retriggered request works as expected (store CacheHandler)', function (props) {
      const { source, countFor, retry, store } = props;

      return <template>
        <Request @store={{store}} @request={{source.request}}>
          <:loading as |state|>Pending<br />Count: {{countFor state}}</:loading>
          <:error as |error state|>{{error.message}}<br />Count:
            {{~countFor error~}}
            <button {{on "click" (fn retry state)}} test-id="retry-button">Retry</button>
          </:error>
          <:content as |result state|>{{result.data.name}}<br />Count:
            {{countFor (arr result.data.name state.isRefreshing state.latestRequest)}}</:content>
        </Request>
      </template>;
    })

    .test('externally updated request arg works as expected', function (props) {
      const { source, countFor, retry, store } = props;

      return <template>
        <Request @store={{store}} @request={{source.request}}>
          <:loading as |state|>Pending<br />Count: {{countFor state}}</:loading>
          <:error as |error state|>{{error.message}}<br />Count:
            {{~countFor error~}}
            <button {{on "click" (fn retry state)}} test-id="retry-button">Retry</button>
          </:error>
          <:content as |result state|>{{result.data.name}}<br />Count:
            {{countFor (arr result.data.name state.isRefreshing state.latestRequest)}}</:content>
        </Request>
      </template>;
    })

    .test('it rethrows if error block is not present', function (props) {
      const { request, countFor, store } = props;

      return <template>
        <Request @store={{store}} @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>;
    })

    .test('it transitions to cancelled state correctly', function (props) {
      const { request, countFor, store } = props;

      return <template>
        <Request @store={{store}} @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:cancelled as |error|>Cancelled {{error.message}}<br />Count: {{countFor error}}</:cancelled>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>;
    })

    .test('we can retry from cancelled state', function (props) {
      const { request, countFor, retry, store } = props;

      return <template>
        <Request @store={{store}} @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:cancelled as |error state|>Cancelled:
            {{~error.message~}}<br />Count:
            {{~countFor error~}}
            <button {{on "click" (fn retry state)}} test-id="retry-button">Retry</button>
          </:cancelled>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>;
    })

    .test('it transitions to error state if cancelled block is not present', function (props) {
      const { request, countFor, store } = props;

      return <template>
        <Request @store={{store}} @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>;
    })

    .test('it does not rethrow for cancelled', function (props) {
      const { request, countFor, store } = props;

      return <template>
        <Request @store={{store}} @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>;
    })

    .test('it renders only once when the promise error state is already cached', function (props) {
      const { request, countFor, store } = props;

      return <template>
        <Request @store={{store}} @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>;
    })

    .test('isOnline updates when expected', function (props) {
      const { request, store } = props;

      return <template>
        <Request @store={{store}} @request={{request}}>
          <:content as |result state|>Online: {{state.isOnline}}</:content>
        </Request>
      </template>;
    })

    .test('@autorefreshBehavior="reload" works as expected', function (props) {
      const { request, store } = props;

      return <template>
        <Request
          @store={{store}}
          @request={{request}}
          @autorefresh={{true}}
          @autorefreshBehavior={{"reload"}}
          @autorefreshThreshold={{0}}
        >
          <:content as |result state|>{{result.data.attributes.name}} | Online: {{state.isOnline}}</:content>
        </Request>
      </template>;
    })

    .test('idle state does not error', function (props) {
      const { store } = props;

      return <template>
        <Request @store={{store}}>
          <:idle>Waiting</:idle>
          <:content>Content</:content>
          <:error>Error</:error>
        </Request>
      </template>;
    })

    .test('idle state errors if no idle block is present', function (props) {
      const { store } = props;

      return <template>
        <Request @store={{store}}>
          <:content>Content</:content>
          <:error>Error</:error>
        </Request>
      </template>;
    })

    .test('idle state allows for transition to request states', function (props) {
      const { state, store } = props;

      return <template>
        <Request @store={{store}} @request={{state.request}}>
          <:idle>Waiting</:idle>
          <:content>Content</:content>
          <:error>Error</:error>
        </Request>
      </template>;
    })

    .test(
      'request with an identity does NOT trigger a second request if the CachePolicy says it is not expired',
      function (props) {
        const { countFor, dependency, url, setRequest, store } = props;
        type User = {
          id: string;
          name: string;
          [Type]: 'user';
        };
        class Issuer extends GlimmerComponent {
          // Ensure that the request doesn't kick off until after the Request component renders.
          @memoized
          get request() {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- This is intentional.
            dependency.trackedThing; // subscribe to something tracked
            return setRequest(store.request<SingleResourceDataDocument<User>>({ url, method: 'GET' }));
          }

          <template>
            <Request @store={{store}} @request={{this.request}}>
              <:loading>Pending<br />Count: {{countFor "loading"}}</:loading>
              <:error as |error|>{{error.message}}<br />Count: {{countFor error.message}}</:error>
              <:content as |result|>{{result.data.name}}<br />{{countFor result.data.name}}</:content>
            </Request>
          </template>
        }

        return <template><Issuer /></template>;
      }
    )

    .test(
      'request with an identity DOES trigger a second request if the CachePolicy says it is expired',
      function (props) {
        const { countFor, dependency, url, setRequest, store } = props;
        type User = {
          id: string;
          name: string;
          [Type]: 'user';
        };
        class Issuer extends GlimmerComponent {
          // Ensure that the request doesn't kick off until after the Request component renders.
          @memoized
          get request() {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- This is intentional.
            dependency.trackedThing; // subscribe to something tracked
            return setRequest(store.request<SingleResourceDataDocument<User>>({ url, method: 'GET' }));
          }

          <template>
            <Request @store={{store}} @request={{this.request}}>
              <:loading>Pending<br />Count: {{countFor "loading"}}</:loading>
              <:error as |error|>{{error.message}}<br />Count: {{countFor error.message}}</:error>
              <:content as |result|>{{result.data.name}}<br />{{countFor result.data.name}}</:content>
            </Request>
          </template>
        }

        return <template><Issuer /></template>;
      }
    )

    // @ts-expect-error need to figure out how to do this for "compiled" versions of this type
    // If there's a typeerror here, we are missing a test.
    .never(null);
});
