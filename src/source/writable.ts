// source/writable.ts

import type { Writable } from 'stream';

import create, { Asyncerator } from '../create';

export interface WritableAsyncerator {
  asyncerator: Asyncerator<Buffer>;
  writable: Writable;
}

/**
 * Return an Asyncerator with a Writable source.
 */
export default function (): WritableAsyncerator {
  // eslint-disable-next-line @typescript-eslint/no-require-imports,global-require
  const transform = new (require('stream').PassThrough)();
  const asyncerator = create<Buffer>(transform);
  return {
    asyncerator,
    writable: transform,
  };
}
