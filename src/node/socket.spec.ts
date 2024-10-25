// node/socket.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import net from 'node:net';

import { describe, it } from '@jest/globals';
import getPort from 'get-port';

import { filter, map, split, toArray, toNull, toString } from '../index';

import pipeline from './pipeline';

describe('socket', () => {
  it('can implement a simple socket client/server', async () => {
    const port = await getPort();

    // echo server
    const server = net
      .createServer((socket) =>
        pipeline(
          socket,
          split('\n'),
          map((command) => `echo:${command}\n`),
          socket,
        ),
      )
      .listen(port, '127.0.0.1');

    // echo client
    const received = await pipeline(
      'Hello Mr Server!\nRegards, Client.\n',
      new net.Socket().connect(port, '127.0.0.1'),
      split('\n'),
      filter((line) => line !== ''),
      toArray,
    );
    assert.deepEqual(received, ['echo:Hello Mr Server!', 'echo:Regards, Client.']);

    // another echo client
    assert.equal(
      await pipeline('1\n2\n3\nhello\nworld\n', new net.Socket().connect(port, '127.0.0.1'), toString),
      'echo:1\necho:2\necho:3\necho:hello\necho:world\n',
    );

    // close the server
    await new Promise((resolve) => {
      server.close(resolve);
    });

    await assert.rejects(pipeline('should error', new net.Socket().connect(port, '127.0.0.1'), toArray), {
      message: `connect ECONNREFUSED 127.0.0.1:${port}`,
    });
  });

  it('supports abort', async () => {
    let aborted = false;
    const port = await getPort();
    const abortController = new AbortController();
    const options = {
      signal: abortController.signal,
    };
    setTimeout(() => {
      abortController.abort();
    }, 50);

    // echo server
    const server = net
      .createServer((socket) => {
        // eslint-disable-next-line @checkdigit/no-promise-instance-method
        pipeline(
          socket,
          split('\n'),
          map((command) => `echo:${command}\n`),
          socket,
          toNull,
          options,
        ).catch((error: unknown) => {
          assert.equal((error as Error).name, 'AbortError');
          assert.equal((error as Error).message, 'The operation was aborted');
          assert.ok(socket.destroyed);
          server.close();
          aborted = true;
        });
      })
      .listen(port, '127.0.0.1');

    // echo client 1
    const received1 = await pipeline(
      'hello\n',
      new net.Socket().connect(port, '127.0.0.1'),
      split('\n'),
      filter((line) => line !== ''),
      toArray,
    );
    assert.deepEqual(received1, ['echo:hello']);

    assert.ok(!aborted);
    assert.ok(server.listening);

    // wait for abort to happen
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });

    // echo client 2, post-abort, will get an initial connection but the abort is triggered.
    // note: on Linux, will reject with EPIPE, but on Mac, will reject with ECONNRESET.
    await assert.rejects(
      pipeline('goodbye\n', new net.Socket().connect(port, '127.0.0.1'), toArray),
      ({ code }: { code: string }) => code === 'ECONNRESET' || code === 'EPIPE',
    );

    // the server should be closed
    assert.ok(aborted);
    assert.ok(!server.listening);

    // can't connect
    await assert.rejects(pipeline('should error', new net.Socket().connect(port, '127.0.0.1'), toArray), {
      code: 'ECONNREFUSED',
    });
  });

  it('can send/receive buffers from simple socket client/server', async () => {
    const port = await getPort();

    // echo server
    const server = net
      .createServer((socket) =>
        pipeline(
          socket,
          split('\n'),
          map((command) => `echo:${command}\n`),
          socket,
        ),
      )
      .listen(port, '127.0.0.1');

    // echo client
    const received = await pipeline(
      [Buffer.from('Hello Mr Server!\nRegards, Client.\n')],
      new net.Socket().connect(port, '127.0.0.1'),
      split('\n'),
      filter((line) => line !== ''),
      toArray,
    );
    assert.deepEqual(received, ['echo:Hello Mr Server!', 'echo:Regards, Client.']);

    // close the server
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });
});
