# -*- encoding: utf-8 -*-
require './lib/ember/data/version'

Gem::Specification.new do |gem|
  gem.name          = "ember-data-source"
  gem.authors       = ["Yehuda Katz"]
  gem.email         = ["wycats@gmail.com"]
  gem.date          = Time.now.strftime("%Y-%m-%d")
  gem.summary       = %q{ember-data source code wrapper.}
  gem.description   = %q{ember-data source code wrapper for use with Ruby libs.}
  gem.homepage      = "https://github.com/emberjs/data"
  gem.version       = Ember::Data::VERSION
  gem.license       = "MIT"

  gem.add_dependency "ember-source", ">= 2", "< 3.0"

  gem.files = %w(package.json) + Dir['dist/globals/ember-data*.js', 'dist/globals/ember-data.js.map', 'lib/ember/data/*.rb']
end
