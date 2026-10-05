import '../styles/speech-highlight.css';

// Match the speech text while preserving emphasis, line breaks and attribution markup.
export function speechText(element: Element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  const nodes: { node: Text; start: number; end: number }[] = [];
  let text = '';
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType === Node.TEXT_NODE) {
      nodes.push({ node: node as Text, start: text.length, end: text.length + (node.textContent?.length || 0) });
      text += node.textContent;
    } else if (node.nodeName === 'BR') text += ' ';
  }
  const leading = text.length - text.trimStart().length;
  return { text: text.trim(), nodes, leading };
}

export function createSpeechHighlight(parts: { element: Element; start: number; text: string }[]) {
  // Paint ranges without adding inline elements, which can change font shaping and wrapping.
  const api = globalThis as typeof globalThis & {
    Highlight?: new (...ranges: Range[]) => unknown;
    CSS?: { highlights?: { set(name: string, highlight: unknown): void; delete(name: string): void } };
  };
  const registry = api.CSS?.highlights;
  const clear = () => registry?.delete('speech-word');
  const highlight = (index: number, length: number) => {
    clear();
    if (!registry || !api.Highlight) return;
    const part = parts.find((part) => index >= part.start && index < part.start + part.text.length);
    if (!part || !part.element.isConnected) return;
    const offset = index - part.start;
    // Some voices report zero charLength; use the next whitespace boundary in that case.
    const size = length > 0 ? length : /^\S+/.exec(part.text.slice(offset))?.[0].length || 0;
    const { nodes, leading } = speechText(part.element);
    const start = offset + leading;
    const end = Math.min(offset + size, part.text.length) + leading;
    const ranges: Range[] = [];
    for (const entry of nodes) {
      const from = Math.max(start, entry.start) - entry.start;
      const to = Math.min(end, entry.end) - entry.start;
      if (to <= from) continue;
      const range = document.createRange();
      range.setStart(entry.node, from);
      range.setEnd(entry.node, to);
      ranges.push(range);
    }
    if (ranges.length) registry.set('speech-word', new api.Highlight(...ranges));
  };
  return { highlight, clear };
}
