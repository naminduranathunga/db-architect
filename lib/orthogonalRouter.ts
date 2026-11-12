import { Point } from '../types/database';

export const MIN_STUB = 24; // Minimum length from start/end point to first waypoint turn

/**
 * Checks if two coordinates are approximately equal within a threshold.
 */
export function isNear(a: number, b: number, tolerance = 4): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Generates the canonical default orthogonal waypoints from start to end.
 */
export function generateDefaultOrthogonalPoints(
  start: Point,
  sSide: 'left' | 'right',
  end: Point,
  tSide: 'left' | 'right',
  bendOffset = 0,
  isSelf = false
): Point[] {
  const sDir = sSide === 'right' ? 1 : -1;
  const tDir = tSide === 'right' ? 1 : -1;

  if (isSelf) {
    const outX = Math.max(start.x, end.x) + Math.max(MIN_STUB, 40 + bendOffset);
    return [
      { x: start.x, y: start.y },
      { x: outX, y: start.y },
      { x: outX, y: end.y },
      { x: end.x, y: end.y },
    ];
  }

  // Case 1: Standard Right to Left (Start exits right, End enters left)
  if (sSide === 'right' && tSide === 'left') {
    if (end.x > start.x + 2 * MIN_STUB) {
      // 3 segments (2 turns)
      let midX = Math.round((start.x + end.x) / 2 + bendOffset);
      midX = Math.max(start.x + MIN_STUB, Math.min(end.x - MIN_STUB, midX));
      return [
        { x: start.x, y: start.y },
        { x: midX, y: start.y },
        { x: midX, y: end.y },
        { x: end.x, y: end.y },
      ];
    } else {
      // Target is backwards or overlapping: 5 segments (4 turns)
      const sOut = start.x + Math.max(MIN_STUB, 30 + Math.max(0, bendOffset));
      const tOut = end.x - Math.max(MIN_STUB, 30 + Math.max(0, -bendOffset));
      const midY = Math.round((start.y + end.y) / 2);
      return [
        { x: start.x, y: start.y },
        { x: sOut, y: start.y },
        { x: sOut, y: midY },
        { x: tOut, y: midY },
        { x: tOut, y: end.y },
        { x: end.x, y: end.y },
      ];
    }
  }

  // Case 2: Standard Left to Right (Start exits left, End enters right)
  if (sSide === 'left' && tSide === 'right') {
    if (end.x < start.x - 2 * MIN_STUB) {
      let midX = Math.round((start.x + end.x) / 2 + bendOffset);
      midX = Math.min(start.x - MIN_STUB, Math.max(end.x + MIN_STUB, midX));
      return [
        { x: start.x, y: start.y },
        { x: midX, y: start.y },
        { x: midX, y: end.y },
        { x: end.x, y: end.y },
      ];
    } else {
      const sOut = start.x - Math.max(MIN_STUB, 30 + Math.max(0, -bendOffset));
      const tOut = end.x + Math.max(MIN_STUB, 30 + Math.max(0, bendOffset));
      const midY = Math.round((start.y + end.y) / 2);
      return [
        { x: start.x, y: start.y },
        { x: sOut, y: start.y },
        { x: sOut, y: midY },
        { x: tOut, y: midY },
        { x: tOut, y: end.y },
        { x: end.x, y: end.y },
      ];
    }
  }

  // Case 3: Same side Right & Right
  if (sSide === 'right' && tSide === 'right') {
    const outX = Math.max(start.x, end.x) + Math.max(MIN_STUB, 35 + bendOffset);
    return [
      { x: start.x, y: start.y },
      { x: outX, y: start.y },
      { x: outX, y: end.y },
      { x: end.x, y: end.y },
    ];
  }

  // Case 4: Same side Left & Left
  const outX = Math.min(start.x, end.x) - Math.max(MIN_STUB, 35 - bendOffset);
  return [
    { x: start.x, y: start.y },
    { x: outX, y: start.y },
    { x: outX, y: end.y },
    { x: end.x, y: end.y },
  ];
}

