import { EventEmitter } from 'node:events';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventHandlers = Record<string | symbol, (...args: any) => any>;

export class TypedEventEmitter<TEvents extends EventHandlers> extends EventEmitter {
  private untypedOn = this.on;
  private untypedOnce = this.once;
  private untypedEmit = this.emit;

  override on = <K extends keyof TEvents>(event: K, listener: TEvents[K]): this => this.untypedOn(event, listener);
  override once = <K extends keyof TEvents>(event: K, listener: TEvents[K]): this => this.untypedOnce(event, listener);
  override emit = <K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): boolean =>
    this.untypedEmit(event, ...args);

  constructor(options: { captureRejections?: boolean } = {}) {
    super(options);
  }
}
