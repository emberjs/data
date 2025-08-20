import { useEmber } from '@warp-drive/diagnostic/ember';
import { GetPromiseStateSpec } from '@warp-drive-internal/specs/get-promise-state.spec';

GetPromiseStateSpec.use(useEmber(), function (b) {
  b
    /* this comment just to make prettier behave */

    .test('it renders each stage of a promise resolving in a new microtask queue', function (props) {
      const { defer, _getPromiseState, countFor } = props;
      return <template>
        {{#let (_getPromiseState defer.promise) as |state|}}
          {{state.result}}<br />Count:
          {{countFor state.result}}
        {{/let}}
      </template>;
    })

    .test('it renders each stage of a promise resolving in the same microtask queue', function (props) {
      const { promise, _getPromiseState, countFor } = props;

      return <template>
        {{#let (_getPromiseState promise) as |state|}}
          {{state.result}}<br />Count:
          {{countFor state.result}}
        {{/let}}
      </template>;
    })

    .test('it renders only once when the promise already has a result cached', function (props) {
      const { promise, _getPromiseState, countFor } = props;

      return <template>
        {{#let (_getPromiseState promise) as |state|}}
          {{state.result}}<br />Count:
          {{countFor state.result}}
        {{/let}}
      </template>;
    })

    .test('it transitions to error state correctly', function (props) {
      const { promise, _getPromiseState, countFor } = props;

      return <template>
        {{#let (_getPromiseState promise) as |state|}}
          {{#if state.isPending}}
            Pending
          {{else if state.isError}}
            {{state.error.message}}
          {{else if state.isSuccess}}
            Invalid Success Reached
          {{/if}}
          <br />Count:
          {{countFor state.result state.error}}{{/let}}
      </template>;
    })

    .test('it renders only once when the promise error state is already cached', function (props) {
      const { promise, _getPromiseState, countFor } = props;

      return <template>
        {{#let (_getPromiseState promise) as |state|}}
          {{#if state.isPending}}
            Pending
          {{else if state.isError}}
            {{state.error.message}}
          {{else if state.isSuccess}}
            Invalid Success Reached
          {{/if}}
          <br />Count:
          {{countFor state.result state.error}}{{/let}}
      </template>;
    })

    .test('it unwraps promise-proxies that utilize the secret symbol for error states', function (props) {
      const { promise, _getPromiseState, countFor } = props;

      return <template>
        {{#let (_getPromiseState promise) as |state|}}
          {{#if state.isPending}}
            Pending
          {{else if state.isError}}
            {{state.error.message}}
          {{else if state.isSuccess}}
            Invalid Success Reached
          {{/if}}
          <br />Count:
          {{countFor state.result state.error}}{{/let}}
      </template>;
    })

    .test('it unwraps promise-proxies that utilize the secret symbol for success states', function (props) {
      const { promise, _getPromiseState, countFor } = props;

      return <template>
        {{#let (_getPromiseState promise) as |state|}}
          {{state.result}}<br />Count:
          {{countFor state.result}}
        {{/let}}
      </template>;
    });
});
