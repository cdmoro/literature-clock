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

// Compact numeric forms used by the quote catalogues. Keep these in sync with
// CompactQuoteTime.swift and CompactQuoteTime.cs.
const clock = String.raw`\p{Nd}{1,2}(?:\p{Zs}*[:：.]\p{Zs}*\p{Nd}{2})?`;
const meridiem = String.raw`(?:[ap]m|[ap]\.\p{Zs}*m\.?|[πμ]μ|[πμ]\.\p{Zs}*μ\.?|صباحًا|صباحاً|مساءً|مساء|[صم]|утра|дня|вечера|ночи)`;
const eastAsian = String.raw`(?:(?:午前|午後|凌晨|早上|上午|中午|下午|晚上|傍晚)\p{Zs}*)?(?:\p{Nd}{1,2}[時时点點](?:\p{Nd}{1,2}[分]?|半)?|\p{Nd}{1,2}[:：]\p{Nd}{2})`;
const compactTime = new RegExp(
  String.raw`^((?:[«‹]\p{Zs}+|\p{P})*?)(${clock}\p{Zs}*${meridiem}|\p{Nd}{1,2}\p{Zs}*h(?:\p{Zs}*\p{Nd}{2})?|\p{Nd}{1,2}(?:\p{Zs}*[:：.]\p{Zs}*\p{Nd}{2})?\p{Zs}*Uhr|${eastAsian}|\p{Nd}{1,2}\.\p{Nd}{2})((?:\p{Zs}+[»›]|\p{P})*)$`,
  'iu',
);
const leadingPunctuation = /(?:[«‹]\p{Zs}+|\p{P})+$/u;
const trailingPunctuation = /^(?::\p{Nd}{2})?(?:\p{P}|\p{Zs}+[»›]|[\u00a0\u202f\u2009]+[!?:;])*/u;
const frenchTrailingPunctuation = /^(?:\p{P}|\p{Zs}+[»›!?:;])*/u;

function takeText(fragment: DocumentFragment | HTMLElement, length: number, fromEnd = false) {
  const range = document.createRange();
  range.selectNodeContents(fragment);
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
  let offset = fromEnd ? (fragment.textContent?.length ?? 0) - length : length;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const size = node.textContent?.length ?? 0;
    if (offset < size || (!fromEnd && offset === size)) {
      if (fromEnd) range.setStart(node, offset);
      else range.setEnd(node, offset);
      return range.extractContents();
    }
    offset -= size;
  }
  return range.extractContents();
}

export function appendQuotePassage(
  passage: HTMLElement,
  parts: { quote_first: string; quote_time_case: string; quote_last: string },
  locale: string,
  fuzzy: boolean,
  styleTime: (time: HTMLElement) => void,
) {
  const before = quoteMarkup(fuzzy ? '' : parts.quote_first || '');
  const after = quoteMarkup(fuzzy ? '' : parts.quote_last || '');
  const time = document.createElement('span');
  time.append(quoteMarkup(parts.quote_time_case || ''));
  styleTime(time);

  // BR participates in layout even though it is absent from textContent.
  const breakableText = (element: DocumentFragment | HTMLElement) => {
    const clone = element.cloneNode(true) as DocumentFragment | HTMLElement;
    for (const br of clone.querySelectorAll('br')) br.replaceWith('\n');
    return clone.textContent ?? '';
  };
  const highlighted = time.textContent ?? '';
  const match =
    !time.querySelector('br') && !/[\n\r\u2028\u2029]/u.test(highlighted) ? compactTime.exec(highlighted) : null;
  if (!match) {
    passage.append(before, time, after);
    return;
  }

  const [, leading, , trailing] = match;
  const group = document.createElement('span');
  group.className = 'compact-quote-time';
  Object.assign(group.style, { display: 'inline-block', maxInlineSize: '100%', overflowWrap: 'anywhere' });
  // Only inspect the first/last visual line. Never pull punctuation across a BR.
  const lastLine = breakableText(before).split('\n').pop() ?? '';
  const firstLine = breakableText(after).split('\n')[0] ?? '';
  const beforeLength = lastLine.match(leadingPunctuation)?.[0].length ?? 0;
  const afterLength =
    firstLine.match(locale.startsWith('fr') ? frenchTrailingPunctuation : trailingPunctuation)?.[0].length ?? 0;
  if (beforeLength) group.append(takeText(before, beforeLength, true));
  if (leading) group.append(takeText(time, leading.length));
  const suffix = trailing ? takeText(time, trailing.length, true) : null;
  group.append(time);
  if (suffix) group.append(suffix);
  if (afterLength) group.append(takeText(after, afterLength));
  passage.append(before, group, after);
}
