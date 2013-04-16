require "bundler/setup"
require "ember-dev/tasks"

directory "tmp"

file "tmp/ember.js" => "tmp" do
  cd "tmp" do
    sh "git clone https://github.com/emberjs/ember.js.git"
  end
end

task :update_ember_git => ["tmp/ember.js"] do
  cd "tmp/ember.js" do
    sh "git fetch origin"
    sh "git reset --hard origin/master"
  end
end

file "tmp/ember.js/dist/ember.js"

file "packages/ember/lib/main.js" => [:update_ember_git, "tmp/ember.js/dist/ember.js"] do
  cd "tmp/ember.js" do
    sh "rake dist"
    cp "dist/ember.js", "../../packages/ember/lib/main.js"
  end
end

task :update_ember => "packages/ember/lib/main.js"


task :clean => "ember:clean"
task :dist => "ember:dist"
task :test, [:suite] => "ember:test"
task :default => :dist

task :publish_build do
  require 'date'
  require 'aws-sdk'
  access_key_id = ENV['S3_ACCESS_KEY_ID']
  secret_access_key = ENV['S3_SECRET_ACCESS_KEY']
  bucket_name = ENV['S3_BUCKET_NAME']
  rev=`git rev-list HEAD -n 1`.to_s.strip
  master_rev = `git rev-list origin/master -n 1`.to_s.strip
  return unless rev == master_rev
  return unless access_key_id && secret_access_key && bucket_name
  s3 = AWS::S3.new(
    :access_key_id => access_key_id,
    :secret_access_key => secret_access_key
  )
  bucket = s3.buckets[bucket_name]
  ember_data_latest = bucket.objects['ember-data-latest.js']
  ember_data_latest_min = bucket.objects['ember-data-latest.min.js']
  ember_data_dev = bucket.objects["ember-data-#{rev}.js"]
  ember_data_min = bucket.objects["ember-data-#{rev}.min.js"]
  dist = File.dirname(__FILE__) + '/dist/'
  data_path = Pathname.new dist + 'ember-data.js'
  min_path = Pathname.new dist + 'ember-data.min.js'
  ember_data_dev.write data_path
  ember_data_latest.write data_path
  ember_data_latest_min.write min_path
  ember_data_min.write min_path
  puts "Published ember-data for #{rev}"
end

