// operator/split.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

/**
 * Equivalent of the Javascript array split method.  Matches it's behavior/corner cases, which is why the
 * implementation is more funky than you may expect.
 *
 * @param separator
 * @param limit
 */

export default function <Input extends { toString: () => string }>(
  separator: string,
  limit = Infinity
): Operator<Input, string> {
  return async function* (iterator: Asyncerator<Input>) {
    if (limit === 0) {
      return;
    }

    let previous = '';
    let count = 0;
    let receivedChunks = false;

    for await (const chunk of iterator) {
      if (
        typeof chunk === 'undefined' ||
        chunk === null ||
        typeof (chunk as { toString: () => string }).toString !== 'function'
      ) {
        throw Error(`${JSON.stringify(chunk)} not convertible to a string`);
      }
      receivedChunks = true;
      previous += chunk.toString();
      let index;
      while (previous.length > 0 && (index = separator === '' ? 1 : previous.indexOf(separator)) >= 0) {
        const line = previous.slice(0, index);
        yield line;
        if (++count >= limit) {
          return;
        }
        previous = previous.slice(index + (separator === '' ? 0 : 1));
      }
    }

    if ((separator !== '' && receivedChunks) || (previous.length > 0 && count < limit)) {
      yield previous;
    }
  };
}
