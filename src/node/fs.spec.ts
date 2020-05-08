// node/fs.spec.ts

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import stream from 'stream';
import util from 'util';
import zlib from 'zlib';
import { v4 as uuid } from 'uuid';

import { from, writable } from '../index';

const pipeline = util.promisify(stream.pipeline);

describe('fs', () => {
  it('read/write gzipped file', async () => {
    const temporaryFile = path.join(os.tmpdir(), uuid());
    const input = ['hello', 'world'];

    // write a Gzipped file
    await pipeline(
      from(input)
        .map((string) => `${string}\n`)
        .toReadable(),
      zlib.createGzip(),
      fs.createWriteStream(temporaryFile)
    );

    // read a Gzipped file
    const { asyncerator, writable: writableStream } = writable();
    await pipeline(fs.createReadStream(temporaryFile), zlib.createUnzip(), writableStream);
    const result = await asyncerator
      .map((buffer) => buffer.toString())
      .split('\n')
      .filter((string) => string !== '')
      .toArray();

    assert.deepStrictEqual(result, input);
  });
});
