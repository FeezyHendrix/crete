export class Queue<Z> {
  private queues: Z[] = [];

  enqueue(item: Z): void {
    this.queues.push(item);
  }

  dequeue(): Z | undefined {
    if (this.isEmpty()) {
      return undefined;
    }

    return this.queues.shift();
  }

  peek(): Z | undefined {
    return this.queues[0];
  }

  isEmpty(): boolean {
    return this.queues.length === 0;
  }

  size(): number {
    return this.queues.length;
  }
}