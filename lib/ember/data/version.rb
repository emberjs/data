module Ember
  module Data
    VERSION = File.read(File.expand_path('../../../../VERSION', __FILE__)).strip.gsub(/[-\+]/, '.')
  end
end
