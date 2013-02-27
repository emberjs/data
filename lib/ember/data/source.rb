module Ember
  module Data
    module Source
      def self.bundled_path_for(distro)
        File.expand_path("../../../../dist/#{distro}", __FILE__)
      end
    end
  end
end
