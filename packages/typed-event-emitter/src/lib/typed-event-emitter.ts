import { EventEmitter, on as originalOn, once as originalOnce } from 'node:events';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventHandlers = Record<string | symbol, (...args: any[]) => any>;

interface StaticEventEmitterOptions {
  signal?: AbortSignal;
}

export const once = <
  Emitter extends TypedEventEmitter<EventHandlers>,
  K extends Emitter extends TypedEventEmitter<infer X> ? keyof X : never,
>(
  emitter: Emitter,
  eventName: K,
  options?: StaticEventEmitterOptions,
): Promise<Parameters<Emitter extends TypedEventEmitter<infer X> ? X[K] : never>> =>
  originalOnce(emitter, eventName, options) as Promise<Parameters<EventHandlers[K]>>;

export const on = <
  Emitter extends TypedEventEmitter<EventHandlers>,
  K extends Emitter extends TypedEventEmitter<infer X> ? Extract<keyof X, string> : never,
>(
  emitter: Emitter,
  eventName: K,
  options?: StaticEventEmitterOptions,
): AsyncIterableIterator<Parameters<Emitter extends TypedEventEmitter<infer X> ? X[K] : never>> =>
  originalOn(emitter, eventName, options);

export class TypedEventEmitter<TEvents extends EventHandlers> extends EventEmitter {
  private untypedOn = this.on;
  private untypedOnce = this.once;
  private untypedEmit = this.emit;

  waitOnce<K extends Extract<keyof TEvents, string>>(
    event: K,
    options?: StaticEventEmitterOptions,
  ): Promise<Parameters<TEvents[K]>> {
    return originalOnce(this, event, options) as Promise<Parameters<TEvents[K]>>;
  }
  wait<K extends Extract<keyof TEvents, string>>(
    event: K,
    options?: StaticEventEmitterOptions,
  ): AsyncIterableIterator<Parameters<TEvents[K]>> {
    return originalOn(this, event, options);
  }
  override on = <K extends keyof TEvents>(event: K, listener: TEvents[K]): this => this.untypedOn(event, listener);

  override once = <K extends keyof TEvents>(event: K, listener: TEvents[K]): this => this.untypedOnce(event, listener);

  override emit = <K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): boolean =>
    this.untypedEmit(event, ...args);

  constructor(options: { captureRejections?: boolean } = {}) {
    super(options);
  }
}
