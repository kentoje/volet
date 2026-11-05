/** Which item is being renamed inline (at most one at a time). Keys: a node id, or `space:<id>`. */
export class RenameState {
  target = $state<string | undefined>();

  start(key: string): void {
    this.target = key;
  }

  stop(): void {
    this.target = undefined;
  }

  is(key: string): boolean {
    return this.target === key;
  }
}

export const spaceKey = (spaceId: string) => `space:${spaceId}`;
