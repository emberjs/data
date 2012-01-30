abort "Please use Ruby 1.9 to build Ember.js!" if RUBY_VERSION !~ /^1\.9/

require "rubygems"
require "net/github-upload"

require "bundler/setup"
require "erb"
require "uglifier"

# for now, the SproutCore compiler will be used to compile Ember.js
require "sproutcore"

LICENSE = File.read("generators/license.js")

## Some Ember modules expect an exports object to exist. Mock it out.

module SproutCore
  module Compiler
    class Entry
      def body
        "\n(function(exports) {\n#{@raw_body}\n})({});\n"
      end
    end
  end
end

## HELPERS ##

def strip_require(file)
  result = File.read(file)
  result.gsub!(%r{^\s*require\(['"]([^'"])*['"]\);?\s*}, "")
  result
end

def strip_ember_assert(file)
  result = File.read(file)
  result.gsub!(%r{^(\s)+ember_assert\((.*)\).*$}, "")
  result
end

def uglify(file)
  uglified = Uglifier.compile(File.read(file))
  "#{LICENSE}\n#{uglified}"
end

# Set up the intermediate and output directories for the interim build process

SproutCore::Compiler.intermediate = "tmp/intermediate"
SproutCore::Compiler.output       = "tmp/static"

# Create a compile task for an Ember package. This task will compute
# dependencies and output a single JS file for a package.
def compile_package_task(input, output=input)
  js_tasks = SproutCore::Compiler::Preprocessors::JavaScriptTask.with_input "packages/#{input}/lib/**/*.js", "."
  SproutCore::Compiler::CombineTask.with_tasks js_tasks, "#{SproutCore::Compiler.intermediate}/#{output}"
end

## TASKS ##

# Create ember:package tasks for each of the Ember packages
namespace :ember do
  %w(data).each do |package|
    task package => compile_package_task("ember-#{package}", "ember-#{package}")
  end
end

# Create a build task that depends on all of the package dependencies
task :build => ["ember:data"]

distributions = {
  "ember-data" => ["ember-data"]
}

distributions.each do |name, libraries|
  # Strip out require lines. For the interim, requires are
  # precomputed by the compiler so they are no longer necessary at runtime.
  file "dist/#{name}.js" => :build do
    puts "Generating #{name}.js"

    mkdir_p "dist", :verbose => false

    File.open("dist/#{name}.js", "w") do |file|
      libraries.each do |library|
        file.puts strip_require("tmp/static/#{library}.js")
      end
    end
  end

  # Minified distribution
  file "dist/#{name}.min.js" => "dist/#{name}.js" do
    require 'zlib'

    print "Generating #{name}.min.js... "
    STDOUT.flush

    File.open("dist/#{name}.prod.js", "w") do |file|
      file.puts strip_ember_assert("dist/#{name}.js")
    end

    minified_code = uglify("dist/#{name}.prod.js")
    File.open("dist/#{name}.min.js", "w") do |file|
      file.puts minified_code
    end

    gzipped_kb = Zlib::Deflate.deflate(minified_code).bytes.count / 1024

    puts "#{gzipped_kb} KB gzipped"

    rm "dist/#{name}.prod.js"
  end
end


desc "Build Ember.js"
task :dist => distributions.keys.map {|name| "dist/#{name}.min.js"}

desc "Clean build artifacts from previous builds"
task :clean do
  sh "rm -rf tmp && rm -rf dist"
end



### UPLOAD LATEST EMBERJS BUILD TASK ###
desc "Upload latest Ember Data build to GitHub repository"
task :upload => :dist do
  # setup
  login = `git config github.user`.chomp  # your login for github
  token = `git config github.token`.chomp # your token for github

  # get repo from git config's origin url
  origin = `git config remote.origin.url`.chomp # url to origin
  # extract USERNAME/REPO_NAME
  # sample urls: https://github.com/emberjs/ember.js.git
  #              git://github.com/emberjs/ember.js.git
  #              git@github.com:emberjs/ember.js.git
  #              git@github.com:emberjs/ember.js

  repo = origin.match(/github\.com[\/:](.+?)(\.git)?$/)[1]
  puts "Uploading to repository: " + repo

  gh = Net::GitHub::Upload.new(
    :login => login,
    :token => token
  )

  puts "Uploading ember-data-latest.js"
  gh.replace(
    :repos => repo,
    :file  => 'dist/ember-data.js',
    :name => 'ember-data-latest.js',
    :content_type => 'application/json',
    :description => "Ember Data Master"
  )

  puts "Uploading ember-data-latest.min.js"
  gh.replace(
    :repos => repo,
    :file  => 'dist/ember-data.min.js',
    :name => 'ember-data-latest.min.js',
    :content_type => 'application/json',
    :description => "Ember.js Data Master (minified)"
  )
end



### RELEASE TASKS ###

EMBER_VERSION = File.read("VERSION").strip

namespace :release do

  def pretend?
    ENV['PRETEND']
  end

  namespace :framework do
    desc "Update repo"
    task :update do
      puts "Making sure repo is up to date..."
      system "git pull" unless pretend?
    end

    desc "Update Changelog"
    task :changelog do
      last_tag = `git describe --tags --abbrev=0`.strip
      puts "Getting Changes since #{last_tag}"

      cmd = "git log #{last_tag}..HEAD --format='* %s'"
      puts cmd

      changes = `#{cmd}`
      output = "*Ember #{EMBER_VERSION} (#{Time.now.strftime("%B %d, %Y")})*\n\n#{changes}\n"

      unless pretend?
        File.open('CHANGELOG', 'r+') do |file|
          current = file.read
          file.pos = 0;
          file.puts output
          file.puts current
        end
      else
        puts output.split("\n").map!{|s| "    #{s}"}.join("\n")
      end
    end

    desc "bump the version to the one specified in the VERSION file"
    task :bump_version, :version do
      puts "Bumping to version: #{EMBER_VERSION}"

      unless pretend?
        # Bump the version of each component package
        Dir["packages/ember*/package.json", "ember.json"].each do |package|
          contents = File.read(package)
          contents.gsub! %r{"version": .*$}, %{"version": "#{EMBER_VERSION}",}
          contents.gsub! %r{"(ember-?\w*)": [^\n\{,]*(,?)$} do
            %{"#{$1}": "#{EMBER_VERSION}"#{$2}}
          end

          File.open(package, "w") { |file| file.write contents }
        end
      end
    end

    desc "Commit framework version bump"
    task :commit do
      puts "Commiting Version Bump"
      unless pretend?
        sh "git reset"
        sh %{git add VERSION CHANGELOG packages/**/package.json}
        sh "git commit -m 'Version bump - #{EMBER_VERSION}'"
      end
    end

    desc "Tag new version"
    task :tag do
      puts "Tagging v#{EMBER_VERSION}"
      system "git tag v#{EMBER_VERSION}" unless pretend?
    end

    desc "Push new commit to git"
    task :push do
      puts "Pushing Repo"
      unless pretend?
        print "Are you sure you want to push the ember.js repo to github? (y/N) "
        res = STDIN.gets.chomp
        if res == 'y'
          system "git push"
          system "git push --tags"
        else
          puts "Not Pushing"
        end
      end
    end

    desc "Prepare for a new release"
    task :prepare => [:update, :changelog, :bump_version]

    desc "Commit the new release"
    task :deploy => [:commit, :tag, :push]
  end
end

task :default => :dist
