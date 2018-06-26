import Resolver from '../../resolver';
import config from '../../config/environment';

export default Resolver.create({
  namespace: {
    modulePrefix: config.modulePrefix,
    podModulePrefix: config.podModulePrefix,
  },
});
