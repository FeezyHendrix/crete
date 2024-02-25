export class AsyncSemaphore {
  private available: number;
  private upcoming: Function[];
  private heads: Function[];

  private completeFn!: () => void;
  private completePr!: Promise<void>;

  constructor(public readonly workersCount: number) {
    if (workersCount <= 0) throw new Error("workersCount must be positive");
    this.available = workersCount;
    this.upcoming = [];
    this.heads = [];
    this.refreshComplete();
  }

  async withLock<A>(f: () => Promise<A>): Promise<A> {
    await this.acquire();
    return this.execWithRelease(f);
  }

  async withLockRunAndForget<A>(f: () => Promise<A>): Promise<void> {
    await this.acquire();
    // Ignoring returned promise on purpose!
    this.execWithRelease(f);
  }

  async awaitTerminate(): Promise<void> {
    if (this.available < this.workersCount) {
      return this.completePr;
    }
  }

  private async execWithRelease<A>(f: () => Promise<A>): Promise<A> {
    try {
      return await f();
    } finally {
      this.release();
    }
  }

  private queue(): Function[] {
    if (!this.heads.length) {
      this.heads = this.upcoming.reverse();
      this.upcoming = [];
    }
    return this.heads;
  }

  private acquire(): void | Promise<void> {
    if (this.available > 0) {
      this.available -= 1;
      return undefined;
    } else {
      let fn: Function = () => {
        /***/
      };
      const p = new Promise<void>((ref) => {
        fn = ref;
      });
      this.upcoming.push(fn);
      return p;
    }
  }

  private release(): void {
    const queue = this.queue();
    if (queue.length) {
      const fn = queue.pop();
      if (fn) fn();
    } else {
      this.available += 1;

      if (this.available >= this.workersCount) {
        const fn = this.completeFn;
        this.refreshComplete();
        fn();
      }
    }
  }

  private refreshComplete(): void {
    let fn: () => void = () => {
      /***/
    };
    this.completePr = new Promise<void>((r) => {
      fn = r;
    });
    this.completeFn = fn;
  }
}
