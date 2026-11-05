export interface ConfirmRequest {
  title: string;
  description: string;
  confirmLabel: string;
}

/** Asks the user to confirm a destructive action; `ask()` resolves with their answer. */
export class ConfirmState {
  request = $state.raw<ConfirmRequest | undefined>();
  #resolve: ((confirmed: boolean) => void) | undefined;

  ask(request: ConfirmRequest): Promise<boolean> {
    this.#resolve?.(false); // a newer question replaces an unanswered one
    this.request = request;
    return new Promise((resolve) => (this.#resolve = resolve));
  }

  answer(confirmed: boolean): void {
    this.#resolve?.(confirmed);
    this.#resolve = undefined;
    this.request = undefined;
  }
}
