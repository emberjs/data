# Double store setup

Allows you to have 2 versions of ember-data installed at the same time. This strategy would be helpful in case you want to migrate you API, you can use v1 of BE services in old store and v2 setup for the mirror package. You can partially rewrite apps to use different store.

```sh
ember install ember-data-mirror
```

We would need to setup 2 services. First would take care of legacy setup. Second we can already start configuring for new API as was shown few moments ago.

```js
// app/services/store.js
export { default } from 'ember-data/store';
```

```js
// app/services/mirror-store.js
export { default } from ‘ember-data-mirror/store’;
```

Then with simple swap of service injection you can start migrating parts of the app

```diff
export default class AuthenticatedIndexRoute extends Route {

-  @service store;
+  @service('mirror-store') store;

  async model() {
    //...
  }
}
```

>> Warning:
>> Each store maintains its own cache. To ease refactoring, it is better to take a vertical slice (region) of the application. This approach prevents issues, when records in play are scattered across different stores. You cannot link records from different stores, but you can load them in both stores.

To improve DX while migrating we can start using contexts. I would not go deep on the topic. There would be the [talk covering contexts by Kevin](https://youtube.com/watch?v=ptCNK4ICxJ0).

I would like to show you the usage and what it unlocks. Using context component or just simply on route we can overwrite contexts for children.

```js
// app/components/logs-context.js
import Component from '@glimmer/component';
import { service } from '@ember/service';

export default class LogsContextComponent extends Component {
  @service mirrorStore;
}
```

```hbs
{{!-- app/components/logs-context.hbs --}}
<ContextProvider @key="store" @value={{this.mirrorStore}}>
  {{yield}}
</ContextProvider>
```

```hbs
{{!-- app/routes/logs.hbs --}}
<LogsContext>
  <LogsList />
</LogsContext>


And later in the app all we need to do is to change store service injection to be context consumption.

```diff
// app/components/log-list.js
 import { consume } from 'ember-provide-consume-context';

 export default class LogListComponent extends Component {
   @service session;
-  @service store;
+  @consume('store') store;

   get groupedEntries() {
```

Another example that a bit more advanced using contexts with multiple stores.

So lets say our `<StatefulButton />` component shared across whole app. We can make it store-aware, and return records from store of the context it was used in. So we import all stores, consume current context, and create a simple getter to understand in what context we operate. Here we only convert records, if we somehow still in v1Store.

```js
// app/components/stateful-button.js
export default class StatefulButtonComponent extends Component {
  ...
  @service('store') v1Store;
  @service('mirror-store') v2Store;
  @consume('store') contextStore;

  get shouldConvertV2ToV1() {
    return this.contextStore === this.v1Store;
  }

  async createEvent() {
    let record = this.contextStore.createRecord('log-entry', params);
    try {
      await record.save();
      let contextRecord = record;
      if (this.shouldConvertV2ToV1) {
        // you can also pushPayload to store here, up to your app needs
        contextRecord = await this.v1Store.findRecord(
          record.constructor.modelName,
          record.id,
        );
      }
      await this.args.onCreate(contextRecord);
    } catch (error) {
      // handle error
    }
  }

  //...
```

So after creating new record, we would load this same record into an old store if we find ourself in old context.  You can also push data to old store, really depends on your preference (maybe backend adds some data on return).

When the time comes to refactor models to SchemaRecords, mirror packages strategy would be go to way for it.

Double stores strategy have no ember-data version requirement.
