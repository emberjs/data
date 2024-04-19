bun build --compile --> no dependencies whatsoever, including bun
may need to just do `bun build` (no compile) due to require.resolve issues?
just commit the compiled script

npx @ember-data/codemods apply ...
npx @ember-data/codemods list
npx @ember-data/codemods --help


import { Glob } from 'bun';

bun.glob
