## Ember Data [![Build Status](https://secure.travis-ci.org/emberjs/data.png?branch=master)](http://travis-ci.org/emberjs/data)

Ember Data is a library for loading data from a persistence layer (such as
a JSON API), mapping this data to a set of models within your client application,
updating those models, then saving the changes back to a persistence layer. It 
provides many of the facilities you'd find in server-side ORMs like ActiveRecord, but is
designed specifically for the unique environment of JavaScript in the browser.

Ember Data provides a central Data Store, which can be configured with a range of 
provided Adapters, but two core Adapters are provided: the RESTAdapter and FixtureAdapter. 

The RESTAdapter is configured for use by default. You can read more about it in 
the [Guides](http://emberjs.com/guides/models/connecting-to-an-http-server/). It provides a fully
RESTful mechanism for communicating with your persistence layer, and is the preferred
and recommended choice for use with Ember Data.

This is definitely alpha-quality. The basics of RESTAdapter work, but there are for
sure edge cases that are not yet handled. Please report any bugs or feature
requests, and pull requests are always welcome.

#### Is It Good?

Yes.

#### Is It "Production Ready™"?

No. The API should not be considered stable until 1.0. Breaking changes,
and how to update accordingly, are listed in [`TRANSITION.md`](https://github.com/emberjs/data/blob/master/TRANSITION.md).

A [guide is provided on the Ember.js site](http://emberjs.com/guides/models/) that is accurate as of Ember Data 1.0 beta.

#### Getting ember-data

The latest passing build from the "master" branch is available on [http://emberjs.com/builds/#/canary](http://emberjs.com/builds/#/canary).

Similarly the latest passing build from the "beta" branch can be found on [http://emberjs.com/builds/#/beta](http://emberjs.com/builds/#/beta)


You also have the option to build ember-data.js yourself.  Clone the repository, run `grunt buildPackages` after [setup](#setup). You'll find ember-data.js in the `dist` directory.

#### Roadmap

* Handle error states
* Better built-in attributes
* Editing "forked" records
* Out-of-the-box support for Rails apps that follow the
  [`active_model_serializers`](https://github.com/rails-api/active_model_serializers) gem's conventions.
* Handle partially-loaded records

## How to Run Unit Tests

### Setup

1. Install Node.js from http://nodejs.org or your favorite package manager.

2. Install grunt and bower. `npm install -g grunt-cli bower`

3. Run `npm install && bower install` inside the project root to install the JS dependencies.

### In Your Browser

1. To start the development server, run `grunt dev`.

### From the CLI

1. Install phantomjs from http://phantomjs.org

2. Run `grunt test`

3. Run `grunt dev` to automatically re-run tests when any files are changed.
