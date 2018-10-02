## ember-data

[![Build Status](https://secure.travis-ci.org/emberjs/data.svg?branch=master)](http://travis-ci.org/emberjs/data)
[![Code Climate](https://codeclimate.com/github/emberjs/data/badges/gpa.svg)](https://codeclimate.com/github/emberjs/data)
[![Discord Community Server](https://img.shields.io/discord/480462759797063690.svg?logo=discord)](https://discord.gg/zT3asNS)

`ember-data` is a library for robustly managing data in applications built with
[Ember.js](https://github.com/emberjs/ember.js/).

`ember-data` is designed to be agnostic to the underlying persistence
mechanism, so it works just as well with `JSON API` over `HTTP` as it does
with streaming `WebSockets` or local `IndexedDB` storage.

It provides many of the facilities you'd find in server-side `ORM`s like
`ActiveRecord`, but is designed specifically for the unique environment of
`JavaScript` in the browser.

- [Usage Guide](https://guides.emberjs.com/release/models/)
- [API Documentation](https://emberjs.com/api/ember-data/release/modules/ember-data)
- [Contributing Guide](./CONTRIBUTING.md)
- [RFCs](https://github.com/emberjs/rfcs/labels/T-ember-data)
- [Community](https://emberjs.com/community)
- [Team](https://emberjs.com/team)
- [Blog](https://emberjs.com/blog)

### Installation

`ember-data` is installed by default for new applications generated with `ember-cli`.

If you wish to add `ember-data` to an `addon` or `application`, you can do so by running
the following command, which will use `yarn` or `npm` to install `ember-data` as a `devDependency`.

```no-highlight
ember install ember-data
```

Similarly, if you have generated a new `Ember` application using `ember-cli` but do 
not wish to use `ember-data`, remove `ember-data` from your `package.json`.
