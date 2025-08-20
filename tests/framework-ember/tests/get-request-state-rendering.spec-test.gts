import { useEmber } from '@warp-drive/diagnostic/ember';
import { GetRequestStateRenderingSpec } from '@warp-drive-internal/specs/get-request-state-rendering.spec';

GetRequestStateRenderingSpec.use(useEmber(), function (b) {
  b
    /* this comment just to make prettier behave */

    .test('it renders each stage of a request resolving in a new microtask queue', function (props) {
      const { request, _getRequestState, countFor } = props;
      return <template>
        {{#let (_getRequestState request) as |state|}}
          {{state.result.data.attributes.name}}<br />Count:
          {{countFor state.result}}
        {{/let}}
      </template>;
    })

    .test('it renders only once when the promise already has a result cached', function (props) {
      const { request, _getRequestState, countFor } = props;

      return <template>
        {{#let (_getRequestState request) as |state|}}
          {{state.result.data.attributes.name}}<br />Count:
          {{countFor state.result}}
        {{/let}}
      </template>;
    })

    .test('it transitions to error state correctly', function (props) {
      const { request, _getRequestState, countFor } = props;

      return <template>
        {{#let (_getRequestState request) as |state|}}
          {{#if state.isLoading}}
            Pending
          {{else if state.isError}}
            {{state.error.message}}
          {{else if state.isSuccess}}
            Invalid Success Reached
          {{/if}}
          <br />Count:
          {{countFor state.result state.error}}
        {{/let}}
      </template>;
    })

    .test('it renders only once when the promise error state is already cached', function (props) {
      const { request, _getRequestState, countFor } = props;

      return <template>
        {{#let (_getRequestState request) as |state|}}
          {{#if state.isLoading}}
            Pending
          {{else if state.isError}}
            {{state.error.message}}
          {{else if state.isSuccess}}
            Invalid Success Reached
          {{/if}}
          <br />Count:
          {{countFor state.result state.error}}
        {{/let}}
      </template>;
    });
});
