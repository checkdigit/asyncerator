// operator/split.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'assert';

import { from, pipeline, split, toArray } from '../index';

describe('split', () => {
  it('works with simple string values', async () => {
    assert.deepStrictEqual(await pipeline(from(['a\nb\nc', 'd', 'e']), split('\n'), toArray), ['a', 'b', 'cde']);

    assert.deepStrictEqual(await pipeline(from(['a\nb', '\nc', '\nd']), split('\n'), toArray), ['a', 'b', 'c', 'd']);
  });

  it('compatible with native split implementation', async () => {
    async function check(value: string | string[], separator: string, limit?: number) {
      if (typeof value === 'string') {
        assert.deepStrictEqual(await toArray(split(separator, limit)(from([value]))), value.split(separator, limit));
      } else {
        assert.deepStrictEqual(
          await toArray(split(separator, limit)(from(value))),
          value.join('').split(separator, limit)
        );
      }
    }
    await check([], '');
    await check([''], '');
    await check([''], '\n');
    await check(['', ''], ' ');
    await check(['X', ''], '');
    await check('X', '');
    await check('X', 'X');
    await check(['', '', ''], '');
    await check('X', 'Y');
    await check(['a\nb\nc', 'd', 'e'], '\n', -100);
    await check(['a\nb\nc', 'd', 'e'], '\n', -1.1);
    await check(['a\nb\nc', 'd', 'e'], '\n', -1);
    await check(['a\nb\nc', 'd', 'e'], '\n', -0.9);
    await check(['a\nb\nc', 'd', 'e'], '\n', -0.5);
    await check(['a\nb\nc', 'd', 'e'], '\n', -0);
    await check(['a\nb\nc', 'd', 'e'], '\n', 0.1);
    await check(['a\nb\nc', 'd', 'e'], '\n', 0.5);
    await check(['a\nb\nc', 'd', 'e'], '\n', 1.1);
    await check(['a\nb\nc', 'd', 'e'], '\n', 2.9);
    await check(['This is\na buffer than', ' needs to be split\ninto multiple lines\n'], '', 30);
    await check('This is\na buffer than needs to be split\ninto multiple lines\n', '');
    await check('This is\na buffer than needs to be split\ninto multiple lines\n', '', 15);
    await check('This is\na buffer than needs to be split\ninto multiple lines\n', 'X');
    await check('This is\na buffer than needs to be split\ninto multiple lines\n', '\n', 25);
  });

  it('supports limit', async () => {
    assert.deepStrictEqual(await pipeline(from([]), split('\n', 1), toArray), []);
    assert.deepStrictEqual(await pipeline(from(['a\nb\nc', 'd', 'e']), split('\n', -1), toArray), ['a', 'b', 'cde']);
    assert.deepStrictEqual(await pipeline(from(['a\nb\nc', 'd', 'e']), split('\n', 0), toArray), []);
    assert.deepStrictEqual(await pipeline(from(['a\nb\nc', 'd', 'e']), split('\n', 2), toArray), ['a', 'b']);
    assert.deepStrictEqual(await pipeline(from(['a\nb', '\nc', '\nd']), split('\n', 3), toArray), ['a', 'b', 'c']);
    assert.deepStrictEqual(await pipeline(from(['a\nb', '\nc', '\nd']), split('\n', 4), toArray), ['a', 'b', 'c', 'd']);
    assert.deepStrictEqual(await pipeline(from(['a\nb', '\nc', '\nd']), split('\n', 5), toArray), ['a', 'b', 'c', 'd']);
  });

  it('works with a stream of buffers', async () => {
    const buffer1 = Buffer.from('This is\na ');
    const buffer2 = Buffer.from('buffer that ');
    const buffer3 = Buffer.from('needs to be');
    const buffer4 = Buffer.from(' split\ninto multiple lines\n');
    const results = await toArray(split('\n')(from([buffer1, buffer2, buffer3, buffer4])));
    assert.deepStrictEqual(results, ['This is', 'a buffer that needs to be split', 'into multiple lines', '']);
  });

  it('reject if item is not convertible to string', async () => {
    await assert.rejects(
      pipeline(from(([null] as unknown) as string[]), split('\n'), toArray),
      /^Error: null not convertible to a string$/u
    );
    await assert.rejects(
      pipeline(from(([undefined] as unknown) as string[]), split('\n'), toArray),
      /^Error: undefined not convertible to a string$/u
    );
    await assert.rejects(
      pipeline(from([Object.create(null)]), split('\n'), toArray),
      /^Error: \{\} not convertible to a string$/u
    );
  });
});
