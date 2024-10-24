// operator/split.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

/**
 * Equivalent of the Javascript array split method.  Matches its behavior/corner cases, which is why the
 * implementation is more funky than you may expect.
 *
 * @param separator
 * @param limit
 */

export default function <Input extends { toString: () => string }>(
  separator: string,
  limit: number = Number.POSITIVE_INFINITY,
): Operator<Input, string> {
  return async function* (iterator: Asyncerator<Input>) {
    // this behavior dealing with fractional and negative limits is unique, but matches string.split

    const actualLimit = limit <= -1 ? Number.POSITIVE_INFINITY : limit <= 0 ? 0 : Math.floor(limit);
    if (actualLimit === 0) {
      return;
    }

    let previous = '';
    let count = 0;
    let receivedChunks = false;

    for await (const chunk of iterator) {
      if (
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        chunk === undefined ||
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        chunk === null ||
        typeof (chunk as { toString: () => string }).toString !== 'function'
      ) {
        throw new Error(`${JSON.stringify(chunk)} not convertible to a string`);
      }
      receivedChunks = true;
      previous += chunk.toString();
      let index;
      while (previous.length > 0 && (index = separator === '' ? 1 : previous.indexOf(separator)) >= 0) {
        const line = previous.slice(0, index);
        yield line;
        if (++count >= actualLimit) {
          return;
        }
        previous = previous.slice(index + (separator === '' ? 0 : 1));
      }
    }

    if ((separator !== '' && receivedChunks) || (previous.length > 0 && count < actualLimit)) {
      yield previous;
    }
  };
}
