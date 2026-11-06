/** "1 pin", "3 pins": a count with its noun. */
export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
