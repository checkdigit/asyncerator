// node/socket.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import assert from 'assert';
import net from 'net';

import { all, filter, map, split, toArray, toNull, toString } from '../index';

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

  it('supports abort', async () => {
    let aborted = false;
    const port = await findPort();
    const abortController = new AbortController();
    const options = {
      signal: abortController.signal,
    };
    setTimeout(() => abortController.abort(), 50);

    // echo server
    const server = net
      .createServer((socket) => {
        pipeline(
          socket,
          split('\n'),
          map((command) => `echo:${command}\n`),
          socket,
          toNull,
          options
        ).catch((error) => {
          assert.strictEqual(error.name, 'AbortError');
          assert.strictEqual(error.message, 'The operation was aborted');
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
      toArray
    );
    assert.deepStrictEqual(received1, ['echo:hello']);

    assert.ok(!aborted);
    assert.ok(server.listening);

    // echo client 2, post-abort
    const received2 = await pipeline(
      all([
        new Promise((resolve) => {
          setTimeout(() => resolve('hello\n'), 100);
        }),
      ]),
      new net.Socket().connect(port, '127.0.0.1'),
      toArray
    );
    assert.deepStrictEqual(received2, []);

    // the server should be closed
    assert.ok(aborted);
    assert.ok(!server.listening);
    await assert.rejects(
      pipeline('should error', new net.Socket().connect(port, '127.0.0.1'), toArray),
      /^Error: connect ECONNREFUSED/u
    );
  });
});
