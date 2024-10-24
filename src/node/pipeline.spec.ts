// node/pipeline.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import { PassThrough, Readable, Writable } from 'node:stream';

import { describe, it } from '@jest/globals';

import { all, pipeline, toString } from '../index';

async function* passThru<T>(iterable: AsyncIterable<T>): AsyncGenerator<T> {
  for await (const thing of iterable) {
    yield thing;
  }
}

async function validateReadable(stream: Readable, expected: string) {
  assert.ok(stream.readable);

  let ended = false;
  stream.on('end', () => {
    ended = true;
  });

  let finished = false;
  stream.on('finish', () => {
    finished = true;
  });

  assert.equal(await toString(stream), expected);

  assert.ok(finished);
  assert.ok(ended);

  assert.equal(await toString(stream), '');
}

describe('pipeline', () => {
  it('returns promise if last parameter is an async function', async () => {
    const result1 = pipeline([undefined, 1, null, 2, true, 3, [4, [5], 6, 7]], passThru, toString);
    const result2 = pipeline(Buffer.from('hello').values(), toString);
    const result3 = pipeline('hello', toString);
    const result4 = pipeline(Buffer.from('abc'), toString);
    // eslint-disable-next-line @checkdigit/no-promise-instance-method
    assert.ok(typeof result1.then === 'function');
    // eslint-disable-next-line @checkdigit/no-promise-instance-method
    assert.ok(typeof result2.then === 'function');
    // eslint-disable-next-line @checkdigit/no-promise-instance-method
    assert.ok(typeof result3.then === 'function');
    // eslint-disable-next-line @checkdigit/no-promise-instance-method
    assert.ok(typeof result4.then === 'function');
    assert.equal(await result1, 'undefined1null2true34,5,6,7');
    assert.equal(await result2, '104101108108111');
    assert.equal(await result3, 'hello');
    assert.equal(await result4, '979899');
  });

  it('works consistently with streams', async () => {
    assert.deepEqual(
      await pipeline([undefined, 1, 2, true, 3, [4, [5], 6, 7]], new PassThrough({ objectMode: true }), toString),
      '12true34,5,6,7',
    );
    await assert.rejects(async () => pipeline([null], new PassThrough({ objectMode: true }), toString), {
      name: 'TypeError',
      message: 'May not write null values to stream',
    });
    await assert.rejects(async () => pipeline([undefined], new PassThrough({ objectMode: false }), toString), {
      name: 'TypeError',
    });
    await assert.rejects(async () => pipeline([true], new PassThrough({ objectMode: false }), toString), {
      name: 'TypeError',
    });
    await assert.rejects(async () => pipeline([{}], new PassThrough({ objectMode: false }), toString), {
      name: 'TypeError',
    });
    await assert.rejects(
      async () => pipeline([Symbol.for('hello')], new PassThrough({ objectMode: false }), toString),
      {
        name: 'TypeError',
      },
    );
    await assert.rejects(async () => pipeline([1], new PassThrough({ objectMode: false }), toString), {
      name: 'TypeError',
    });
    await assert.rejects(async () => pipeline([1n], new PassThrough({ objectMode: false }), toString), {
      name: 'TypeError',
    });
    assert.deepEqual(
      await pipeline(
        ['hello', Uint8Array.from([32]), Buffer.from('world')],
        new PassThrough({ objectMode: true }),
        toString,
      ),
      'hello32world',
    );
    assert.deepEqual(
      await pipeline(
        ['hello', Uint8Array.from([32]), Buffer.from('world')],
        new PassThrough({ objectMode: false }),
        toString,
      ),
      'hello world',
    );
  });

  it('correctly emits error on returned stream', async () => {
    const readable = pipeline([null], new PassThrough({ objectMode: true }), passThru);
    await assert.rejects(
      new Promise((_, reject) => {
        readable.on('error', (error) => {
          reject(error);
        });
      }),
      {
        message: 'May not write null values to stream',
      },
    );
  });

  it('returns ReadWriteStream if last parameter is an async generator', async () => {
    await validateReadable(pipeline([undefined, 1, 2, true, 3], passThru), '12true3');
  });

  it('returns promise if last parameter is a WritableStream', async () => {
    let written = '';
    const result = await pipeline(
      ['a', 'b', 'c'],
      new Writable({
        write(chunk: Uint8Array, _encoding, callback) {
          written += chunk.toString();
          callback();
        },
      }),
    );

    assert.equal(result, undefined);
    assert.deepEqual(written, 'abc');

    let errorThrown;
    try {
      await pipeline(['a', 'b', 'c'], new Writable());
    } catch (error) {
      errorThrown = error as Error;
    }
    assert.deepEqual(errorThrown?.message, 'The _write() method is not implemented');
  });

  it('can support nested pipelines as sources', async () => {
    assert.equal(await pipeline(pipeline(pipeline('hello', passThru), passThru), toString), 'hello');
  });

  it('can support a pure Asyncerator as source', async () => {
    let count = 0;
    const asyncIterableIterator: AsyncIterableIterator<number> = {
      [Symbol.asyncIterator]: () => asyncIterableIterator,
      async next() {
        if (count === 4) {
          return { done: true, value: undefined };
        }
        return { done: false, value: count++ };
      },
    };
    assert.equal(
      await pipeline(
        {
          [Symbol.asyncIterator]: () => asyncIterableIterator,
        },
        toString,
      ),
      '0123',
    );
  });

  // AbortControllers are supported starting in Node 16+
  it('supports abort', async () => {
    const abortController = new AbortController();
    const options = {
      signal: abortController.signal,
    };
    setTimeout(() => {
      abortController.abort();
    }, 1);
    await assert.rejects(
      pipeline(
        all([
          new Promise((resolve) => {
            setTimeout(() => {
              resolve('never resolves');
            }, 10);
          }),
        ]),
        toString,
        options,
      ),
      {
        name: 'AbortError',
        message: 'The operation was aborted',
      },
    );
  });
});
