import { Message, Interaction } from 'discord.js';

export interface IBotStrategy<TContext = Message | Interaction, TResult = boolean> {
  /** Stable id for central disable registry; use with getStrategyDisableRegistry().disable(name). */
  readonly name: string;
  readonly priority: number;
  /** When true, the strategy is skipped: no evaluation and no posting. Can be toggled at runtime. */
  isDisabled(): boolean;
  // Type Guard: This method determines if the strategy matches the event type AND the logic
  shouldTrigger(context: TContext): Promise<boolean>;
  execute(context: TContext): Promise<TResult>;
}

export abstract class BotStrategy<
  TContext = Message | Interaction,
  TResult = boolean,
> implements IBotStrategy<TContext, TResult> {
  abstract readonly name: string;
  abstract readonly priority: number;
  private _disabled = false;
  private _percentChance = 100;

  get disabled(): boolean {
    return this._disabled;
  }

  set disabled(value: boolean) {
    this._disabled = value;
  }

  isDisabled(): boolean {
    return this._disabled;
  }

  get percentChance(): number {
    return this._percentChance;
  }

  set percentChance(value: number) {
    this._percentChance = value;
  }

  constructor(protected readonly triggeringEvent?: TContext) {}

  abstract shouldTrigger(context: TContext): Promise<boolean>;
  abstract execute(context: TContext): Promise<TResult>;
}
