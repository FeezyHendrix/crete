const taskSymbol = Symbol("task");

export class WorkerPool {
  private threadNum: number = 0;
  private workers: Worker[] = [];
  private busyWorkers: Worker[] = [];
  private idleWorkers: Worker[] = [];
  private queue: { task: any; cb: Function }[] = [];
  private workerPath: string = "";

  /**
   * @param {number} threadNum
   * @param {string} workerPath
   * @description Creates a new worker pool
   */
  constructor(threadNum: number, workerPath: string = "worker.js") {
    this.threadNum = threadNum;
    this.workerPath = workerPath;
    this.init();
  }

  /**
   * @description Initializes the worker pool
   * @returns {void}
   */
  private init(): void {
    let threads = this.threadNum;
    while (--threads >= 0) this.createWorker();
  }

  /**
   * @description Attempts to remove and run a task from the queue
   * @returns {void}
   */
  private dequeue(): void {
    if (!this.queue.length || !this.idleWorkers.length) return;
    const { task, cb } = this.queue.shift()!;
    this.run(task, cb);
  }

  /**
   * @description Creates a new worker and adds it to the pool
   * @returns {void}
   */
  private createWorker(): void {
    const worker: any = new Worker(this.workerPath);
    worker.onmessage = (event: MessageEvent) => {
      worker[taskSymbol](null, event);
      worker[taskSymbol] = null;
      this.busyWorkers.splice(this.busyWorkers.indexOf(worker), 1);
      this.idleWorkers.push(worker);
      this.clear();
      this.dequeue();
    };
    worker.onerror = (error: ErrorEvent) => {
      worker[taskSymbol](error, null);
      this.workers.splice(this.workers.indexOf(worker), 1);
      this.busyWorkers.splice(this.busyWorkers.indexOf(worker), 1);
      this.createWorker();
      this.clear();
      this.dequeue();
    };
    this.workers.push(worker);
    this.idleWorkers.push(worker);
    this.dequeue();
  }

  /**
   * @description Adds a task to the queue
   * @param {any} task
   * @param {function} cb
   * @returns {void}
   */
  public run(task: any, cb: Function): void {
    if (!this.workers.length) this.init();
    if (!this.idleWorkers.length) {
      this.queue.push({ task, cb });
      return;
    }
    const worker: any = this.idleWorkers.shift()!;
    worker[taskSymbol] = cb;
    this.busyWorkers.push(worker);
    worker.postMessage(task);
  }

  /**
   * @description Attempts to restore the worker pool to its initial state
   * @returns {void}
   */
  private clear(): void {
    if (this.idleWorkers.length !== this.threadNum) return;
    while (this.workers.length) {
      const worker = this.workers.shift();
      worker!.terminate();
    }
    this.busyWorkers = [];
    this.idleWorkers = [];
  }
}
