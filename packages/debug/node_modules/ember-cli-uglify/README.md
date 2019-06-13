
ember-cli-uglify
==============================================================================

[![npm](https://img.shields.io/npm/v/ember-cli-uglify.svg)](https://www.npmjs.com/package/ember-cli-uglify)
[![Build Status](https://travis-ci.org/ember-cli/ember-cli-uglify.svg?branch=master)](https://travis-ci.org/ember-cli/ember-cli-uglify)
[![Build status](https://ci.appveyor.com/api/projects/status/xbx40pk5b4ykawjh/branch/master?svg=true)](https://ci.appveyor.com/project/embercli/ember-cli-uglify/branch/master)

[UglifyJS](https://github.com/mishoo/UglifyJS2) for [Ember.js](http://emberjs.com/).


Installation
------------------------------------------------------------------------------

```
ember install ember-cli-uglify
```

Usage
------------------------------------------------------------------------------

After installing `ember-cli-uglify` it will automatically hook into the build
pipeline and minify your JS files in production builds.

If you want to customize how `ember-cli-uglify` is running UglifyJS under the
hood you have several configuration options available:

```js
// ember-cli-build.js

var app = new EmberApp({
  'ember-cli-uglify': {
    enabled: true,

    exclude: ['vendor.js'],

    uglify: {
      compress: {
        sequences: 50,
      },
      output: {
        semicolons: true,
      },
    },
  },
});
```


### Options

- `enabled?: boolean`: Enables/Disables minification (defaults to `true` for
  production builds, `false` for development builds)

- `exclude?: string[]`: A list of paths or globs to exclude from minification

- `uglify?: UglifyOptions`: A hash of [options](https://github.com/mishoo/UglifyJS2#minify-options)
  that are passed directly to UglifyJS


### Source Maps

Source maps are disabled by default for production builds in Ember CLI. If you
want to enable source maps for production builds you can configure that in your
`ember-cli-build.js` too:

```js
// ember-cli-build.js

var app = new EmberApp({
  sourcemaps: {
    enabled: true,
    extensions: ['js'],
  },
});
```


License
------------------------------------------------------------------------------
ember-cli-uglify is licensed under the [MIT License](LICENSE.md).
