// operator/split.spec.ts

import * as assert from 'assert';

import { from } from '../index';

describe('split', () => {
  it('works with simple string values', async () => {
    assert.deepStrictEqual(await from(['a\nb\nc', 'd', 'e']).split('\n').toArray(), ['a', 'b', 'cde']);

    assert.deepStrictEqual(await from(['a\nb', '\nc', '\nd']).split('\n').toArray(), ['a', 'b', 'c', 'd']);
  });

  it('compatible with native split implementation', async () => {
    async function check(value: string | string[], separator: string, limit?: number) {
      if (typeof value === 'string') {
        assert.deepStrictEqual(await from([value]).split(separator, limit).toArray(), value.split(separator, limit));
      } else {
        assert.deepStrictEqual(
          await from(value).split(separator, limit).toArray(),
          value.join('').split(separator, limit)
        );
      }
    }
    await check(['X', ''], '');
    await check('X', '');
    await check('X', 'X');
    await check(['', '', ''], '');
    await check('X', 'Y');
    await check(['This is\na buffer than', ' needs to be split\ninto multiple lines\n'], '', 30);
    await check('This is\na buffer than needs to be split\ninto multiple lines\n', '');
    await check('This is\na buffer than needs to be split\ninto multiple lines\n', '', 15);
    await check('This is\na buffer than needs to be split\ninto multiple lines\n', 'X');
    await check('This is\na buffer than needs to be split\ninto multiple lines\n', '\n', 25);
  });

  it('supports limit', async () => {
    assert.deepStrictEqual(await from(['a\nb\nc', 'd', 'e']).split('\n', 0).toArray(), []);
    assert.deepStrictEqual(await from([]).split('\n', 1).toArray(), []);
    assert.deepStrictEqual(await from(['a\nb\nc', 'd', 'e']).split('\n', 2).toArray(), ['a', 'b']);
    assert.deepStrictEqual(await from(['a\nb', '\nc', '\nd']).split('\n', 3).toArray(), ['a', 'b', 'c']);
    assert.deepStrictEqual(await from(['a\nb', '\nc', '\nd']).split('\n', 4).toArray(), ['a', 'b', 'c', 'd']);
    assert.deepStrictEqual(await from(['a\nb', '\nc', '\nd']).split('\n', 5).toArray(), ['a', 'b', 'c', 'd']);
  });

  it('works with a stream of buffers', async () => {
    const buffer1 = Buffer.from('This is\na ');
    const buffer2 = Buffer.from('buffer that ');
    const buffer3 = Buffer.from('needs to be');
    const buffer4 = Buffer.from(' split\ninto multiple lines\n');
    const iterable = from([buffer1, buffer2, buffer3, buffer4]);
    const results = await iterable.split('\n').toArray();
    assert.deepStrictEqual(results, ['This is', 'a buffer that needs to be split', 'into multiple lines', '']);
  });

  it('reject if item is not convertible to string', async () => {
    await assert.rejects(from([null]).split('\n').next(), /^Error: null not convertible to a string$/u);
    await assert.rejects(from([undefined]).split('\n').next(), /^Error: undefined not convertible to a string$/u);
    await assert.rejects(
      from([Object.create(null)])
        .split('\n')
        .next(),
      /^Error: \{\} not convertible to a string$/u
    );
  });
});
