// sink/to-null.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import asyncerator, { Asyncable } from '../asyncerator';

/**
 * Drop the results of an asyncable into /dev/null.
 */
export default async function <T>(iterator: Asyncable<T>): Promise<void> {
  for await (const _ of asyncerator(iterator)) {
    // do nothing
  }
}
