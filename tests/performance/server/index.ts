import { styleText } from 'node:util';
import { join } from 'path';
const FIXTURES_LOCATION = join(__dirname, '../fixtures/generated');

const RESP_OBJECT = {
  'Content-Type': 'application/json',
  'Transfer-Encoding': 'chunked',
  'Content-Encoding': 'br',
  'Cache-Control': 'public, max-age=604800',
};

Bun.serve({
  port: process.env.FIXTURE_API_PORT ? Number(process.env.FIXTURE_API_PORT) : 9999,
  async fetch(request) {
    const url = request.url.split('/fixtures')[1];
    const filePath = join(FIXTURES_LOCATION + url + '.br');
    const fileRef = Bun.file(filePath);

    if (!(await fileRef.exists())) {
      return new Response('Not Found', { status: 404 });
    }

    return new Response(fileRef, {
      headers: new Headers(RESP_OBJECT),
    });
  },
});

console.log(
  styleText(
    'grey',
    `Fixture API running at ${styleText('yellow', 'http://') + styleText('cyan', 'localhost') + styleText('magenta', `:${process.env.FIXTURE_API_PORT || 9999}`)}`
  )
);
