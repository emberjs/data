abort "Please use Ruby 1.9 to build Ember.js Data!" if RUBY_VERSION !~ /^1\.9/

require "bundler/setup"
require "erb"
require 'rake-pipeline'
require "ember_docs/cli"
require "colored"

desc "Strip trailing whitespace for JavaScript files in packages"
task :strip_whitespace do
  Dir["packages/**/*.js"].each do |name|
    body = File.read(name)
    File.open(name, "w") do |file|
      file.write body.gsub(/ +\n/, "\n")
    end
  end
end

desc "Build ember-data.js"
task :dist do
  Rake::Pipeline::Project.new("Assetfile").invoke
end

desc "Clean build artifacts from previous builds"
task :clean do
  sh "rm -rf tmp dist tests/ember-data-tests.js"
end

desc "Run jshint"
task :jshint do
  unless system("which jshint > /dev/null 2>&1")
    abort "Please install jshint. `npm install -g jshint`"
  end

  if system("jshint packages/ember*")
    puts "The JavaScript is clean".green
  else
    puts "The JavaScript is dirty".red
    exit(1)
  end
end


desc "Run tests with phantomjs"
task :test, [:suite] => :dist do |t, args|
  unless system("which phantomjs > /dev/null 2>&1")
    abort "PhantomJS is not installed. Download from http://phantomjs.org"
  end

  suites = {
    :default => ["package=all"],
    :all => ["package=all", "package=all&jquery=1.6.4", "package=all&extendprototypes=true", "package=all&extendprototypes=true&jquery=1.6.4"]
  }

  suite = args[:suite] || :default
  opts = suites[suite.to_sym]

  unless opts
    abort "No suite named: #{suite}"
  end

  cmd = opts.map do |opt|
    "phantomjs tests/qunit/run-qunit.js \"file://localhost#{File.dirname(__FILE__)}/tests/index.html?#{opt}\""
  end.join(' && ')

  # Run the tests
  puts "Running: #{opts.join(", ")}"
  success = system(cmd)

  if success
    puts "Tests Passed".green
  else
    puts "Tests Failed".red
    exit(1)
  end
end

desc "Automatically run tests (Mac OS X only)"
task :autotest do
  system("kicker -e 'rake test' packages")
end

task :default => :dist
