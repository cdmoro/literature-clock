/** Accept family names, never CSS declarations or URLs. */
export function normalizeFontName(value: string): string | undefined {
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length > 0 && name.length <= 100 && /^[\p{L}\p{N}][\p{L}\p{M}\p{N} -]*$/u.test(name) ? name : undefined;
}

export function loadGoogleFont(name: string): Promise<void> {
  if (normalizeFontName(name) !== name) return Promise.reject(new Error('Invalid font name'));
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}&display=swap`;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      link.onload = null;
      link.onerror = null;
      if (error) {
        link.remove();
        reject(error);
      } else resolve();
    };
    const timeout = setTimeout(() => finish(new Error('Font load timed out')), 8000);
    link.onerror = () => finish(new Error('Font stylesheet unavailable'));
    link.onload = async () => {
      try {
        const faces = await document.fonts.load(`16px "${name}"`);
        if (!faces.length) throw new Error('Font unavailable');
        finish();
      } catch {
        finish(new Error('Font unavailable'));
      }
    };
    document.head.append(link);
  });
}
