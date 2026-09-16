import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exitScreensaverMode, movementBounds, startScreensaver } from './screensaver';
import { store } from '../store';

vi.mock('../store', () => {
  let enabled = false;
  return { store: { get: () => enabled, set: (_key: string, value: boolean) => { enabled = value; } } };
});

describe('screensaver movement bounds', () => {
  it.each([
    [{ left: 120, top: 60, width: 900, height: 500 }, { left: 0, top: 0, width: 1200, height: 800 }],
    [{ left: 10, top: 20, width: 350, height: 600 }, { left: 0, top: 0, width: 375, height: 667 }],
    [{ left: 0, top: 0, width: 1800, height: 1000 }, { left: 30, top: 40, width: 320, height: 240 }],
  ])('keeps both endpoints inside the visible viewport', (box, viewport) => {
    const bounds = movementBounds(box, viewport);
    const left = box.left + box.width * (1 - bounds.scale) / 2;
    const top = box.top + box.height * (1 - bounds.scale) / 2;
    expect(bounds.scale).toBeGreaterThan(0);
    expect(bounds.minX).toBeLessThanOrEqual(bounds.maxX + 0.001);
    expect(bounds.minY).toBeLessThanOrEqual(bounds.maxY + 0.001);
    expect(left + bounds.minX).toBeGreaterThanOrEqual(viewport.left);
    expect(left + bounds.maxX + box.width * bounds.scale).toBeLessThanOrEqual(viewport.left + viewport.width);
    expect(top + bounds.minY).toBeGreaterThanOrEqual(viewport.top);
    expect(top + bounds.maxY + box.height * bounds.scale).toBeLessThanOrEqual(viewport.top + viewport.height);
  });
});

describe('screensaver entry and return', () => {
  let pose: string;
  let frame: FrameRequestCallback | undefined;
  let motions: { frames: Keyframe[]; finish: () => void; cancel: ReturnType<typeof vi.fn> }[];

  beforeEach(() => {
    pose = 'none';
    frame = undefined;
    motions = [];
    document.body.innerHTML = '<div id="clock"><blockquote id="quote">Quote</blockquote></div><footer></footer>';
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({ transform: pose }) as CSSStyleDeclaration);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frame = callback; return 1; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { frame = undefined; });
    vi.stubGlobal('DOMMatrixReadOnly', class { m41 = 0; m42 = 0; });
    document.getElementById('clock')!.animate = vi.fn((frames) => {
      let finish!: () => void;
      let reject!: () => void;
      const finished = new Promise<void>((resolve, fail) => { finish = resolve; reject = fail; });
      const cancel = vi.fn(reject);
      motions.push({ frames: frames as Keyframe[], finish, cancel });
      return { finished, cancel } as unknown as Animation;
    });
  });

  afterEach(() => {
    pose = 'none';
    exitScreensaverMode();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('enters from rest without applying the target scale immediately', () => {
    store.set('screensaver', true);
    startScreensaver();
    frame!(0);
    expect(motions[0].frames[0].transform).toBe('none');
    expect(motions[0].frames[1].transform).toContain('scale(0.94)');
  });

  it('returns from the visible pose and releases its animation on completion', async () => {
    pose = 'matrix(0.94, 0, 0, 0.94, 30, -20)';
    exitScreensaverMode();
    expect(motions[0].frames).toEqual([{ transform: pose }, { transform: 'none' }]);
    expect(store.get('screensaver')).toBe(false);
    expect(motions[0].cancel).not.toHaveBeenCalled();
    motions[0].finish();
    await Promise.resolve();
    expect(motions[0].cancel).toHaveBeenCalledOnce();
  });

  it('reactivates from a partial return and ignores its stale completion', async () => {
    pose = 'matrix(0.94, 0, 0, 0.94, 30, -20)';
    exitScreensaverMode();
    pose = 'matrix(0.97, 0, 0, 0.97, 15, -10)';
    store.set('screensaver', true);
    startScreensaver();
    motions[0].finish();
    await Promise.resolve();
    frame!(0);
    expect(motions[1].frames[0].transform).toBe(pose);
    expect(motions[1].cancel).not.toHaveBeenCalled();
  });

  it('cancels an activation before its first frame without starting a return', () => {
    store.set('screensaver', true);
    startScreensaver();
    exitScreensaverMode();
    expect(frame).toBeUndefined();
    expect(motions).toHaveLength(0);
  });
});
