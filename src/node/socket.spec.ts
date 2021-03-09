// node/socket.spec.ts

import assert from 'assert';
import net from 'net';

import portfinder from 'portfinder';

import { closeBefore, filter, map, split, toArray } from '../index';

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
          map((buffer) => buffer.toString()),
          split('\n'),
          closeBefore((command) => command === 'exit'),
          map((command) => `echo:${command}\n`),
          socket
        )
      )
      .listen(port, '127.0.0.1');

    // echo client
    const received = await pipeline(
      'Hello Mr Server!\nRegards, Client.\nexit\n',
      new net.Socket().connect(port, '127.0.0.1'),
      split('\n'),
      filter((line) => line !== ''),
      toArray
    );
    assert.deepStrictEqual(received, ['echo:Hello Mr Server!', 'echo:Regards, Client.']);

    // another echo client
    const received2 = await pipeline(
      '1\n2\n3\nexit\n',
      new net.Socket().connect(port, '127.0.0.1'),
      split('\n'),
      filter((line) => line !== ''),
      toArray
    );
    assert.deepStrictEqual(received2, ['echo:1', 'echo:2', 'echo:3']);

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
