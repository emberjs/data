/**
 <p align="center">
  <img
    class="project-logo"
    src="https://raw.githubusercontent.com/emberjs/data/4612c9354e4c54d53327ec2cf21955075ce21294/ember-data-logo-light.svg#gh-light-mode-only"
    alt="EmberData"
    width="240px"
    title="EmberData"
    />
</p>

<p align="center">
  <br>
  <a href="https://warp-drive.io">EmberData</a> is a lightweight data library for web apps &mdash;
  <br>
  universal, typed, reactive, and ready to scale.
  <br/><br/>
<p>

---

<blockquote style="margin: 1em; padding: .1em 1em .1em 1em; border-left: solid 1em #E34C32; background: #e0e0e0;">
  <h4>💡 Tip</h4>
  <p>
    EmberData is going universal and rebranding as WarpDrive
    with support for any signals based reactive framework!
  </p>
  <p>
    This means you may already see some references to WarpDrive.
  </p>
</blockquote>

EmberData provides features that make it easy to build scalable, fast, feature
rich application &mdash; letting you ship better experiences more quickly without re-architecting your app or API. EmberData is:

- ⚡️ Committed to Best-In-Class Performance
- 💚 Typed
- ⚛️ Works with any API
- 🌲 Focused on being as tiny as possible
- 🚀 SSR Ready
- 🔜 Seamless reactivity in any framework
- 🐹 Built with ♥️ by [Ember](https://emberjs.com)


## Quick Links

- Getting Started
  - [Basic Installation](#basic-installation)
  - [Advanced Installation](#advanced-installation)
  - [Configuration](../modules/@warp-drive%2Fbuild-config)

## Basic Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add ember-data
```

`ember-data` is installed by default for new applications generated with `ember-cli`. You can check what version is installed by looking in the `devDependencies` hash of your project's [package.json](https://docs.npmjs.com/cli/v8/configuring-npm/package-json) file.

If you have generated a new `Ember` application using `ember-cli` but do
not wish to use `ember-data`, remove `ember-data` from your project's `package.json` file and run your package manager's install command to update your lockfile.

## Advanced Installation

*Ember***Data** is organized into primitives that compose together via public APIs. These primitives are organized into
small packages encapsulating these boundaries. These packages
declare peer-dependencies (sometimes optional peer dependencies)
on the other *Ember***Data**\/*Warp***Drive** packages they require use of.

- [@ember-data/request](../modules/@ember-data%2Frequest) provides managed `fetch`
- [@ember-data/request-utils](../modules/@ember-data%2Frequest-utils) provides optional utilities for managing requests and string manipulation
- [@ember-data/store](../modules/@ember-data%2Fstore) provides core functionality around coordinating caching and reactivity
- [@ember-data/tracking](../modules/@ember-data%2Ftracking) enables integration with Ember's reactivity system
- [@ember-data/json-api](../modules/@ember-data%2Fjson-api) provides a cache for data in the [{JSON:API}](https://jsonapi.org) format.
- [@ember-data/debug](../modules/@ember-data%2Fdebug) provides (optional) debugging support for the `ember-inspector`.
- [@warp-drive/build-config](../modules/@warp-drive%2Fbuild-config) provides a build plugin which ensures proper settings configuration for deprecations, optional features, development/testing support and debug logging.
- [@warp-drive/core-types](../modules/@warp-drive%2Fcore-types) provides core types and symbols used by all other packages
- [@warp-drive/schema-record](../modules/@warp-drive%2Fschema-record) provides a flexible, schema-based approach to reactive data.
- [@warp-drive/ember](../modules/@warp-drive%2Fember) provides Ember specific components and utilities for reactive control-flow and declarative state management.

Some EmberData APIs are older than others, and these still interop via well-defined
 public API boundaries but are no longer the ideal approach.

- [@ember-data/model](../modules/@ember-data%2Fmodel) provides a class-based approach to declaring schemas for reactive data.
- [@ember-data/legacy-compat](../modules/@ember-data%2Flegacy-compat) provides support for the older adapter/serializer request paradigm that is being phased out
- [@ember-data/adapter](../modules/@ember-data%2Fadapter) provides various network API integrations for APIs built over specific REST or `{JSON:API}` conventions.
- [@ember-data/serializer](../modules/@ember-data%2Fserializer) provides an approach to normalizing and serializing data to and from an API format into the `{JSON:API}` format.

And finally:

- `ember-data` is a "meta" package which bundles many of these together for convenience in a "legacy" configuration.


 @module ember-data-overview
 @main ember-data-overview
*/
import { deprecate } from '@ember/debug';

import { dependencySatisfies, importSync, macroCondition } from '@embroider/macros';

