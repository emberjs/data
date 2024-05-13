import { getOwnConfig } from '@embroider/macros';

const VERSION = getOwnConfig<{ VERSION: string }>().VERSION;
export default VERSION;
