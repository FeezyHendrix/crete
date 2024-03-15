class AsyncSemaphore {
  private available: number;
  private upcoming: Array<{ resolve: () => void; reject: (reason?: any) => void }> = [];
  private heads: Array<{ resolve: () => void; reject: (reason?: any) => void }> = [];

  private completeFn!: () => void;
  private completePr!: Promise<void>;

  constructor(public readonly workersCount: number) {
    if (workersCount <= 0) throw new Error("workersCount must be positive");
    this.available = workersCount;
    this.refreshComplete();
  }

  async withLock<A>(f: () => Promise<A>): Promise<A> {
    await this.acquire();
    return this.execWithRelease(f).catch((err) => {
      console.error('Error during withLock execution:', err);
      throw err;
    });
  }

  async withLockRunAndForget<A>(f: () => Promise<A>): Promise<void> {
    await this.acquire();
    this.execWithRelease(f).catch(err => console.error('Error during withLockRunAndForget execution:', err));
  }

  async awaitTerminate(timeoutMs?: number): Promise<void> {
    if (this.available < this.workersCount) {
      if (timeoutMs !== undefined) {
        return Promise.race([
          this.completePr,
          new Promise<void>((_, reject) => setTimeout(() => reject(new Error('awaitTerminate timed out')), timeoutMs))
        ]);
      }
      return this.completePr;
    }
  }

  drainQueue(): void {
    this.upcoming.forEach(({ reject }) => reject(new Error('Operation canceled due to drainQueue')));
    this.heads.forEach(({ reject }) => reject(new Error('Operation canceled due to drainQueue')));
    this.upcoming = [];
    this.heads = [];
  }

  private async execWithRelease<A>(f: () => Promise<A>): Promise<A> {
    try {
      return await f();
    } finally {
      this.release();
    }
  }

  private queue(): Array<{ resolve: () => void; reject: (reason?: any) => void }> {
    if (!this.heads.length) {
      this.heads = [...this.upcoming].reverse();
      this.upcoming = [];
    }
    return this.heads;
  }

  private acquire(): void | Promise<void> {
    if (this.available > 0) {
      this.available -= 1;
      return;
    } else {
      const p = new Promise<void>((resolve, reject) => {
        this.upcoming.push({ resolve, reject });
      });
      return p;
    }
  }

  private release(): void {
    const queue = this.queue();
    if (queue.length) {
      const { resolve } = queue.pop()!;
      resolve();
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
    this.completePr = new Promise<void>((resolve) => {
      this.completeFn = resolve;
    });
  }
}
