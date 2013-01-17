## Ember Data [![Build Status](https://secure.travis-ci.org/emberjs/data.png?branch=master)](http://travis-ci.org/emberjs/data)

Ember Data is a library for loading data from a persistence layer (such as
a JSON API), mapping this data to a set of models within your client application,
updating those models, then saving the changes back to a persistence layer. It 
provides many of the facilities you'd find in server-side ORMs like ActiveRecord, but is
designed specifically for the unique environment of JavaScript in the browser.

This is definitely alpha-quality. The basics work, but there are for
sure edge cases that are not yet handled. Please report any bugs or feature
requests, and pull requests are always welcome.

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

## Unit Tests

To run unit tests, run `bundle exec rackup` from the root directory and visit
`http://localhost:9292/tests/index.html?package=ember-data`.