/**
 * Cleans and merges waypoints like draw.io:
 * 1. Enforces MIN_STUB distance at start and end.
 * 2. Merges collinear points (when two segments share the same x or y).
 * 3. Removes duplicate / zero-length points.
 */
export function cleanAndMergeWaypoints(
  rawPoints: Point[],
  sSide: 'left' | 'right',
  tSide: 'left' | 'right'
): Point[] {
  if (rawPoints.length < 2) return rawPoints;

  const points: Point[] = rawPoints.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  const sDir = sSide === 'right' ? 1 : -1;
  const tDir = tSide === 'right' ? 1 : -1;

  // 1. Enforce minimum stub from start port
  if (points.length >= 2) {
    if (sSide === 'right' && points[1].x < points[0].x + MIN_STUB) {
      points[1].x = points[0].x + MIN_STUB;
    } else if (sSide === 'left' && points[1].x > points[0].x - MIN_STUB) {
      points[1].x = points[0].x - MIN_STUB;
    }
  }

  // 2. Enforce minimum stub into end port
  const n = points.length;
  if (n >= 2) {
    if (tSide === 'left' && points[n - 2].x > points[n - 1].x - MIN_STUB) {
      points[n - 2].x = points[n - 1].x - MIN_STUB;
    } else if (tSide === 'right' && points[n - 2].x < points[n - 1].x + MIN_STUB) {
      points[n - 2].x = points[n - 1].x + MIN_STUB;
    }
  }

  // 3. Iteratively merge collinear points and remove micro-segments
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 15 && points.length > 2) {
    changed = false;
    iterations++;

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      // A. Zero length segment between curr and next
      if (isNear(curr.x, next.x, 3) && isNear(curr.y, next.y, 3)) {
        points.splice(i, 1);
        changed = true;
        break;
      }

      // B. Vertical collinear: prev, curr, next all have approximately same X
      if (isNear(prev.x, curr.x, 3) && isNear(curr.x, next.x, 3)) {
        points.splice(i, 1);
        changed = true;
        break;
      }

      // C. Horizontal collinear: prev, curr, next all have approximately same Y
      if (isNear(prev.y, curr.y, 3) && isNear(curr.y, next.y, 3)) {
        points.splice(i, 1);
        changed = true;
        break;
      }

      // D. Redundant U-turn overlap: if curr.x == prev.x and next.x == curr.x
      if (i + 2 < points.length) {
        const nextNext = points[i + 2];
        // If a segment collapsed onto another parallel segment
        if (
          isNear(prev.x, nextNext.x, 3) &&
          isNear(curr.y, next.y, 3) &&
          Math.abs(curr.x - next.x) < 4
        ) {
          // Collapse redundant zigzag
          points.splice(i, 2);
          changed = true;
          break;
        }
      }
    }
  }

  // 4. Strict orthogonal check: Guarantee 100% 90-degree right angles throughout!
  // If any segment between p[i] and p[i+1] is diagonal, fix it by stepping orthogonally.
  const strictlyOrthogonal: Point[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = strictlyOrthogonal[strictlyOrthogonal.length - 1];
    const curr = points[i];

    if (prev.x === curr.x || prev.y === curr.y) {
      strictlyOrthogonal.push({ x: curr.x, y: curr.y });
    } else {
      // Must bend at 90 degrees, never diagonal!
      // Add a 90-degree corner point (prev.x -> curr.x horizontally, then prev.y -> curr.y vertically)
      strictlyOrthogonal.push({ x: curr.x, y: prev.y });
      strictlyOrthogonal.push({ x: curr.x, y: curr.y });
    }
  }

  return strictlyOrthogonal;
}

/**
 * Moves a segment of an orthogonal polyline.
 * If moving a horizontal segment vertically: updates Y, or introduces new waypoints if moving end segments.
 * If moving a vertical segment horizontally: updates X, or introduces new waypoints.
 */
