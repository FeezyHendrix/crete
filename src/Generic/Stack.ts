export class Stack<Z> {
  private stack: Z[] = [];

  push(item: Z): void {
    this.stack.push(item);
  }

  pop(): Z | undefined {
    return this.stack.pop();
  }

  peek(): Z | undefined {
    if (this.isEmpty()) {
      return undefined;
    }

    return this.stack[this.stack.length - 1];
  }

  isEmpty(): boolean {
    return this.stack.length === 0;
  }

  size(): number {
    return this.stack.length;
  }
}