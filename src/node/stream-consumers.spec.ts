// node/stream-consumers.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import stream from 'node:stream';

import { arrayBuffer, buffer, text } from 'node:stream/consumers';
import { describe, it } from '@jest/globals';

import { from } from '../index';
import { pipeline } from './index';

describe('stream/consumers', () => {
  it('works with arrayBuffer', async () => {
    assert.deepEqual(new TextDecoder().decode(await arrayBuffer(from([]))), '');
    assert.deepEqual(new TextDecoder().decode(await arrayBuffer(from(['he', 'llo', ' world']))), 'hello world');
    let first = true;
    assert.deepEqual(
      new TextDecoder().decode(
        await arrayBuffer({
          [Symbol.asyncIterator]() {
            return {
              async next() {
                if (first) {
                  first = false;
                  return { done: false, value: 'abc' };
                }
                return { done: true };
              },
            };
          },
        } as AsyncIterable<string>),
      ),
      'abc',
    );
    assert.deepEqual(new TextDecoder().decode(await arrayBuffer(pipeline(from([]), new stream.PassThrough()))), '');
    assert.deepEqual(
      new TextDecoder().decode(await arrayBuffer(pipeline(from(['he', 'llo', ' world']), new stream.PassThrough()))),
      'hello world',
    );
  });

  it('works with buffer', async () => {
    assert.deepEqual(new TextDecoder().decode(await buffer(from([]))), '');
    assert.deepEqual(new TextDecoder().decode(await buffer(from(['he', 'llo', ' world']))), 'hello world');
    let first = true;
    assert.deepEqual(
      new TextDecoder().decode(
        await buffer({
          [Symbol.asyncIterator]() {
            return {
              async next() {
                if (first) {
                  first = false;
                  return { done: false, value: 'abc' };
                }
                return { done: true };
              },
            };
          },
        } as AsyncIterable<string>),
      ),
      'abc',
    );
    assert.deepEqual(new TextDecoder().decode(await buffer(pipeline(from([]), new stream.PassThrough()))), '');
    assert.deepEqual(
      new TextDecoder().decode(await buffer(pipeline(from(['he', 'llo', ' world']), new stream.PassThrough()))),
      'hello world',
    );
  });

  it('works with text', async () => {
    assert.deepEqual(await text(from([])), '');
    assert.deepEqual(await text(from(['he', 'llo', ' world'])), 'hello world');
    let first = true;
    assert.deepEqual(
      await text({
        [Symbol.asyncIterator]() {
          return {
            async next() {
              if (first) {
                first = false;
                return { done: false, value: 'abc' };
              }
              return { done: true };
            },
          };
        },
      } as AsyncIterable<string>),
      'abc',
    );
    assert.deepEqual(await text(pipeline(from([]), new stream.PassThrough())), '');
    assert.deepEqual(await text(pipeline(from(['he', 'llo', ' world']), new stream.PassThrough())), 'hello world');
  });
});
