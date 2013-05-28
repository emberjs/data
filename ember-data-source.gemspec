# -*- encoding: utf-8 -*-
require 'json'

Gem::Specification.new do |gem|
  gem.name          = "ember-data-source"
  gem.authors       = ["Yehuda Katz"]
  gem.email         = ["wycats@gmail.com"]
  gem.date          = Time.now.strftime("%Y-%m-%d")
  gem.summary       = %q{ember-data source code wrapper.}
  gem.description   = %q{ember-data source code wrapper for use with Ruby libs.}
  gem.homepage      = "https://github.com/emberjs/data"
  gem.version       = "0.0.5"

  gem.add_dependency "ember-source"

  gem.files = Dir['dist/ember-data*.js']
  gem.files << 'lib/ember/data/source.rb'
end
