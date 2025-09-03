# Model Name: singular or plural? What to choose? Why is that?

- ⮐ [Cookbook](./index.md)

## Resource Type (model name) conventions – or, why it was singular

If you have been working with WarpDrive (or EmberData) for a while, you might remember a convention about singular-dasherized resource types (or modelNames). It was a convention that model names should be singular. But why is that? Why not plural? And why dasherized?

There is no longer any strict rule in WarpDrive governing what naming convention to use for resource types. Before, you may have been using singular names, because you had default Serializer configured in your app. The default serializers assume types should be singular and dasherized, and since they do the job of data normalization for you, they would singularize and dasherize the `types` received from your server.

### So what to choose?

When using WarpDrive without Legacy setup, you are responsible for data normalization. You can choose whatever you want. You can use singular or plural names. It is up to you. Or up to your backend to be precise, as it would be beneficial for you to not do all that normalization on frontend. Just have it as a part of API contract of your app. But remember, you need to be consistent. If you choose singular names, stick with it. If you choose plural names, stick with it. **Be Consistent!**

What does consistency look like?

#### Let's say your convention is singular dasherized, e.g. `user-setting`

- the API should respond with `user-setting` (or your handler/serializer should normalize the type to)
- calls to store methods should use the same format: `store.findRecord('user-setting', '1')`
- relationship definitions should also use this format:

  ```ts
  class User extends Model {
    @hasMany('user-setting', { async: false, inverse: null }) userSettings;
  }
  ```

- The model files should also use this format, e.g. the model would be located in `app/models/user-setting.{js,ts}`

#### But what about plural and snake case?

- the API should respond with `user_settings`
- calls to store methods: `store.findRecord('user_settings', '1')`
- relationship definitions:

  ```ts
  class User extends Model {
    @hasMany('user_settings', { async: false, inverse: null }) userSettings;
  }
  ```

- The model file would be located in `app/models/user_settings.{js,ts}`

### But what about JSON:API spec?

It's pretty simple, JSON:API spec agnostic about the `type` field convention. Here is the quote from the spec:

> Note: This spec is agnostic about inflection rules, so the value of type can be either plural or singular. However, the same value should be used consistently throughout an implementation.

You can read more about it in the [JSON:API spec](https://jsonapi.org/format/#document-resource-object-identification).

---

- ⮐ [Cookbook](./index.md)
