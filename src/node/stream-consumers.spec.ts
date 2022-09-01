// node/stream-consumers.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import stream from 'node:stream';
import { arrayBuffer, buffer, text } from 'node:stream/consumers';

import { from } from '../index';
import { pipeline } from './index';

describe('stream/consumers', () => {
  it('works with arrayBuffer', async () => {
    assert.deepEqual(new TextDecoder().decode(await arrayBuffer(from([]) as unknown as AsyncIterator<string>)), '');
    assert.deepEqual(
      new TextDecoder().decode(await arrayBuffer(from(['he', 'llo', ' world']) as unknown as AsyncIterator<string>)),
      'hello world'
    );
    let first = true;
    assert.deepEqual(
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
    assert.deepEqual(new TextDecoder().decode(await arrayBuffer(pipeline(from([]), new stream.PassThrough()))), '');
    assert.deepEqual(
      new TextDecoder().decode(await arrayBuffer(pipeline(from(['he', 'llo', ' world']), new stream.PassThrough()))),
      'hello world'
    );
  });

  it('works with buffer', async () => {
    assert.deepEqual(new TextDecoder().decode(await buffer(from([]) as unknown as AsyncIterator<string>)), '');
    assert.deepEqual(
      new TextDecoder().decode(await buffer(from(['he', 'llo', ' world']) as unknown as AsyncIterator<string>)),
      'hello world'
    );
    let first = true;
    assert.deepEqual(
      new TextDecoder().decode(
        await buffer({
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
    assert.deepEqual(new TextDecoder().decode(await buffer(pipeline(from([]), new stream.PassThrough()))), '');
    assert.deepEqual(
      new TextDecoder().decode(await buffer(pipeline(from(['he', 'llo', ' world']), new stream.PassThrough()))),
      'hello world'
    );
  });

  it('works with text', async () => {
    assert.deepEqual(await text(from([]) as unknown as AsyncIterator<string>), '');
    assert.deepEqual(await text(from(['he', 'llo', ' world']) as unknown as AsyncIterator<string>), 'hello world');
    let first = true;
    assert.deepEqual(
      await text({
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
      } as unknown as AsyncIterator<string>),
      'abc'
    );
    assert.deepEqual(await text(pipeline(from([]), new stream.PassThrough())), '');
    assert.deepEqual(await text(pipeline(from(['he', 'llo', ' world']), new stream.PassThrough())), 'hello world');
  });
});
