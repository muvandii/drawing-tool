import { mkdir, copyFile } from "node:fs/promises";
const base = new URL("../node_modules/@mediapipe/face_mesh/", import.meta.url);
const target = new URL("../public/mediapipe/", import.meta.url);
await mkdir(target, { recursive: true });
for (const file of [
  "face_mesh.js",
  "face_mesh.binarypb",
  "face_mesh_solution_packed_assets.data",
  "face_mesh_solution_packed_assets_loader.js",
  "face_mesh_solution_simd_wasm_bin.data",
  "face_mesh_solution_simd_wasm_bin.js",
  "face_mesh_solution_simd_wasm_bin.wasm",
  "face_mesh_solution_wasm_bin.js",
  "face_mesh_solution_wasm_bin.wasm",
])
  await copyFile(new URL(file, base), new URL(file, target));
console.log("Local face detection assets ready.");
