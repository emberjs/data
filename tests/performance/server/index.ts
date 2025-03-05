import { styleText } from 'node:util';
import { join } from 'path';
const FIXTURES_LOCATION = join(__dirname, '../fixtures/generated');

const RESP_OBJECT = {
  'Content-Type': 'application/json',
  'Transfer-Encoding': 'chunked',
  'Content-Encoding': 'br',
  'Cache-Control': 'public, max-age=604800',
};

const dist = join(__dirname, '../', process.argv[2] ?? 'dist');
const port = process.argv[3] && process.argv[3] === '-p' ? (Number(process.argv[4]) ?? 9999) : 9999;
const host = `http://localhost:${port}`;

Bun.serve({
  port,
  async fetch(request) {
    if (request.url.includes('/fixtures/')) {
      const url = request.url.split('/fixtures')[1];
      const filePath = join(FIXTURES_LOCATION + url + '.br');
      const fileRef = Bun.file(filePath);

      if (!(await fileRef.exists())) {
        return new Response('Not Found', { status: 404 });
      }

      return new Response(fileRef, {
        headers: new Headers(RESP_OBJECT),
      });
    }

    const fileName = request.url.split(host)[1];
    let filePath = join(dist, fileName === '/' ? '/index.html.br' : request.url.split(host)[1] + '.br');
    let fileRef = Bun.file(filePath);
    let exists = await fileRef.exists();
    if (!exists && (fileName === '/' || fileName.endsWith('.js') || fileName.endsWith('.css'))) {
      return new Response('Not Found', { status: 404 });
    } else if (!exists) {
      filePath = join(dist, '/index.html.br');
      fileRef = Bun.file(filePath);
      exists = await fileRef.exists();
    }

    if (!exists) {
      return new Response('Not Found', { status: 404 });
    }

    // prettier-ignore
    const mimeType = filePath.endsWith('.html.br') ? 'text/html'
      : filePath.endsWith('.js.br') ? 'application/javascript'
      : filePath.endsWith('.css.br') ? 'text/css'
      : filePath.endsWith('.json.br') ? 'application/json'
      : filePath.endsWith('.svg.br') ? 'image/svg+xml'
      : filePath.endsWith('.png.br') ? 'image/png'
      : filePath.endsWith('.jpg.br') ? 'image/jpeg'
      : 'text/plain';

    const headers = new Headers();
    // We always compress and chunk the response
    headers.set('Content-Encoding', 'br');
    // we don't cache since tests will often reuse similar urls for different payload
    headers.set('Cache-Control', 'max-age=31536000, public');
    // streaming requires Content-Length
    headers.set('Content-Length', String(fileRef.size));
    headers.set('Content-Type', mimeType);

    return new Response(fileRef, {
      headers,
    });
  },
});

console.log(
  styleText(
    'grey',
    `Application running at ${styleText('yellow', 'http://') + styleText('cyan', 'localhost') + styleText('yellow', `:${port}`)}`
  )
);
