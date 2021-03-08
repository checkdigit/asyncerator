// node/pipeline.spec.ts

/* eslint-disable deprecate/function */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable, Writable } from 'stream';
import zlib from 'zlib';
import { v4 as uuid } from 'uuid';

import { filter, map, split } from '../operator';
import { toArray, toString } from '../sink';

import pipeline from './pipeline';

async function* passThru<T>(iterable: AsyncIterable<T>): AsyncGenerator<T> {
  for await (const thing of iterable) {
    yield thing;
  }
}

async function* base64Encode(iterable: AsyncIterable<Buffer>): AsyncGenerator<string> {
  let payload = Buffer.from('');
  for await (const thing of iterable) {
    payload = Buffer.concat([payload, thing]);
  }
  yield payload.toString('base64');
}

async function* base64Decode(iterable: AsyncIterable<string>): AsyncGenerator<Buffer> {
  let payload = '';
  for await (const thing of iterable) {
    payload += thing;
  }
  yield Buffer.from(payload, 'base64');
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

  it('returns a stream if last parameter is a transform', async () => {
    const result = pipeline('hello', zlib.createGzip());
    assert.ok(result.readable === true);
    assert.strictEqual(await pipeline(result, base64Encode, toString), 'H4sIAAAAAAAAE8tIzcnJBwCGphA2BQAAAA==');
  });

  it('returns a stream if last parameter is an async generator function', async () => {
    const result = pipeline('hello', zlib.createGzip(), base64Encode);
    assert.ok(result.readable === true);
    assert.strictEqual(await pipeline(result, toString), 'H4sIAAAAAAAAE8tIzcnJBwCGphA2BQAAAA==');
  });

  it('can pipe through gzip', async () => {
    assert.strictEqual(
      await pipeline('hello', zlib.createGzip(), base64Encode, toString),
      'H4sIAAAAAAAAE8tIzcnJBwCGphA2BQAAAA=='
    );
  });

  it('can pipe through unzip', async () => {
    assert.strictEqual(
      await pipeline('H4sIAAAAAAAAE8tIzcnJBwCGphA2BQAAAA==', base64Decode, zlib.createUnzip(), toString),
      'hello'
    );
  });

  it('to gzip and back again', async () => {
    const input = ['hello', 'world'];

    // pipe the input through a series of steps, including gzipping and gunzipping to get back what we started with
    const result = await pipeline(
      input,
      map((string) => `${string}\n`),
      zlib.createGzip(),
      zlib.createUnzip(),
      map((buffer: Buffer) => buffer.toString()),
      split('\n'),
      filter((string) => string !== ''),
      toArray
    );
    assert.deepStrictEqual(result, input);
  });

  it('read/write gzipped file', async () => {
    const temporaryFile = path.join(os.tmpdir(), uuid());
    const input = ['hello', 'world'];

    // write a Gzipped file
    const writeResult = await pipeline(
      input,
      map((string) => `${string}\n`),
      zlib.createGzip(),
      fs.createWriteStream(temporaryFile)
    );
    assert.ok(writeResult === undefined);

    // read a Gzipped file
    const result = await pipeline(
      fs.createReadStream(temporaryFile),
      zlib.createUnzip(),
      split('\n'),
      filter((string) => string !== ''),
      toArray
    );

    assert.deepStrictEqual(result, input);
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
