// sink/to-readable.ts

import type { Readable } from 'stream';

/**
 * Turn an async iterable iterator into a Readable.  This can be used with Nodejs streams.
 * We do the require inside the function, so we don't cause issues in a browser environment.
 */
export default function <T>(iterator: AsyncIterable<T>): Readable {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports,global-require
    return require('stream').Readable.from(iterator);
  } catch (error) {
    throw Error('Requires Node environment');
  }
}
