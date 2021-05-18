// node/pipeline.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import assert from 'assert';
import { PassThrough, Readable, Writable } from 'stream';

import { all, toString } from '../index';

import pipeline from './pipeline';

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

  // eslint-disable-next-line deprecate/function
  assert.strictEqual(await toString(stream), expected);

  assert.ok(finished);
  assert.ok(ended);

  // eslint-disable-next-line deprecate/function
  assert.strictEqual(await toString(stream), '');
}

describe('pipeline', () => {
  // bug fixed in Node 16+, so disable test in that case
  (process.version < 'v16' ? it : xit)('throws error if source is a Buffer object in Node < v16', async () => {
    // tracking this behavior in Node 14.  This is a bug in node stream.pipeline implementation:
    // https://github.com/nodejs/node/issues/37731
    await assert.rejects(async () => pipeline(Buffer.from('crash'), passThru, toString));
  });

  it('throws error if source is an empty string', async () => {
    // tracking this behavior in Node.  This is a bug in node stream.pipeline implementation:
    // https://github.com/nodejs/node/issues/38721
    await assert.rejects(async () => pipeline('', passThru, toString));
  });

  it('returns promise if last parameter is an async function', async () => {
    const result1 = pipeline([undefined, 1, null, 2, true, 3, [4, [5], 6, 7]], passThru, toString);
    const result2 = pipeline(Buffer.from('hello').values(), toString);
    const result3 = pipeline('hello', toString);
    assert.ok(typeof result1.then === 'function');
    assert.ok(typeof result2.then === 'function');
    assert.ok(typeof result3.then === 'function');
    assert.strictEqual(await result1, 'undefined1null2true34,5,6,7');
    assert.strictEqual(await result2, '104101108108111');
    assert.strictEqual(await result3, 'hello');
  });

  it('works consistently with streams', async () => {
    assert.deepStrictEqual(
      await pipeline([undefined, 1, 2, true, 3, [4, [5], 6, 7]], new PassThrough({ objectMode: true }), toString),
      '12true34,5,6,7'
    );
    await assert.rejects(async () => pipeline([null], new PassThrough({ objectMode: true }), toString), {
      name: 'TypeError',
      message: 'May not write null values to stream',
    });
    await assert.rejects(async () => pipeline([undefined], new PassThrough({ objectMode: false }), toString), {
      name: 'TypeError',
      message: 'The "chunk" argument must be of type string or an instance of Buffer or Uint8Array. Received undefined',
    });
    await assert.rejects(async () => pipeline([true], new PassThrough({ objectMode: false }), toString), {
      name: 'TypeError',
      message:
        'The "chunk" argument must be of type string or an instance of Buffer or Uint8Array. Received type boolean (true)',
    });
    await assert.rejects(async () => pipeline([{}], new PassThrough({ objectMode: false }), toString), {
      name: 'TypeError',
      message:
        'The "chunk" argument must be of type string or an instance of Buffer or Uint8Array. Received an instance of Object',
    });
    await assert.rejects(
      async () => pipeline([Symbol.for('hello')], new PassThrough({ objectMode: false }), toString),
      {
        name: 'TypeError',
        message:
          'The "chunk" argument must be of type string or an instance of Buffer or Uint8Array. Received type symbol (Symbol(hello))',
      }
    );
    await assert.rejects(async () => pipeline([1], new PassThrough({ objectMode: false }), toString), {
      name: 'TypeError',
      message:
        'The "chunk" argument must be of type string or an instance of Buffer or Uint8Array. Received type number (1)',
    });
    await assert.rejects(async () => pipeline([1n], new PassThrough({ objectMode: false }), toString), {
      name: 'TypeError',
      message:
        'The "chunk" argument must be of type string or an instance of Buffer or Uint8Array. Received type bigint (1n)',
    });
    assert.deepStrictEqual(
      await pipeline(
        ['hello', Uint8Array.from([32]), Buffer.from('world')],
        new PassThrough({ objectMode: true }),
        toString
      ),
      'hello32world'
    );
    assert.deepStrictEqual(
      await pipeline(
        ['hello', Uint8Array.from([32]), Buffer.from('world')],
        new PassThrough({ objectMode: false }),
        toString
      ),
      'hello world'
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
        write(chunk, _encoding, callback) {
          written += chunk.toString();
          callback();
        },
      })
    );

    assert.ok(result === undefined);
    assert.deepStrictEqual(written, 'abc');

    let errorThrown;
    try {
      await pipeline(['a', 'b', 'c'], new Writable());
    } catch (error) {
      errorThrown = error;
    }
    assert.deepStrictEqual(errorThrown.message, 'The _write() method is not implemented');
  });

  it('can support nested pipelines as sources', async () => {
    assert.strictEqual(await pipeline(pipeline(pipeline('hello', passThru), passThru), toString), 'hello');
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
    assert.strictEqual(
      await pipeline(
        {
          [Symbol.asyncIterator]: () => asyncIterableIterator,
        },
        toString
      ),
      '0123'
    );
  });

  // AbortControllers are supported starting in Node 16+
  (process.version < 'v16' ? xit : it)('supports abort', async () => {
    const abortController = new AbortController();
    const options = {
      signal: abortController.signal,
    };
    setTimeout(() => abortController.abort(), 1);
    await assert.rejects(
      pipeline(
        all([
          new Promise((resolve) => {
            setTimeout(() => resolve('never resolves'), 10);
          }),
        ]),
        toString,
        options
      ),
      {
        name: 'AbortError',
        message: 'The operation was aborted',
      }
    );
  });
});
