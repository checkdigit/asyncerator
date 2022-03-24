// node/stream-consumers.spec.ts

import assert from 'assert';
import * as stream from 'stream';
import { arrayBuffer } from 'stream/consumers';

import { from } from '../index';
import { pipeline } from './index';

describe('stream/consumers', () => {
  it('works with arrayBuffer', async () => {
    assert.deepStrictEqual(
      new TextDecoder().decode(await arrayBuffer(from([]) as unknown as AsyncIterator<string>)),
      ''
    );
    assert.deepStrictEqual(
      new TextDecoder().decode(await arrayBuffer(from(['he', 'llo', ' world']) as unknown as AsyncIterator<string>)),
      'hello world'
    );
    let first = true;
    assert.deepStrictEqual(
      new TextDecoder().decode(
        await arrayBuffer({
          [Symbol.iterator]() {
            return {
              next() {
                if (first) {
                  first = false;
                  return { done: false, value: 'abc' };
                }
                return { done: true };
              },
            };
          },
        } as unknown as AsyncIterator<string>)
      ),
      'abc'
    );
    assert.deepStrictEqual(
      new TextDecoder().decode(await arrayBuffer(pipeline(from([]), new stream.PassThrough()))),
      ''
    );
    assert.deepStrictEqual(
      new TextDecoder().decode(await arrayBuffer(pipeline(from(['he', 'llo', ' world']), new stream.PassThrough()))),
      'hello world'
    );
  });
});
