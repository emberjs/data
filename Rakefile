abort "Please use Ruby 1.9 to build Ember.js!" if RUBY_VERSION !~ /^1\.9/

require "bundler/setup"
require "erb"
require 'rake-pipeline'
require "colored"

def pipeline
  Rake::Pipeline::Project.new("Assetfile")
end

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

namespace :ember do
  desc "Update Ember.js to master (packages/ember/lib/main.js)"
  task :update => "packages/ember/lib/main.js"
end

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
  puts "Building Ember Data..."
  pipeline.invoke
  puts "Done"
end

desc "Clean build artifacts from previous builds"
task :clean do
  puts "Cleaning build..."
  pipeline.clean
  puts "Done"
end

desc "Upload latest ember-data.js build to GitHub repository"
task :commit_latest => [:clean, :dist] do
  raise "Save your changes" unless `git status --porcelain`.empty?
  unless `git branch`.include?("dist")
    puts "Creating a new dist branch"
    system 'git checkout --orphan dist'
    puts "Removing junk in index"
    system 'git rm --cached -r .'
    puts "Removing non-dist files"
    system "rm -rf `find * -type d -prune -o -type f | grep -ve '^dist$'`"
    puts "Removing silly dotfiles"
    system "rm -rf `find .* -type d -prune -o -type f | grep -ve '^.git$' | grep -ve '^dist$'`"
  else
    system 'git checkout dist'
  end
  puts "Committing latest release builds ember-data.js"
  system 'git add dist/ember-data.min.js'
  system 'git add dist/ember-data.js'
  system 'git commit -m "Pushing latests builds of ember-data.js"'
end


desc "Run tests with phantomjs"
task :test, [:suite] => :dist do |t, args|
  unless system("which phantomjs > /dev/null 2>&1")
    abort "PhantomJS is not installed. Download from http://phantomjs.org"
  end

  suites = {
    :default => ["package=all"],
    :all => ["package=all",
              "package=all&jquery=1.7.2&nojshint=true",
              "package=all&extendprototypes=true&nojshint=true",
              "package=all&extendprototypes=true&jquery=1.7.2&nojshint=true",
              "package=all&dist=build&nojshint=true"]
  }

  if ENV['TEST']
    opts = [ENV['TEST']]
  else
    suite = args[:suite] || :default
    opts = suites[suite.to_sym]
  end

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
