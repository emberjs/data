import { getGlobalConfig, getOwnConfig } from '@embroider/macros';

type OWNCONFIG = {
  VERSION: string;
};

const VERSION: string = getOwnConfig<OWNCONFIG>().VERSION;
const COMPAT_VERSION: string = getGlobalConfig<{ WarpDrive: { compatWith: string } }>().WarpDrive.compatWith;

export default VERSION;

export { COMPAT_VERSION };
