// node/stream-consumers.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import assert from 'assert';
import * as stream from 'stream';
import { arrayBuffer, buffer, text } from 'stream/consumers';

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

  it('works with buffer', async () => {
    assert.deepStrictEqual(new TextDecoder().decode(await buffer(from([]) as unknown as AsyncIterator<string>)), '');
    assert.deepStrictEqual(
      new TextDecoder().decode(await buffer(from(['he', 'llo', ' world']) as unknown as AsyncIterator<string>)),
      'hello world'
    );
    let first = true;
    assert.deepStrictEqual(
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
    assert.deepStrictEqual(new TextDecoder().decode(await buffer(pipeline(from([]), new stream.PassThrough()))), '');
    assert.deepStrictEqual(
      new TextDecoder().decode(await buffer(pipeline(from(['he', 'llo', ' world']), new stream.PassThrough()))),
      'hello world'
    );
  });

  it('works with text', async () => {
    assert.deepStrictEqual(await text(from([]) as unknown as AsyncIterator<string>), '');
    assert.deepStrictEqual(
      await text(from(['he', 'llo', ' world']) as unknown as AsyncIterator<string>),
      'hello world'
    );
    let first = true;
    assert.deepStrictEqual(
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
    assert.deepStrictEqual(await text(pipeline(from([]), new stream.PassThrough())), '');
    assert.deepStrictEqual(
      await text(pipeline(from(['he', 'llo', ' world']), new stream.PassThrough())),
      'hello world'
    );
  });
});