import Adapter, { BuildURLMixin } from '@ember-data/adapter';
import AdapterError, {
  AbortError,
  ConflictError,
  ForbiddenError,
  InvalidError,
  NotFoundError,
  ServerError,
  TimeoutError,
  UnauthorizedError,
} from '@ember-data/adapter/error';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import Serializer from '@ember-data/serializer';
import JSONSerializer from '@ember-data/serializer/json';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import RESTSerializer, { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import Transform, {
  BooleanTransform,
  DateTransform,
  NumberTransform,
  StringTransform,
} from '@ember-data/serializer/transform';

import {
  DS,
  Errors,
  ManyArray,
  PromiseArray,
  PromiseManyArray,
  PromiseObject,
  RecordArrayManager,
  Snapshot,
  Store,
} from './-private/index';
import setupContainer from './setup-container';

deprecate(
  'Importing from `ember-data` is deprecated. Please import from the appropriate `@ember-data/*` instead.',
  false,
  {
    id: 'ember-data:deprecate-legacy-imports',
    for: 'ember-data',
    until: '6.0',
    since: {
      enabled: '5.2',
      available: '4.13',
    },
  }
);

interface DSLibrary extends DS {
  Store: typeof Store;
  PromiseArray: typeof PromiseArray;
  PromiseObject: typeof PromiseObject;
  PromiseManyArray: typeof PromiseManyArray;
  Model: typeof Model;
  attr: typeof attr;
  Errors: typeof Errors;
  Snapshot: typeof Snapshot;
  Adapter: typeof Adapter;
  AdapterError: typeof AdapterError;
  InvalidError: typeof InvalidError;
  TimeoutError: typeof TimeoutError;
  AbortError: typeof AbortError;
  UnauthorizedError: typeof UnauthorizedError;
  ForbiddenError: typeof ForbiddenError;
  NotFoundError: typeof NotFoundError;
  ConflictError: typeof ConflictError;
  ServerError: typeof ServerError;
  Serializer: typeof Serializer;
  DebugAdapter?: typeof import('@ember-data/debug').default;
  ManyArray: typeof ManyArray;
  RecordArrayManager: typeof RecordArrayManager;
  RESTAdapter: typeof RESTAdapter;
  BuildURLMixin: typeof BuildURLMixin;
  RESTSerializer: typeof RESTSerializer;
  JSONSerializer: typeof JSONSerializer;
  JSONAPIAdapter: typeof JSONAPIAdapter;
  JSONAPISerializer: typeof JSONAPISerializer;
  Transform: typeof Transform;
  DateTransform: typeof DateTransform;
  StringTransform: typeof StringTransform;
  NumberTransform: typeof NumberTransform;
  BooleanTransform: typeof BooleanTransform;
  EmbeddedRecordsMixin: typeof EmbeddedRecordsMixin;
  belongsTo: typeof belongsTo;
  hasMany: typeof hasMany;
  _setupContainer: typeof setupContainer;
}

function upgradeDS(obj: unknown): asserts obj is DSLibrary {}

upgradeDS(DS);

DS.Store = Store;
DS.PromiseArray = PromiseArray;
DS.PromiseObject = PromiseObject;
DS.PromiseManyArray = PromiseManyArray;
DS.Model = Model;
DS.attr = attr;
DS.Errors = Errors;
DS.Snapshot = Snapshot;
DS.Adapter = Adapter;
DS.AdapterError = AdapterError;
DS.InvalidError = InvalidError;
DS.TimeoutError = TimeoutError;
DS.AbortError = AbortError;
DS.UnauthorizedError = UnauthorizedError;
DS.ForbiddenError = ForbiddenError;
DS.NotFoundError = NotFoundError;
DS.ConflictError = ConflictError;
DS.ServerError = ServerError;
DS.Serializer = Serializer;

if (macroCondition(dependencySatisfies('@ember-data/debug', '*'))) {
  DS.DebugAdapter = importSync('@ember-data/debug') as typeof import('@ember-data/debug').default;
}

DS.ManyArray = ManyArray;
DS.RecordArrayManager = RecordArrayManager;
DS.RESTAdapter = RESTAdapter;
DS.BuildURLMixin = BuildURLMixin;
DS.RESTSerializer = RESTSerializer;
DS.JSONSerializer = JSONSerializer;
DS.JSONAPIAdapter = JSONAPIAdapter;
DS.JSONAPISerializer = JSONAPISerializer;
DS.Transform = Transform;
DS.DateTransform = DateTransform;
DS.StringTransform = StringTransform;
DS.NumberTransform = NumberTransform;
DS.BooleanTransform = BooleanTransform;
DS.EmbeddedRecordsMixin = EmbeddedRecordsMixin;
DS.belongsTo = belongsTo;
DS.hasMany = hasMany;
DS._setupContainer = setupContainer;

export default DS;
