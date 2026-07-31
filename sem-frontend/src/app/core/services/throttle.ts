/**
 * Trailing throttle — invokes `fn` at most once per `intervalMs`,
 * always with the most recent arguments. Perfect for wrapping WebSocket
 * subscription handlers that fire faster than the DOM can repaint.
 *
 *   const onScoreTick = throttle(300, (payload) => this.applyScore(payload));
 *   this.socket.on('scoreTick', onScoreTick);
 *
 * Leading-edge is deliberately off: the first tick still waits for the
 * window so bursts are smoothed rather than reacting instantly (which
 * would just re-render at burst frequency). If you need the leading edge
 * too, wrap this: `fn(...args); throttle(...)`.
 */
export function throttle<Args extends any[]>(
  intervalMs: number,
  fn: (...args: Args) => void,
): (...args: Args) => void {
  let timer: any = null;
  let latest: Args | null = null;
  return (...args: Args) => {
    latest = args;
    if (timer) return;
    timer = setTimeout(() => {
      const call = latest as Args;
      latest = null;
      timer = null;
      try {
        fn(...call);
      } catch {
        /* swallow — a subscriber's mistake shouldn't kill the timer */
      }
    }, intervalMs);
  };
}

/**
 * Standard debounce — invokes `fn` `delayMs` after the LAST call.
 * Useful for search inputs and window-resize handlers.
 */
export function debounce<Args extends any[]>(
  delayMs: number,
  fn: (...args: Args) => void,
): (...args: Args) => void {
  let timer: any = null;
  return (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      try {
        fn(...args);
      } catch {
        /* ignore */
      }
    }, delayMs);
  };
}
