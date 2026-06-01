// node/socket.spec.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import net from 'node:net';

import { describe, it } from 'node:test';

import { filter, map, split, toArray, toNull, toString } from '../index.ts';

import pipeline from './pipeline.ts';

describe('socket', async () => {
  it('can implement a simple socket client/server', async () => {
    // echo server
    const server = net.createServer((socket) =>
      pipeline(
        socket,
        split('\n'),
        map((command) => `echo:${command}\n`),
        socket,
      ),
    );
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    assert.ok(address !== null && typeof address !== 'string');

    // echo client
    const received = await pipeline(
      'Hello Mr Server!\nRegards, Client.\n',
      new net.Socket().connect(address.port, address.address),
      split('\n'),
      filter((line) => line !== ''),
      toArray,
    );
    assert.deepEqual(received, [
      'echo:Hello Mr Server!',
      'echo:Regards, Client.',
    ]);

    // another echo client
    assert.equal(
      await pipeline(
        '1\n2\n3\nhello\nworld\n',
        new net.Socket().connect(address.port, address.address),
        toString,
      ),
      'echo:1\necho:2\necho:3\necho:hello\necho:world\n',
    );

    // close the server
    await new Promise((resolve) => {
      server.close(resolve);
    });

    await assert.rejects(
      pipeline(
        'should error',
        new net.Socket().connect(address.port, address.address),
        toArray,
      ),
      {
        message: `connect ECONNREFUSED ${address.address}:${address.port}`,
      },
    );
  });

  it('supports abort', async () => {
    let aborted = false;
    const abortController = new AbortController();
    const options = {
      signal: abortController.signal,
    };
    setTimeout(() => {
      abortController.abort();
    }, 50);

    // echo server
    const server = net.createServer((socket) => {
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
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    assert.ok(address !== null && typeof address !== 'string');

    // echo client 1
    const received1 = await pipeline(
      'hello\n',
      new net.Socket().connect(address.port, address.address),
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
      pipeline(
        'goodbye\n',
        new net.Socket().connect(address.port, address.address),
        toArray,
      ),
      ({ code }: { code: string }) => code === 'ECONNRESET' || code === 'EPIPE',
    );

    // the server should be closed
    assert.ok(aborted);
    assert.ok(!server.listening);

    // can't connect
    await assert.rejects(
      pipeline(
        'should error',
        new net.Socket().connect(address.port, address.address),
        toArray,
      ),
      {
        code: 'ECONNREFUSED',
      },
    );
  });

  it('can send/receive buffers from simple socket client/server', async () => {
    // echo server
    const server = net.createServer((socket) =>
      pipeline(
        socket,
        split('\n'),
        map((command) => `echo:${command}\n`),
        socket,
      ),
    );
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    assert.ok(address !== null && typeof address !== 'string');

    // echo client
    const received = await pipeline(
      [Buffer.from('Hello Mr Server!\nRegards, Client.\n')],
      new net.Socket().connect(address.port, address.address),
      split('\n'),
      filter((line) => line !== ''),
      toArray,
    );
    assert.deepEqual(received, [
      'echo:Hello Mr Server!',
      'echo:Regards, Client.',
    ]);

    // close the server
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });
});
