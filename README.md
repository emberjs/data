## Ember Data [![Build Status](https://secure.travis-ci.org/emberjs/data.png?branch=master)](http://travis-ci.org/emberjs/data)

Ember Data is a library for loading data from a persistence layer (such as
a JSON API), mapping this data to a set of models within your client application,
updating those models, then saving the changes back to a persistence layer. It 
provides many of the facilities you'd find in server-side ORMs like ActiveRecord, but is
designed specifically for the unique environment of JavaScript in the browser.

Ember Data provides a central Data Store, which can be configured with a range of 
provided Adapters, but two core Adapters are provided: the RESTAdapter and BasicAdapter. 

The RESTAdapter is configured for use by default. You can read more about it in 
the [Guides](http://emberjs.com/guides/models/the-rest-adapter/). It provides a fully
RESTful mechanism for communicating with your persistence layer, and is the preferred
and recommened choice for use with Ember Data.

The BasicAdapter is intended to provide a way for developers who want full control 
over how the persistence layer is communicated with via their own implemented Ajax
hooks

This is definitely alpha-quality. The basics of RESTAdapter work, but there are for
sure edge cases that are not yet handled. Please report any bugs or feature
requests, and pull requests are always welcome. The BasicAdapter is under heavy 
development at present. 

#### Is It Good?

Yes.

#### Is It "Production Ready™"?

No. The API should not be considered stable until 1.0. Breaking changes,
indexed by date, are listed in [`BREAKING_CHANGES.md`](https://github.com/emberjs/data/blob/master/BREAKING_CHANGES.md).

A [guide is provided on the Ember.js site](http://emberjs.com/guides/models/) that is accurate as of revision 11.

#### Getting ember-data

Currently you must build ember-data.js yourself.  Clone the repository, run `bundle` then `rake dist`. You'll find ember-data.js in the `dist` directory.

#### Roadmap

* Handle error states
* Better built-in attributes
* Editing "forked" records
* Out-of-the-box support for Rails apps that follow the
  [`active_model_serializers`](https://github.com/rails-api/active_model_serializers) gem's conventions.
* Handle partially-loaded records

## How to Run Unit Tests

### Setup

1. Install Ruby 1.9.2+. There are many resources on the web can help; one of the best is [rvm](https://rvm.io/).

2. Install Bundler: `gem install bundler`

3. Run `bundle` inside the project root to install the gem dependencies.

### In Your Browser

1. To start the development server, run `rackup`.

2. Then visit: `http://localhost:9292/?package=PACKAGE_NAME`.  Replace `PACKAGE_NAME` with the name of the package you want to run.  For example:

  * [Ember.js Data](http://localhost:9292/?package=ember-data)

To run multiple packages, you can separate them with commas. You can run all the tests using the `all` package:

<http://localhost:9292/?package=all>

You can also pass `jquery=VERSION` in the test URL to test different versions of jQuery. Default is 1.9.0.

### From the CLI

1. Install phantomjs from http://phantomjs.org

2. Run `rake test` to run a basic test suite or run `rake test[all]` to
   run a more comprehensive suite.

3. (Mac OS X Only) Run `rake autotest` to automatically re-run tests
   when any files are changed.
