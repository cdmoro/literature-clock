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
  let marks: HTMLSpanElement[] = [];
  const clear = () => {
    for (const mark of marks) {
      const parent = mark.parentNode;
      mark.replaceWith(...mark.childNodes);
      parent?.normalize();
    }
    marks = [];
  };
  const highlight = (index: number, length: number) => {
    clear();
    const part = parts.find((part) => index >= part.start && index < part.start + part.text.length);
    if (!part || !part.element.isConnected) return;
    const offset = index - part.start;
    // Some voices report zero charLength; use the next whitespace boundary in that case.
    const size = length > 0 ? length : /^\S+/.exec(part.text.slice(offset))?.[0].length || 0;
    const { nodes, leading } = speechText(part.element);
    const start = offset + leading;
    const end = Math.min(offset + size, part.text.length) + leading;
    for (const entry of nodes) {
      const from = Math.max(start, entry.start) - entry.start;
      const to = Math.min(end, entry.end) - entry.start;
      if (to <= from) continue;
      const range = document.createRange();
      range.setStart(entry.node, from);
      range.setEnd(entry.node, to);
      const mark = document.createElement('span');
      mark.className = 'speech-word';
      range.surroundContents(mark);
      marks.push(mark);
    }
  };
  return { highlight, clear };
}
