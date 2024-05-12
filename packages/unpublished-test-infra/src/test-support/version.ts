import { getOwnConfig } from '@embroider/macros';

type OWNCONFIG = {
  VERSION: string;
  COMPAT_VERSION: string;
};

const VERSION: string = getOwnConfig<OWNCONFIG>().VERSION;
const COMPAT_VERSION: string = getOwnConfig<OWNCONFIG>().COMPAT_VERSION;

export default VERSION;

export { COMPAT_VERSION };
