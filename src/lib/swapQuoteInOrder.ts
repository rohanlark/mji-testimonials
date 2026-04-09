/**
 * Swap `id` with its neighbor `delta` steps away in list order (wraps at ends).
 * Used for on-card “order” controls; packing order follows `testimonials` array order.
 */
export function swapQuoteWithNeighborWrapped<T extends { id: string }>(
  list: T[],
  id: string,
  delta: -1 | 1
): T[] {
  const i = list.findIndex((item) => item.id === id);
  if (i === -1 || list.length < 2) return list;
  const len = list.length;
  const j = (i + delta + len) % len;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
