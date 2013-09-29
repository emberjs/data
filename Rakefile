require "bundler/setup"
require "ember-dev/tasks"

require 'pathname'
require 'fileutils'

directory "tmp"

task :docs => "ember:docs"
task :clean => "ember:clean"
task :dist => "ember:dist"
task :test, [:suite] => "ember:test"
task :default => :dist

task :publish_build => [:dist, :docs] do
  root_dir = Pathname.new(__FILE__).dirname
  dist_dir = root_dir.join('dist')

  FileUtils.cp root_dir.join('docs', 'build', 'data.json'),
               dist_dir.join('ember-data-docs.json')

  files = %w{ember-data.js ember-data-docs.json}

  EmberDev::Publish.to_s3({
    :access_key_id => ENV['S3_ACCESS_KEY_ID'],
    :secret_access_key => ENV['S3_SECRET_ACCESS_KEY'],
    :bucket_name => ENV['S3_BUCKET_NAME'],
    :files => files.map { |f| dist_dir.join(f) }
  })
end
