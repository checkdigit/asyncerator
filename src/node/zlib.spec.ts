// node/zlib.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { v4 as uuid } from 'uuid';

import { filter, map, split } from '../operator';
import { toArray, toString } from '../sink';

import pipeline from './pipeline';

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

describe('zlib', () => {
  it('returns a stream if last parameter is a Gzip transform', async () => {
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
});
