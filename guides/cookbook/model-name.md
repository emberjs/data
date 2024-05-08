# Model Name: singular or plural? What to choose? Why is that?

- ⮐ [Cookbook](./index.md)

## Resource Type (model name) conventions – or, why it was singular

If you have been working with EmberData for a while, you might remember a convention about singular-dasherized resource types (or modelNames). It was a convention that model names should be singular. But why is that? Why not plural? And why dasherized?

There is no strict rule about model names. You was just using singular names because you had default Serializer configured in your app. It was doing all job of data normalization for you. Mainly it was singularizing `type` of response you had received from server.

## So what to choose?

When using EmberData without Legacy setup, you are responsible for data normalization. You can choose whatever you want. You can use singular or plural names. It is up to you. Or up to your backend to be precise, as it would be beneficial for you to not do all that normalization on frontend. Just have it as a part of API contract of your app. But remember, you need to be consistent. If you choose singular names, stick with it. If you choose plural names, stick with it.

## But what about JSON:API spec?

It's pretty simple, JSON:API spec agnostic about the `type` field convention. Here is the quote from the spec:

> Note: This spec is agnostic about inflection rules, so the value of type can be either plural or singular. However, the same value should be used consistently throughout an implementation.

You can read more about it in the [JSON:API spec](https://jsonapi.org/format/#document-resource-object-identification).

---

- ⮐ [Cookbook](./index.md)
