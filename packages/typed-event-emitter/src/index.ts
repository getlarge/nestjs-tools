import { EventEmitter } from 'events';

export type EventHandlers = Record<string | symbol, (...args: any) => any>;

export class TypedEventEmitter<TEvents extends EventHandlers> extends EventEmitter {
  private untypedOn = this.on;
  private untypedOnce = this.once;
  private untypedEmit = this.emit;

  on = <K extends keyof TEvents>(event: K, listener: TEvents[K]): this => this.untypedOn(event, listener);
  once = <K extends keyof TEvents>(event: K, listener: TEvents[K]): this => this.untypedOnce(event, listener);
  emit = <K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): boolean =>
    this.untypedEmit(event, ...args);

  constructor(options: { captureRejections?: boolean } = {}) {
    super(options);
  }
}
