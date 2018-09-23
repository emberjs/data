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
[https://emberjs.com/builds/#/canary](https://emberjs.com/builds/#/canary).

Similarly, the latest passing build from the "beta" branch can be found
on [https://emberjs.com/builds/#/beta](https://emberjs.com/builds/#/beta)

Or build ember-data.js yourself. Clone the repository and run `npm run production`
after [setup](#setup). You'll find ember-data.js in the `dist` directory.

### Documentation

For documentation on how to use Ember Data, see the [Ember.js Guides
on models](https://guides.emberjs.com/release/models/).

# Building Ember Data

1. Ensure that [Node.js](http://nodejs.org/) and [yarn](https://yarnpkg.com/en/docs/install) are installed.
2. Install Ember CLI. `npm install -g ember-cli`
3. Run `yarn install` to ensure the required dependencies are installed.
4. Run `ember b -e production` to build Ember Data. The builds will be placed in the `dist/` directory.

# Contribution

See [CONTRIBUTING.md](https://github.com/emberjs/data/blob/master/CONTRIBUTING.md)

## How to Run Unit Tests

### Setup

1. Install Node.js from http://nodejs.org or your favorite package manager.

2. Install Ember CLI. `npm install -g ember-cli`

3. Run `yarn install` inside the project root to install the JS dependencies.

4. Run `ember test`

### Partners

[![Saucelabs](./images/saucelabs.png "Browser Testing by Saucelabs")
](https://saucelabs.com/)
