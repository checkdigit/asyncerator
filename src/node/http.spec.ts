// node/http.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import assert from 'assert';
import http, { IncomingMessage, ServerResponse } from 'http';

import { map, split, toString } from '../index';

import pipeline from './pipeline';
import findPort from './find-port.test';

describe('http', () => {
  it('can implement a simple http client/server', async () => {
    const port = await findPort();

    // http server
    const server = http
      .createServer((request: IncomingMessage, response: ServerResponse) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        pipeline(
          request,
          split('\n'),
          map((command) => `echo:${command}\n`),
          response
        );
      })
      .listen(port, '127.0.0.1');

    // echo client
    const received = await new Promise((resolve: (value: Promise<string>) => void) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      pipeline(
        'hello\nworld',
        http.request(`http://127.0.0.1:${port}/`, { method: 'PUT' }, (response) =>
          resolve(pipeline(response, toString))
        )
      );
    });

    assert.deepStrictEqual(received, 'echo:hello\necho:world\n');

    // close the server
    await new Promise((resolve) => {
      server.close(resolve);
    });

    await assert.rejects(
      pipeline('should error', http.request(`http://127.0.0.1:${port}/`, { method: 'PUT' })),
      /^Error: connect ECONNREFUSED/u
    );
  });
});
