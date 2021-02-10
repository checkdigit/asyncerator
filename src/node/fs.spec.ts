// node/fs.spec.ts

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import zlib from 'zlib';
import { v4 as uuid } from 'uuid';

import { from, pipeline } from '../index';

describe('fs', () => {
  it('to gzip and back again', async () => {
    const input = ['hello', 'world'];

    // pipe the input through a series of steps, including gzipping and gunzipping to get back what we started with
    const result = await pipeline(
      from(input).map((string) => `${string}\n`),
      zlib.createGzip(),
      zlib.createUnzip(),
      (source) =>
        from(source)
          .map((buffer) => buffer.toString())
          .split('\n')
          .filter((string) => string !== '')
          .toArray()
    );
    assert.deepStrictEqual(result, input);
  });

  it('read/write gzipped file', async () => {
    const temporaryFile = path.join(os.tmpdir(), uuid());
    const input = ['hello', 'world'];

    // write a Gzipped file
    await pipeline(
      from(input).map((string) => `${string}\n`),
      zlib.createGzip(),
      fs.createWriteStream(temporaryFile)
    );

    // read a Gzipped file
    const result = await pipeline(fs.createReadStream(temporaryFile), zlib.createUnzip(), (source) =>
      from(source)
        .split('\n')
        .filter((string) => string !== '')
        .toArray()
    );

    assert.deepStrictEqual(result, input);
  });
});