export function moveOrthogonalSegment(
  points: Point[],
  segmentIndex: number,
  newCoord: number,
  sSide: 'left' | 'right',
  tSide: 'left' | 'right'
): Point[] {
  if (segmentIndex < 0 || segmentIndex >= points.length - 1) return points;

  const result: Point[] = points.map((p) => ({ ...p }));
  const p1 = result[segmentIndex];
  const p2 = result[segmentIndex + 1];

  const isVertical = isNear(p1.x, p2.x, 4);
  const isHorizontal = !isVertical;

  if (isVertical) {
    // User is dragging vertical segment horizontally to new X coordinate
    const targetX = Math.round(newCoord);

    if (segmentIndex > 0 && segmentIndex < result.length - 2) {
      // Internal vertical segment: simply move p1.x and p2.x to targetX
      p1.x = targetX;
      p2.x = targetX;
    } else if (segmentIndex === 0) {
      // Start segment cannot detach from start port!
      // Enforce minimum stub
      const sDir = sSide === 'right' ? 1 : -1;
      const validX = sSide === 'right' ? Math.max(p1.x + MIN_STUB, targetX) : Math.min(p1.x - MIN_STUB, targetX);
      p2.x = validX;
      // insert new waypoint if needed
      result.splice(segmentIndex + 1, 0, { x: validX, y: p1.y });
    } else {
      // Last segment
      const tDir = tSide === 'left' ? -1 : 1;
      const validX = tSide === 'left' ? Math.min(p2.x - MIN_STUB, targetX) : Math.max(p2.x + MIN_STUB, targetX);
      p1.x = validX;
      result.splice(segmentIndex, 0, { x: validX, y: p2.y });
    }
  } else {
    // User is dragging horizontal segment vertically to new Y coordinate
    const targetY = Math.round(newCoord);

    if (segmentIndex > 0 && segmentIndex < result.length - 2) {
      // Internal horizontal segment: simply move p1.y and p2.y to targetY
      p1.y = targetY;
      p2.y = targetY;
    } else if (segmentIndex === 0) {
      // Start segment: Cannot move start port Y. Split into stub -> vertical -> horizontal!
      const stubX = sSide === 'right' ? p1.x + MIN_STUB : p1.x - MIN_STUB;
      result.splice(1, 0, { x: stubX, y: p1.y }, { x: stubX, y: targetY }, { x: p2.x, y: targetY });
    } else {
      // Last segment
      const stubX = tSide === 'left' ? p2.x - MIN_STUB : p2.x + MIN_STUB;
      result.splice(segmentIndex, 0, { x: p1.x, y: targetY }, { x: stubX, y: targetY }, { x: stubX, y: p2.y });
    }
  }

  return cleanAndMergeWaypoints(result, sSide, tSide);
}

/**
 * Moves an intermediate waypoint directly while preserving 90-degree orthogonal angles.
 */
export function moveWaypoint(
  points: Point[],
  waypointIndex: number, // index in full points array (1 to points.length - 2)
  newX: number,
  newY: number,
  sSide: 'left' | 'right',
  tSide: 'left' | 'right'
): Point[] {
  if (waypointIndex <= 0 || waypointIndex >= points.length - 1) return points;

  const result = points.map((p) => ({ ...p }));
  const curr = result[waypointIndex];
  const prev = result[waypointIndex - 1];
  const next = result[waypointIndex + 1];

  const targetX = Math.round(newX);
  const targetY = Math.round(newY);

  curr.x = targetX;
  curr.y = targetY;

  // Determine whether the incoming segment from prev was vertical or horizontal
  const prevWasVertical = isNear(prev.x, curr.x, 8);
  if (prevWasVertical) {
    prev.x = targetX; // keep (prev -> curr) vertical
    next.y = targetY; // keep (curr -> next) horizontal
  } else {
    prev.y = targetY; // keep (prev -> curr) horizontal
    next.x = targetX; // keep (curr -> next) vertical
  }

  return cleanAndMergeWaypoints(result, sSide, tSide);
}

/**
 * Converts a list of points into an SVG path string "M x y L x y ...".
 */
export function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${Math.round(p.x)} ${Math.round(p.y)}`)
    .join(' ');
}

