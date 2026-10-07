import { tx } from '@/domain/testing/builders';

import { glowSpots, mapBundle, newestAddition, offsetPolyline, polylineLength, type Point } from './backdrop';

/** Distance of point p from the infinite line through a and b. */
function distanceFromLine(p: Point, a: Point, b: Point) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / Math.hypot(dx, dy);
}

describe('offsetPolyline', () => {
  it('moves a straight segment sideways by the distance', () => {
    expect(offsetPolyline([[0, 0], [10, 0]], 2)).toEqual([[0, 2], [10, 2]]);
  });

  it('keeps every segment parallel at the same distance across a 45° bend', () => {
    const spine: Point[] = [[100, 50], [40, 50], [0, 10], [0, -30]];
    const shifted = offsetPolyline(spine, 6);
    for (let i = 0; i < spine.length - 1; i++) {
      expect(distanceFromLine(shifted[i], spine[i], spine[i + 1])).toBeCloseTo(6);
      expect(distanceFromLine(shifted[i + 1], spine[i], spine[i + 1])).toBeCloseTo(6);
    }
  });
});

describe('polylineLength', () => {
  it('adds up the segments', () => {
    expect(polylineLength([[0, 0], [3, 4], [3, 10]])).toBe(11);
  });
});

describe('mapBundle', () => {
  const phone = { screenWidth: 390, columnWidth: 390, top: 120, pitch: 9 };

  it('draws one line per category, a pitch apart', () => {
    const bundle = mapBundle({ ...phone, count: 4 });
    expect(bundle.lines).toHaveLength(4);
    const ys = bundle.lines.map((line) => line.points[0][1]);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeCloseTo(9);
  });

  it('runs at the requested height, centred on it', () => {
    const ys = mapBundle({ ...phone, count: 4 }).lines.map((line) => line.points[0][1]);
    expect((ys[0] + ys[ys.length - 1]) / 2).toBeCloseTo(120);
  });

  it('enters from beyond the right edge of the screen', () => {
    for (const line of mapBundle({ ...phone, count: 3 }).lines) expect(line.points[0][0]).toBeGreaterThan(390);
  });

  it('bends inside the content column, also on a wide screen', () => {
    const wide = { screenWidth: 1024, columnWidth: 480, top: 120, pitch: 9 };
    const left = (1024 - 480) / 2;
    for (const line of mapBundle({ ...wide, count: 4 }).lines) {
      for (const [x] of line.points.slice(1, -1)) {
        expect(x).toBeGreaterThan(left);
        expect(x).toBeLessThan(left + 480);
      }
    }
  });

  it('gives each line its length for the draw-in', () => {
    const [line] = mapBundle({ ...phone, count: 1 }).lines;
    expect(line.length).toBeCloseTo(polylineLength(line.points));
  });

  it('puts an interchange across all the lines', () => {
    const bundle = mapBundle({ ...phone, count: 4 });
    const ys = bundle.lines.map((line) => line.points[0][1]);
    expect(bundle.interchange.y).toBeLessThan(Math.min(...ys));
    expect(bundle.interchange.y + bundle.interchange.height).toBeGreaterThan(Math.max(...ys));
    expect(bundle.interchange.x + bundle.interchange.width).toBeLessThanOrEqual(390);
  });

  it('draws nothing without categories', () => {
    expect(mapBundle({ ...phone, count: 0 }).lines).toEqual([]);
  });
});

describe('glowSpots', () => {
  it('keeps the glows over the content column, also on a wide screen', () => {
    const left = (1024 - 480) / 2;
    const spots = glowSpots({ screenWidth: 1024, columnWidth: 480, top: 40 });
    expect(spots).toHaveLength(3);
    for (const spot of spots) {
      expect(spot.x).toBeGreaterThanOrEqual(left);
      expect(spot.x).toBeLessThanOrEqual(left + 480);
    }
  });
});

describe('newestAddition', () => {
  it('returns the most recently created transaction', () => {
    const older = tx({ createdAt: '2026-10-24T08:00:00Z' });
    const newer = tx({ createdAt: '2026-10-24T09:30:00Z', date: '2026-10-20' });
    expect(newestAddition([newer, older])?.id).toBe(newer.id);
  });

  it('skips deleted transactions', () => {
    const kept = tx({ createdAt: '2026-10-24T08:00:00Z' });
    const deleted = tx({ createdAt: '2026-10-24T09:30:00Z', deletedAt: '2026-10-24T09:31:00Z' });
    expect(newestAddition([kept, deleted])?.id).toBe(kept.id);
  });

  it('returns null for no transactions', () => {
    expect(newestAddition([])).toBeNull();
  });
});
