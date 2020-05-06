// operator.spec.ts

import * as assert from 'assert';

import { all, from } from './index';

describe('operator', () => {
  describe('map', () => {
    it('works for an empty array', async () => {
      assert.deepStrictEqual(
        await all([])
          .map(() => {
            throw new Error('This should not happen');
          })
          .toArray(),
        []
      );
    });

    it('operates on sequence of promises', async () => {
      const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
      assert.deepStrictEqual(await iterable.map((value) => value * 2).toArray(), [2, 4, 6]);
    });

    it('operates on sequence of non-promises', async () => {
      const iterable = from(['a', 'bb', 'ccc']);
      assert.deepStrictEqual(await iterable.map((value) => value.length).toArray(), [1, 2, 3]);
    });

    it('is chain-able', async () => {
      const iterable = from(['a', 'bb', 'ccc']);
      assert.deepStrictEqual(
        await iterable
          .map((value) => value.length)
          .map((value) => value * 2)
          .map((value) => ''.padStart(value, ' '))
          .toArray(),
        ['  ', '    ', '      ']
      );
    });

    it('reject if map function throws an exception', async () => {
      await assert.rejects(
        from([1])
          .map(() => {
            throw Error('Reject');
          })
          .toArray(),
        /^Error: Reject$/u
      );
      await assert.rejects(
        all([Promise.resolve(1)])
          .map(() => {
            throw Error('Reject');
          })
          .toArray(),
        /^Error: Reject$/u
      );
    });
  });

  describe('forEach', () => {
    it('works for an empty array', async () => {
      const results: unknown[] = [];
      await all([])
        .forEach((item) => results.push(item))
        .toArray();
      assert.deepStrictEqual(results, []);
    });

    it('operates on sequence of promises', async () => {
      const results: number[] = [];
      const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
      await iterable.forEach((value) => results.push(value)).toArray();
      assert.deepStrictEqual(results, [1, 2, 3]);
    });

    it('operates on sequence of non-promises', async () => {
      const results: string[] = [];
      const iterable = from(['a', 'bb', 'ccc']);
      await iterable.forEach((value) => results.push(value)).toArray();
      assert.deepStrictEqual(results, ['a', 'bb', 'ccc']);
    });

    it('is chain-able', async () => {
      const results: string[] = [];
      const iterable = from(['a', 'bb', 'ccc']);
      await iterable
        .map((value) => value.length)
        .map((value) => value * 2)
        .map((value) => ''.padStart(value, ' '))
        .forEach((value) => results.push(value))
        .toArray();
      assert.deepStrictEqual(results, ['  ', '    ', '      ']);
    });

    it('reject if forEach function throws an exception', async () => {
      await assert.rejects(
        from([1])
          .forEach(() => {
            throw Error('Reject');
          })
          .toArray(),
        /^Error: Reject$/u
      );
      await assert.rejects(
        all([Promise.resolve(1)])
          .forEach(() => {
            throw Error('Reject');
          })
          .toArray(),
        /^Error: Reject$/u
      );
    });
  });

  describe('complete', () => {
    it('works for an empty array', async () => {
      let completed = false;
      await all([])
        .complete(() => {
          completed = true;
        })
        .toArray();
      assert.strictEqual(completed, true);
    });

    it('operates on sequence', async () => {
      let completed = false;
      const results = await all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)])
        .complete(() => {
          completed = true;
        })
        .toArray();
      assert.deepStrictEqual(results, [1, 2, 3]);
      assert.strictEqual(completed, true);
    });

    it('do not reject if complete function throws an exception', async () => {
      await from([1])
        .complete(() => {
          throw Error('Reject');
        })
        .toArray();
    });
  });

  describe('error', () => {
    it('works for an empty array', async () => {
      let errored = false;
      await all([])
        .error(() => {
          errored = true;
        })
        .toArray();
      assert.strictEqual(errored, false);
    });

    it('operates on sequence', async () => {
      let errored = false;
      const results = await all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)])
        .error(() => {
          errored = true;
        })
        .toArray();
      assert.deepStrictEqual(results, [1, 2, 3]);
      assert.strictEqual(errored, false);
    });

    it('do not reject if error function throws an exception', async () => {
      let completed = false;
      let errored = false;
      await from([Promise.reject(new Error('Reject'))])
        .complete(() => {
          completed = true;
        })
        .error(() => {
          errored = true;
          throw Error('Reject');
        })
        .toArray();
      assert.strictEqual(completed, false);
      assert.strictEqual(errored, true);
    });

    it('called if array item is a promise that rejects', async () => {
      let completed = false;
      let errorObject: Error = new Error();
      await from([Promise.reject(new Error('Reject'))])
        .complete(() => {
          completed = true;
        })
        .error((error) => {
          errorObject = error;
        })
        .toArray();
      assert.strictEqual(completed, false);
      assert.strictEqual(errorObject.message, 'Reject');
    });
  });

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

  describe('filter', () => {
    it('works for an empty array', async () => {
      assert.deepStrictEqual(
        await all([])
          .filter(() => {
            throw new Error('This should not happen');
          })
          .toArray(),
        []
      );
    });

    it('operates on sequence of promises', async () => {
      const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
      assert.deepStrictEqual(await iterable.filter((value) => value !== 2).toArray(), [1, 3]);
    });

    it('operates on sequence of non-promises', async () => {
      const iterable = from(['a', 'bb', 'ccc']);
      assert.deepStrictEqual(await iterable.filter(() => true).toArray(), ['a', 'bb', 'ccc']);
    });

    it('is chain-able', async () => {
      const iterable = from(['a', 'bb', 'ccc']);
      assert.deepStrictEqual(
        await iterable
          .filter((value) => value !== 'a')
          .filter((value) => value !== 'ccc')
          .toArray(),
        ['bb']
      );
    });

    it('reject if filter function throws an exception', async () => {
      await assert.rejects(
        from([1])
          .filter(() => {
            throw Error('Reject');
          })
          .toArray(),
        /^Error: Reject$/u
      );
      await assert.rejects(
        all([Promise.resolve(1)])
          .filter(() => {
            throw Error('Reject');
          })
          .toArray(),
        /^Error: Reject$/u
      );
    });
  });
});
