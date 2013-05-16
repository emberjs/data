require 'bundler/setup'
require 'ember/source'
require 'ember-dev'

# This is not ideal
map "/lib" do
  run Rack::Directory.new('lib')
end

run EmberDev::Server.new
