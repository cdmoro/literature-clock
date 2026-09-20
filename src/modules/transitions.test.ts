import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelQuoteTransition, transitionQuote } from './transitions';
import { store } from '../store';

vi.mock('../store', () => ({ store: { get: vi.fn(() => 'fade') } }));
vi.mock('../utils', () => ({ doFitQuote: vi.fn() }));

beforeEach(() => {
  cancelQuoteTransition();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  document.body.innerHTML = '<blockquote id="quote"><p>Old quote</p><cite>Author</cite></blockquote>';
  vi.mocked(store.get).mockReturnValue('fade');
});

describe('quote transitions', () => {
  it('does not commit a superseded request', async () => {
    const render = vi.fn();
    await transitionQuote(render, () => false);
    expect(render).not.toHaveBeenCalled();
    expect(document.querySelector('p')!.textContent).toBe('Old quote');
  });
  it('renders without animation support and when transitions are disabled', async () => {
    vi.mocked(store.get).mockReturnValue('none');
    const render = vi.fn();
    await transitionQuote(render, () => true);
    expect(render).toHaveBeenCalledOnce();
  });
  it.each(['blur', 'zoom'] as const)('animates %s in both directions and clears its effects', async (mode) => {
    vi.mocked(store.get).mockReturnValue(mode);
    const cancel = vi.fn();
    const animate = vi.fn((_: Keyframe[] | PropertyIndexedKeyframes | null) =>
      ({ finished: Promise.resolve(), cancel }) as unknown as Animation,
    );
    document.querySelectorAll<HTMLElement>('p, cite').forEach((element) => { element.animate = animate; });
    const render = vi.fn();
    await transitionQuote(render, () => true);
    expect(render).toHaveBeenCalledOnce();
    expect(animate).toHaveBeenCalledTimes(4);
    const frames = animate.mock.calls.map(([frames]) => frames as Keyframe[]);
    const property = mode === 'blur' ? 'filter' : 'scale';
    const visible = mode === 'blur' ? 'blur(0px)' : '1';
    const hidden = mode === 'blur' ? 'blur(4px)' : '0.96';
    expect(frames[0].map((frame) => (frame as Record<string, unknown>)[property])).toEqual([visible, hidden]);
    expect(frames[2].map((frame) => (frame as Record<string, unknown>)[property])).toEqual([hidden, visible]);
    expect(cancel).toHaveBeenCalledTimes(4);
  });
  it('cancels an outgoing animation without leaving the quote invisible', async () => {
    const pending: { reject: (reason?: unknown) => void }[] = [];
    const animate = vi.fn(() => {
      let reject!: (reason?: unknown) => void;
      const finished = new Promise<Animation>((_, fail) => { reject = fail; });
      pending.push({ reject });
      return { finished, cancel: () => reject(new Error('cancelled')) } as unknown as Animation;
    });
    document.querySelectorAll<HTMLElement>('p, cite').forEach((element) => { element.animate = animate; });
    const render = vi.fn();
    let current = true;
    const transition = transitionQuote(render, () => current);
    expect(render).not.toHaveBeenCalled();
    expect(pending).toHaveLength(2);
    current = false;
    cancelQuoteTransition();
    await transition;
    expect(render).not.toHaveBeenCalled();
  });
});
