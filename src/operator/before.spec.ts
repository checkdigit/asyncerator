// operator/before.spec.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import net from 'node:net';
import { PassThrough } from 'node:stream';
import { describe, it } from 'node:test';

import {
  all,
  before,
  forEach,
  from,
  pipeline,
  toArray,
  toNull,
  toString,
} from '../index.ts';

describe('before', async () => {
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
    // echo server
    const server = net.createServer((socket) => {
      // eslint-disable-next-line @checkdigit/no-promise-instance-method
      pipeline(
        socket,
        new PassThrough(),
        before('before '),
        socket,
        toNull,
        // handle rejection without returning a promise from the socket listener.
        // eslint-disable-next-line unicorn/prefer-await
      ).catch(() => {
        assert.fail();
      });
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    assert.ok(address !== null && typeof address !== 'string');

    // send no data
    assert.deepEqual(
      await pipeline(
        Buffer.from('').values(),
        new net.Socket().connect(address.port, address.address),
        toString,
      ),
      'before ',
    );

    // send some data
    assert.deepEqual(
      await pipeline(
        'client',
        new net.Socket().connect(address.port, address.address),
        toString,
      ),
      'before client',
    );

    // close the server
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });
});
