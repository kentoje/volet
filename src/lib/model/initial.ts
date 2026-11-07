const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * The first character a person sees in a Space's name, uppercased (an emoji or an accented letter stays whole).
 * Empty when the name has nothing to show.
 */
export function spaceInitial(name: string): string {
  const first = graphemes.segment(name.trim())[Symbol.iterator]().next();
  return first.done ? '' : first.value.segment.toLocaleUpperCase();
}
