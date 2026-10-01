export type Point = { x: number; y: number; z?: number };
export type Shape = {
  tag: "path" | "ellipse" | "line";
  attrs: Record<string, string | number>;
};
export type Construction = {
  layers: Shape[][];
  cx: number;
  cy: number;
  angle: number;
  yaw: number;
  width: number;
  pitch: number;
};
export const stages = [
  {
    name: "Head sphere",
    detail: "The foundation of the cranium",
    tip: "Start with the big form. The sphere describes the cranium, not the entire head. Its size is fitted to the forehead and sides of this face.",
  },
  {
    name: "Side plane",
    detail: "Flatten the sides of the sphere",
    tip: "Slice off the side of the sphere. The ellipse becomes wider as the head turns away from a frontal view. Head sides are estimated; Face Mesh does not detect ears.",
  },
  {
    name: "Center & brow lines",
    detail: "Establish direction and head tilt",
    tip: "The centerline follows the forehead, nose and chin. The brow axis establishes the head’s tilt; together they describe its direction in space.",
  },
  {
    name: "Facial proportions",
    detail: "Find the nose, mouth and chin",
    tip: "Use the detected features to divide the face. These are the proportions of your reference, rather than idealized equal thirds.",
  },
  {
    name: "Jaw & chin",
    detail: "Connect the planes of the face",
    tip: "Connect the side planes to the chin with a simplified jaw. Think in broad, structural angles rather than tracing the outline.",
  },
  {
    name: "Complete construction",
    detail: "Bring the whole structure together",
    tip: "See how the forms connect. Lower the photo opacity to study the construction, or hide individual layers to focus on one relationship.",
  },
];
export function construct(points: Point[], w: number, h: number): Construction {
  // Face Mesh supplies a full mesh, but allow missing secondary landmarks to
  // fall back to nearby anatomical anchors rather than producing NaN paths.
  const alternatives: Record<number, number[]> = {
    2: [1, 4, 168],
    13: [14, 0, 17],
    9: [8, 168, 10],
    1: [4, 2, 168],
    172: [136, 234],
    176: [148, 152],
    400: [377, 152],
    397: [365, 454],
    168: [6, 9],
    98: [97, 2],
    327: [326, 2],
    61: [78, 13],
    291: [308, 13],
  };
  const valid = (point?: Point) =>
    point && Number.isFinite(point.x) && Number.isFinite(point.y);
  const p = (i: number) => {
    const point = [i, ...(alternatives[i] || [])]
      .map((index) => points[index])
      .find(valid) || {
      x: (points[33].x + points[263].x) / 2,
      y: (points[33].y + points[263].y) / 2,
    };
    return { x: point.x * w, y: point.y * h };
  };
  const a = p(33),
    b = p(263),
    cx = (a.x + b.x) / 2,
    cy = (a.y + b.y) / 2,
    angle = Math.atan2(b.y - a.y, b.x - a.x),
    c = Math.cos(angle),
    s = Math.sin(angle);
  const q = (i: number) => {
    const v = p(i);
    return {
      x: (v.x - cx) * c + (v.y - cy) * s,
      y: -(v.x - cx) * s + (v.y - cy) * c,
    };
  };
  const left = q(234),
    right = q(454),
    top = q(10),
    chin = q(152),
    nose = q(2),
    mouth = q(13),
    brow = q(9);
  const width = Math.max(40, right.x - left.x);
  // Projected nose displacement estimates yaw; relative mesh depth provides a
  // weak-perspective pitch estimate. Neither is a calibrated camera pose.
  const yaw = Math.max(
    -0.85,
    Math.min(0.85, (q(1).x - (left.x + right.x) / 2) / (width * 0.42)),
  );
  const pitch = Math.atan2(
    ((points[152].z || 0) - (points[10].z || 0)) * w,
    Math.max(1, chin.y - top.y),
  );
  const r = width * (0.55 + Math.abs(yaw) * 0.03),
    sy = top.y + r * 0.64,
    rx = r,
    ry = r * (1.03 - Math.min(0.12, Math.abs(pitch) * 0.12));
  const center = (left.x + right.x) / 2;
  const line = (x1: number, y1: number, x2: number, y2: number): Shape => ({
    tag: "line",
    attrs: { x1, y1, x2, y2 },
  });
  const path = (d: string): Shape => ({ tag: "path", attrs: { d } });
  const ellipse = (x: number, y: number, rx: number, ry: number): Shape => ({
    tag: "ellipse",
    attrs: { cx: x, cy: y, rx, ry },
  });
  const sideX = yaw >= 0 ? left.x + width * 0.09 : right.x - width * 0.09;
  const sideW = width * (0.075 + Math.abs(yaw) * 0.19);
  const layers: Shape[][] = [
    [ellipse(center, sy, rx, ry)],
    [
      ellipse(sideX, sy + ry * 0.13, sideW, ry * 0.68),
      line(sideX, sy - ry * 0.55, sideX, sy + ry * 0.81),
      line(sideX - sideW, sy + ry * 0.13, sideX + sideW, sy + ry * 0.13),
    ],
    [
      path(
        `M ${top.x} ${sy - ry} Q ${brow.x} ${brow.y} ${nose.x} ${nose.y} Q ${mouth.x} ${mouth.y} ${chin.x} ${chin.y}`,
      ),
      path(
        `M ${center - rx} ${brow.y} Q ${brow.x} ${brow.y + width * 0.08} ${center + rx} ${brow.y}`,
      ),
    ],
    [
      line(left.x, nose.y, right.x, nose.y),
      line(left.x + width * 0.12, mouth.y, right.x - width * 0.12, mouth.y),
      line(chin.x - width * 0.21, chin.y, chin.x + width * 0.21, chin.y),
      line(left.x * 0.9, 0, right.x * 0.9, 0),
    ],
    [
      path(
        `M ${left.x} ${sy + ry * 0.1} L ${q(172).x} ${q(172).y} L ${q(176).x} ${q(176).y} L ${chin.x} ${chin.y} L ${q(400).x} ${q(400).y} L ${q(397).x} ${q(397).y} L ${right.x} ${sy + ry * 0.1}`,
      ),
    ],
    [
      path(
        `M ${q(168).x} ${q(168).y} L ${q(98).x} ${q(98).y} L ${nose.x} ${nose.y} L ${q(327).x} ${q(327).y} Z`,
      ),
      line(q(61).x, q(61).y, q(291).x, q(291).y),
    ],
  ];
  return { layers, cx, cy, angle: (angle * 180) / Math.PI, yaw, width, pitch };
}
