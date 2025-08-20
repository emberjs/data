import { useEmber } from '@warp-drive/diagnostic/ember';
import { Await } from '@warp-drive/ember';
import { AwaitSpec } from '@warp-drive-internal/specs/await-component.spec';

AwaitSpec.use(useEmber(), function (b) {
  b
    /* this comment just to make prettier behave */

    .test('it renders each stage of a promise', function (props) {
      const { promise, countFor } = props;
      return <template>
        <Await @promise={{promise}}>
          <:pending>Loading...<br />Count: {{countFor promise}}</:pending>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:success as |result|>{{result}}<br />Count: {{countFor result}}</:success>
        </Await>
      </template>;
    })

    .test('it renders only once when the promise already has a result cached', function (props) {
      const { promise, countFor } = props;

      return <template>
        <Await @promise={{promise}}>
          <:pending>Loading...<br />Count: {{countFor promise}}</:pending>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:success as |result|>{{result}}<br />Count: {{countFor result}}</:success>
        </Await>
      </template>;
    })

    .test('it transitions to error state correctly', function (props) {
      const { promise, countFor } = props;

      return <template>
        <Await @promise={{promise}}>
          <:pending>Loading...<br />Count: {{countFor promise}}</:pending>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:success as |result|>{{result}}<br />Count: {{countFor result}}</:success>
        </Await>
      </template>;
    })

    .test('it renders only once when the promise error state is already cached', function (props) {
      const { promise, countFor } = props;

      return <template>
        <Await @promise={{promise}}>
          <:pending>Loading...<br />Count: {{countFor promise}}</:pending>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:success as |result|>{{result}}<br />Count: {{countFor result}}</:success>
        </Await>
      </template>;
    });
});
