import { describe, expect, it } from 'vitest';
import { movementBounds } from './screensaver';

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
