import type { Transaction } from '@/domain/types';

/**
 * Geometry of the Home backdrop. Coordinates are screen points; `top` is where the content
 * starts below the status bar. The content sits in a centred column (see layout.maxContentWidth),
 * so every shape is placed against that column, never against the bare screen.
 */

export type Point = readonly [number, number];

function unitNormal(a: Point, b: Point): Point {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy);
  return [-dy / length, dx / length];
}

/** A parallel copy of a polyline, with mitred corners so bends stay crisp like a metro diagram. */
export function offsetPolyline(points: readonly Point[], distance: number): Point[] {
  return points.map((point, i) => {
    const before = i > 0 ? unitNormal(points[i - 1], point) : null;
    const after = i < points.length - 1 ? unitNormal(point, points[i + 1]) : null;
    let normal = (before ?? after)!;
    if (before && after) {
      const dot = before[0] * after[0] + before[1] * after[1];
      normal = [(before[0] + after[0]) / (1 + dot), (before[1] + after[1]) / (1 + dot)];
    }
    return [point[0] + distance * normal[0], point[1] + distance * normal[1]];
  });
}

export function polylineLength(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return total;
}

interface Frame {
  screenWidth: number;
  columnWidth: number;
  top: number;
}

function columnEdges({ screenWidth, columnWidth }: Frame) {
  const left = (screenWidth - columnWidth) / 2;
  return { left, right: left + columnWidth };
}

export interface MapBundle {
  /** First line = largest category, drawn on top of the bundle. */
  lines: { points: Point[]; length: number }[];
  /** The interchange capsule laid across the bundle. */
  interchange: { x: number; y: number; width: number; height: number };
}

/**
 * Map: the month's top categories as a bundle of parallel lines. They enter from the right edge
 * at `top`, run beside the hero figure, turn 45° and leave through the top of the screen.
 */
export function mapBundle(frame: Frame & { count: number; pitch: number }): MapBundle {
  const { right } = columnEdges(frame);
  const { top, count, pitch, screenWidth } = frame;
  const spine: Point[] = [
    [screenWidth + 40, top],
    [right - 68, top],
    [right - 168, top - 100],
    [right - 168, top - 210],
  ];
  const lines = Array.from({ length: count }, (_, i) => {
    const points = offsetPolyline(spine, ((count - 1) / 2 - i) * pitch);
    return { points, length: polylineLength(points) };
  });
  const half = (count * pitch) / 2 + 5;
  return { lines, interchange: { x: right - 38, y: top - half, width: 15, height: half * 2 } };
}

export interface GlowSpot {
  x: number;
  y: number;
  r: number;
}

/** Light: three soft glows, the first two framing the hero, the third fading behind the band. */
export function glowSpots(frame: Frame): GlowSpot[] {
  const { left, right } = columnEdges(frame);
  const { top, columnWidth } = frame;
  return [
    { x: right - 60, y: top + 6, r: 250 },
    { x: left + 40, y: top - 24, r: 210 },
    { x: left + columnWidth * 0.64, y: top + 216, r: 170 },
  ];
}

/** The transaction added last (by creation time, not by its date), ignoring deleted ones. */
export function newestAddition(transactions: readonly Transaction[]): Transaction | null {
  let newest: Transaction | null = null;
  for (const t of transactions) {
    if (t.deletedAt) continue;
    if (!newest || t.createdAt > newest.createdAt) newest = t;
  }
  return newest;
}
