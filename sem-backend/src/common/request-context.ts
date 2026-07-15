import { AsyncLocalStorage } from 'async_hooks';

export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<{ userId: string | null }>();

  static run<T>(userId: string | null, callback: () => T): T {
    return this.storage.run({ userId }, callback);
  }

  static getUserId(): string | null {
    const store = this.storage.getStore();
    return store ? store.userId : null;
  }
}
