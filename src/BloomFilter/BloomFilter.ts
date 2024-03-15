export class BloomFilter {
  private size: number;
  private hashCount: number;
  private bitArray: Uint8Array;

  constructor(size: number, hashCount: number) {
    this.size = size;
    this.hashCount = hashCount;
    this.bitArray = new Uint8Array(size);
  }

  add(item: string): void {
    for (let i = 0; i < this.hashCount; i++) {
      const index = this.getHash(item, i);
      this.bitArray[index] = 1;
    }
  }

  contains(item: string): boolean {
    for (let i = 0; i < this.hashCount; i++) {
      const index = this.getHash(item, i);
      if (!this.bitArray[index]) {
        return false;
      }
    }
    return true; 
  }

  private getHash(item: string, seed: number): number {
    let hash = 0;
    for (let i = 0; i < item.length; i++) {
      hash = hash * seed + item.charCodeAt(i);
      hash = hash % this.size;
    }
    return hash;
  }
}
