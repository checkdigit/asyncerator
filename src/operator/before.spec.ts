// operator/before.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import net from 'node:net';
import { PassThrough } from 'node:stream';

import { describe, it } from '@jest/globals';
import getPort from 'get-port';

import { all, before, forEach, from, pipeline, toArray, toNull, toString } from '../index';

describe('before', () => {
  it('works for an empty array', async () => {
    const result = await pipeline(all([]), before('abc'), toArray);
    assert.deepEqual(result, ['abc']);
  });

  it('operates on sequence', async () => {
    let count = 0;
    const results = await pipeline(
      from([3, 4, 5]),
      before(2),
      forEach(() => {
        count += 1;
      }),
      before(1),
      toArray,
    );
    assert.deepEqual(results, [1, 2, 3, 4, 5]);
    assert.equal(count, 4);
  });

  it('works with a socket client/server pipeline', async () => {
    const port = await getPort();

    // echo server
    const server = net
      .createServer((socket) => {
        // eslint-disable-next-line @checkdigit/no-promise-instance-method
        pipeline(socket, new PassThrough(), before('before '), socket, toNull).catch(() => {
          assert.fail();
        });
      })
      .listen(port, '127.0.0.1');

    // send no data
    assert.deepEqual(
      await pipeline(Buffer.from('').values(), new net.Socket().connect(port, '127.0.0.1'), toString),
      'before ',
    );

    // send some data
    assert.deepEqual(await pipeline('client', new net.Socket().connect(port, '127.0.0.1'), toString), 'before client');

    // close the server
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });
});
