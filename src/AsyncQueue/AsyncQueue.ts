type Callback<Z> = (a: Z) => void;

export function yieldRunLoop(): Promise<void> {
  const fn: (cb: () => void) => void = typeof setImmediate !== "undefined" ? setImmediate : (cb) => setTimeout(cb, 0);
  return new Promise(fn);
}

export class AsyncQueue<Z> {
  private readonly elements: Z[] = [];
  private readonly callbacks: [Callback<Z>, Callback<Error>][] = [];

  public enqueue = async (a: Z) => {
    const callbacks = this.callbacks.shift();

    if (callbacks) {
      await yieldRunLoop();
      const [resolve, _] = callbacks;
      resolve(a);
    } else {
      this.elements.push(a);
    }
  };

  public dequeue = async () => {
    if (this.elements.length > 0) {
      return this.elements.shift() as Z;
    } else {
      let callback: [Callback<Z>, Callback<any>] | undefined;
      const p = new Promise<Z>((resolve, reject) => {
        callback = [resolve, reject];
      });
      if (!callback) throw new Error("Promise constructor");
      this.callbacks.push(callback);
      return await p;
    }
  };

  rejectAllActive = (e: Error) => {
    while (this.callbacks.length > 0) {
      const callbacks = this.callbacks.pop();
      if (!callbacks) continue;
      const [_, reject] = callbacks;
      reject(e);
    }
  };
}

export function consumeQueue<Z>(queue: AsyncQueue<Z>, workers: number, blockProcessFromExiting: boolean = false) {
  const Cancel = new Error("queue-cancel-all");

  const startWorker = async (isActive: boolean[], process: (a: Z) => Promise<void>) => {
    await yieldRunLoop();
    try {
      while (isActive.length > 0 && isActive[0]) {
        const a = await queue.dequeue();
        try {
          await process(a);
        } catch (e) {
          console.error("Error while processing queue message: ", a, e);
        }

        await yieldRunLoop();
      }
    } catch (e) {
      if (e !== Cancel) throw e;
    }
  };

  function startTick() {
    let tickID: Object;
    function tick() {
      tickID = setTimeout(tick, 100);
    }
    tick();
    return () => clearTimeout(tickID as any);
  }

  return (process: (a: Z) => Promise<void>) => {
    const isActive = [true];
    const cancelTick = blockProcessFromExiting ? startTick() : () => {};
    const cancel = () => {
      isActive[0] = false;
      queue.rejectAllActive(Cancel);
      cancelTick();
    }

    const tasks: Promise<void>[] = [];
    for (let i = 0; i < workers; i++) {
      tasks.push(startWorker(isActive, process))
    }

    const all = Promise.all(tasks).then(_ => undefined as void);
    return [all, cancel] as [Promise<void>, () => void];
  }
}
