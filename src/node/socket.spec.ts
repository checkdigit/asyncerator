// node/socket.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import assert from 'assert';
import net from 'net';

import { filter, map, split, toArray, toString } from '../index';

import findPort from './find-port.test';
import pipeline from './pipeline';

describe('socket', () => {
  it('can implement a simple socket client/server', async () => {
    const port = await findPort();

    // echo server
    const server = net
      .createServer((socket) =>
        pipeline(
          socket,
          split('\n'),
          map((command) => `echo:${command}\n`),
          socket
        )
      )
      .listen(port, '127.0.0.1');

    // echo client
    const received = await pipeline(
      'Hello Mr Server!\nRegards, Client.\n',
      new net.Socket().connect(port, '127.0.0.1'),
      split('\n'),
      filter((line) => line !== ''),
      toArray
    );
    assert.deepStrictEqual(received, ['echo:Hello Mr Server!', 'echo:Regards, Client.']);

    // another echo client
    assert.strictEqual(
      await pipeline('1\n2\n3\nhello\nworld\n', new net.Socket().connect(port, '127.0.0.1'), toString),
      'echo:1\necho:2\necho:3\necho:hello\necho:world\n'
    );

    // close the server
    await new Promise((resolve) => {
      server.close(resolve);
    });

    await assert.rejects(
      pipeline('should error', new net.Socket().connect(port, '127.0.0.1'), toArray),
      /^Error: connect ECONNREFUSED/u
    );
  });
});
