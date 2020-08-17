// source/writable.ts

import type { Writable } from 'stream';

import create, { Asyncerator } from '../create';

export interface WritableAsyncerator {
  asyncerator: Asyncerator<Buffer>;
  writable: Writable;
}

/**
 * Return an Asyncerator with a Writable source.
 *
 * Note: this is a temporary convenience function, not needed in Node 14+
 */
export default function (): WritableAsyncerator {
  // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment
  const transform = new (require('stream').PassThrough)();
  const asyncerator = create<Buffer>(transform);
  return {
    asyncerator,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    writable: transform,
  };
}
