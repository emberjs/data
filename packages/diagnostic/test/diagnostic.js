import launch from '../server';
import { recommendedArgs, getBrowser } from '../server/browsers';

const chrome = await getBrowser('chrome');

await launch({
  entry: './index.html',
  assets: '.',
  parallel: 1,
  launchers: {
    chrome: {
      command: chrome,
      args: recommendedArgs('chrome'),
    },
  }
});
