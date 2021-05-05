// node/abort-signal.ts

export interface AbortSignal {
  aborted: boolean;
}

export class AbortSignal {
  constructor(public aborted = false) {}
}
