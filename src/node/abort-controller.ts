// node/abort-controller.ts

/**
 * AbortController is not available in node version < 15, so we need a basic implementation.
 */

export interface AbortController {
  readonly signal: AbortSignal;
  abort(): void;
}

export class AbortController {
  readonly signal: AbortSignal = new AbortSignal();

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,class-methods-use-this
  abort() {
    // eslint-disable-next-line no-console
    console.log('abort');
  }
}
