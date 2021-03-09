// node/pipeline.spec.ts

/* eslint-disable deprecate/function */

import assert from 'assert';
import { Readable, Writable } from 'stream';

import { toString } from '../sink';

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

  assert.strictEqual(await toString(stream), expected);

  assert.ok(finished);
  assert.ok(ended);

  assert.strictEqual(await toString(stream), '');
}

describe('pipeline', () => {
  it('throws error if source is a Buffer object', async () => {
    // tracking this behavior.  I don't believe this should crash, possibly a bug in node stream.pipeline implementation.
    await assert.rejects(async () => pipeline(Buffer.from('crash'), passThru, toString));
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
});
