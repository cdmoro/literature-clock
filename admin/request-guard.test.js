// @vitest-environment node
import { expect, test } from 'vitest';
import config from './vite.config.mjs';

function request(headers) {
  let middleware;
  config.plugins[0].configureServer({
    middlewares: {
      use(handler) {
        middleware = handler;
      },
    },
  });
  let accepted = false;
  const response = { statusCode: 200, end() {} };
  middleware({ url: '/api/edit', headers }, response, () => {
    accepted = true;
  });
  return { accepted, status: response.statusCode };
}

test('accepts the local app and rejects cross-origin or unmarked requests', () => {
  const headers = { host: '127.0.0.1:5174', origin: 'http://127.0.0.1:5174', 'x-admin-request': '1' };
  expect(request(headers).accepted).toBe(true);
  expect(request({ ...headers, origin: 'https://foreign.example' }).status).toBe(403);
  expect(request({ ...headers, host: 'foreign.example' }).status).toBe(403);
  expect(request({ host: headers.host, origin: headers.origin }).status).toBe(403);
});
