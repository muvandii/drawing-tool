import { test } from "node:test";
import assert from "node:assert/strict";
import { construct, type Point } from "../src/geometry";

function face(): Point[] {
  const points = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const set = (i: number, x: number, y: number) => (points[i] = { x, y, z: 0 });
  set(33, 0.35, 0.42);
  set(263, 0.65, 0.42);
  set(234, 0.25, 0.48);
  set(454, 0.75, 0.48);
  set(10, 0.5, 0.2);
  set(152, 0.5, 0.82);
  set(9, 0.5, 0.36);
  set(2, 0.5, 0.58);
  set(1, 0.5, 0.56);
  set(13, 0.5, 0.68);
  set(172, 0.3, 0.65);
  set(176, 0.4, 0.77);
  set(400, 0.6, 0.77);
  set(397, 0.7, 0.65);
  return points;
}
test("frontal construction is nearly circular and has six independent layers", () => {
  const model = construct(face(), 1000, 1000);
  assert.equal(model.layers.length, 6);
  assert.equal(model.angle, 0);
  assert.equal(model.yaw, 0);
  const { rx, ry } = model.layers[0][0].attrs;
  assert.ok(Math.abs(Number(rx) - Number(ry)) / Number(rx) < 0.05);
});
test("sphere scales with actual face width rather than a fixed template", () => {
  const small = face(),
    large = small.map((p) => ({ ...p, x: 0.5 + (p.x - 0.5) * 1.5 }));
  const a = construct(small, 1000, 1000),
    b = construct(large, 1000, 1000);
  assert.equal(b.width / a.width, 1.5);
  assert.ok(
    Math.abs(
      Number(b.layers[0][0].attrs.rx) / Number(a.layers[0][0].attrs.rx) - 1.5,
    ) < 1e-9,
  );
});
test("eye axis determines roll", () => {
  const rotated = face().map((p) => {
    const x = p.x - 0.5,
      y = p.y - 0.5,
      a = Math.PI / 6;
    return {
      ...p,
      x: 0.5 + x * Math.cos(a) - y * Math.sin(a),
      y: 0.5 + x * Math.sin(a) + y * Math.cos(a),
    };
  });
  assert.ok(Math.abs(construct(rotated, 1000, 1000).angle - 30) < 0.001);
});
test("nose displacement changes the side plane projection", () => {
  const frontal = face(),
    turned = face();
  turned[1].x = 0.62;
  const a = construct(frontal, 1000, 1000),
    b = construct(turned, 1000, 1000);
  assert.ok(b.yaw > 0);
  assert.ok(Number(b.layers[1][0].attrs.rx) > Number(a.layers[1][0].attrs.rx));
});
test("missing secondary landmarks fall back without NaN geometry", () => {
  const points = face();
  points[2] = { x: NaN, y: NaN };
  points[172] = { x: NaN, y: NaN };
  const result = JSON.stringify(construct(points, 800, 1000));
  assert.ok(!result.includes("NaN"));
  assert.ok(!result.includes("null"));
});
