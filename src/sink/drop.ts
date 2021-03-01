// sink/drop.ts

import asyncerator, { Asyncable } from '../asyncerator';

/**
 * Drop the results of an asyncable into /dev/null.
 */
export default async function <T>(iterator: Asyncable<T>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _ of asyncerator(iterator)) {
    // do nothing
  }
}
