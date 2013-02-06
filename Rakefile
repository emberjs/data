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
