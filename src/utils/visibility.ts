declare global {
  interface Window {
    /** Injected only by the native saver, whose view exists while animation is active. */
    __literatureClockNativeHost?: boolean;
  }
}

/** A remote macOS saver surface can be displayed while WebKit reports it hidden. */
export function isClockVisible() {
  return window.__literatureClockNativeHost === true || !document.hidden;
}
