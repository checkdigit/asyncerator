// node/socket.spec.ts

import assert from 'assert';
import net from 'net';

import portfinder from 'portfinder';

import { filter, map, split, toArray, toString } from '../index';

import pipeline from './pipeline';

export async function findPort(): Promise<number> {
  const PORT_NUMBER = 49152;
  const RANDOM_PORT_NUMBER_CEILING = 16000;
  return new Promise<number>((resolve, reject) => {
    // pick a base port randomly from the un-assignable port range, and search from there
    portfinder.getPort(
      { port: PORT_NUMBER + Math.floor(Math.random() * RANDOM_PORT_NUMBER_CEILING) },
      (err: Error, port: number) => {
        if (err) {
          reject(err);
        } else {
          resolve(port);
        }
      }
    );
  });
}

describe('socket', () => {
  it('can implement a simple socket client/server', async () => {
    const port = await findPort();

    // echo server
    const server = net
      .createServer((socket) =>
        pipeline(
          socket,
          split('\n'),
          // closeBefore((command) => command === 'exit'),
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
