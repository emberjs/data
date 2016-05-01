## Ember Data [![Build Status](https://secure.travis-ci.org/emberjs/data.svg?branch=master)](http://travis-ci.org/emberjs/data) [![Code Climate](https://codeclimate.com/github/emberjs/data/badges/gpa.svg)](https://codeclimate.com/github/emberjs/data)

Ember Data is a library for robustly managing model data in your
Ember.js applications.

Ember Data is designed to be agnostic to the underlying persistence
mechanism, so it works just as well with JSON APIs over HTTP as it does
with streaming WebSockets or local IndexedDB storage.

It provides many of the facilities you'd find in server-side ORMs like
ActiveRecord, but is designed specifically for the unique environment of
JavaScript in the browser.

In particular, Ember Data uses Promises/A+-compatible promises from the
ground up to manage loading and saving records, so integrating with
other JavaScript APIs is easy.

Igor Terzic is currently the lead maintainer of Ember Data, while the rest
of the core team include Yehuda Katz, Tom Dale, Brendan McLoughlin,
Christoffer Persson and Stanley Stuart.

## Using Ember Data

### Getting Ember Data

Since version `2.3` ember-data is a proper Ember-CLI addon which can be added
to your app via:

```no-highlight
ember install ember-data
```

If you need to use a version of ember-data package `< 2.3`, you need to add the
npm package and add the dependency via bower:

```no-highlight
npm install ember-data@v2.2.1 --save-dev
bower install ember-data --save
```

The latest passing build from the "master" branch is available on
[http://emberjs.com/builds/#/canary](http://emberjs.com/builds/#/canary).

Similarly, the latest passing build from the "beta" branch can be found
on [http://emberjs.com/builds/#/beta](http://emberjs.com/builds/#/beta)

Or build ember-data.js yourself. Clone the repository and run `npm run build:production`
after [setup](#setup). You'll find ember-data.js in the `dist` directory.

#### Internet Explorer 8

**Internet Explorer 8 is no longer supported by Ember Data on versions
2.0 and later.**

If you require IE8 support, you can use the `1.13` series of releases.
The source code is available on the `release-1-13` branch.

Internet Explorer 8 support requires Ember 1.8.1 (which provides a polyfill for `Object.create`).

### Instantiating the Store

In Ember Data, the _store_ is responsible for managing the lifecycle of
your models. Every time you need a model or a collection of models,
you'll ask the store for it.

To create a store, you don't need to do anything. Just by loading the
Ember Data library, all of the routes and controllers in your
application will get a new `store` property. This property is an
instance of `DS.Store` that will be shared across all of the routes and
controllers in your app.

### Defining Your Models

First thing's first: tell Ember Data about the models in your
application. For example, imagine we're writing a blog reader app.

Here's what your model definition would look like if you're using
ES6 modules (via ember-cli):

```js
// app/models/blog-post.js
import DS from 'ember-data';

const { attr, hasMany } = DS;

export default DS.Model.extend({
  title: attr('string'),
  createdAt: attr('date'),

  comments: hasMany('comment')
});

// app/models/comment.js
import DS from 'ember-data';

const { attr, belongsTo } = DS;

export default DS.Model.extend({
  body: attr('string'),
  username: attr('string'),

  post: belongsTo('blog-post')
});
```

If you're using globals (that is, not something like ember-cli), your
models would look like this:

```js
var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;

App.BlogPost = DS.Model.extend({
  title: attr('string'),
  createdAt: attr('date'),

  comments: hasMany('comment')
});

App.Comment = DS.Model.extend({
  body: attr('string'),
  username: attr('string'),

  post: belongsTo('blog-post')
});
```

### A Brief Note on Adapters

Without immediately diving in to the depths of the architecture, one
thing you _should_ know is that Ember Data uses an object called an
_adapter_ to know how to talk to your server.

An adapter is just an object that knows how to translate requests from
Ember Data into requests on your server. For example, if I ask the Ember
Data store for a record of type `person` with an ID of `123`, the
adapter translates that into an XHR request to (for example)
`api.example.com/v3/person/123.json`.

By default, Ember Data will use the `RESTAdapter`, which adheres to a
set of RESTful JSON conventions.

To learn more about adapters, including what conventions the
`RESTAdapter` follows and how to build your own, see the Ember.js
Guides: [Customizing Adapters](http://emberjs.com/guides/models/customizing-adapters).

### Fetching a Collection of Models

From your route or controller:

```js
this.store.findAll('blog-post');
```

This returns a promise that resolves to the collection of records.

### Fetching a Single Model

```js
this.store.findRecord('blog-post', 123);
```

This returns a promise that resolves to the requested record. If the
record can't be found or there was an error during the request, the
promise will be rejected.

### Even More Documentation

For much more detail on how to use Ember Data, see the [Ember.js Guides
on models](http://emberjs.com/guides/models/).

# Building Ember Data

1. Ensure that [Node.js](http://nodejs.org/) is installed.
2. Run `npm install` to ensure the required dependencies are installed.
3. Run `npm run build:production` to build Ember Data. The builds will be placed in the `dist/` directory.

# Contribution

See [CONTRIBUTING.md](https://github.com/emberjs/data/blob/master/CONTRIBUTING.md)

## How to Run Unit Tests

### Setup

1. Install Node.js from http://nodejs.org or your favorite package manager.

2. Install Ember CLI and bower. `npm install -g ember-cli bower`

3. Run `npm install` inside the project root to install the JS dependencies.

### In Your Browser

1. To start the development server, run `npm start`.

2. Visit `http://localhost:4200/tests`

### From the CLI

1. Install phantomjs from http://phantomjs.org

2. Run `npm test`
