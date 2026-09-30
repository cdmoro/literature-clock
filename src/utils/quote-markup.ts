// Rebuild permitted formatting in a fresh fragment, never copying attributes.
export function quoteMarkup(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html;
  const allowed = new Set(['BR', 'EM', 'I', 'STRONG', 'B', 'U', 'S', 'SUP', 'SUB']);
  const fragment = document.createDocumentFragment();
  const copy = (source: Node, target: Node) => {
    for (const child of source.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        target.appendChild(document.createTextNode(child.textContent || ''));
      } else if (child instanceof HTMLElement && allowed.has(child.tagName)) {
        const element = document.createElement(child.tagName.toLowerCase());
        copy(child, element);
        target.appendChild(element);
      }
    }
  };
  copy(template.content, fragment);
  return fragment;
}
