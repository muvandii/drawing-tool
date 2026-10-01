# Loomis Studio

A local-first portrait construction workspace built with React, TypeScript, Vite, SVG and MediaPipe Face Mesh. Upload a real portrait, choose a subject if necessary, then explore six independently toggleable Loomis-style construction stages.

## Run

Requires Node.js 20.19+ (Node 22 recommended).

```sh
npm install
npm run dev
```

Open the Vite URL. The development server binds to `0.0.0.0` and accepts the hosted preview origin.

```sh
npm run build
npm run preview
```

Deploy the contents of `dist/` at the host root. No backend, API key or account is required.

## Features

- File picker and drag-and-drop for JPG, PNG and WebP, up to 30 MB.
- Real, local 468-point facial landmark inference; up to five detected subjects with a visual picker.
- Cranium sphere, side plane, center/brow axes, feature proportions, jaw/chin, and finishing accents.
- Six progressive steps, independent layer toggles, custom colors, opacity and thickness.
- Reference opacity and visibility, viewport zoom, drag-to-move construction, scale/rotation/offset adjustments and restore detected fit.
- PNG and self-contained SVG exports, with optional transparent construction-only output. Exports contain the current step, enabled layers and adjustments; viewport zoom is not exported.
- Friendly no-face, invalid-file and model-loading failure states; reset and replace reference.
- Responsive workspace, keyboard-accessible controls and integrated method guide.

## Geometry and limitations

The geometry module first removes roll using the detected outer-eye axis. Head width, forehead and chin determine the cranium and face proportions. Projected nose asymmetry estimates yaw; relative forehead/chin depth estimates pitch. These modify the sphere and visible side plane. Brow, nose, mouth and chin landmarks position the axes and guides; selected jaw landmarks define broad construction planes, not a traced mesh. Missing secondary landmarks fall back to nearby anatomical anchors.

This is an artist-oriented weak-perspective approximation, **not calibrated 3D reconstruction**. Face Mesh does not provide ears or the hidden back of the cranium. Those volumes are inferred from visible anatomy. The tool cannot guarantee accuracy for extreme profiles, occlusion, low light, or very small faces. Correct imperfect alignment using Adjust and the move tool. It does not yet provide per-landmark drag handles or a full perspective camera solver.

Uploads are downsampled to a maximum 2400-pixel long edge to bound memory use; the displayed dimensions are the export dimensions. Example imagery retains its supplied resolution. Only the primary six anchors are mandatory. MediaPipe requests are serialized and its tracking state reset between unrelated photos.

## Privacy and assets

Photos are decoded into local object URLs; there is no upload endpoint, analytics or storage of user photos. Models, WASM and fonts are served from this app's own origin. An install/predev/prebuild script copies the versioned MediaPipe runtime from npm into ignored `public/mediapipe/` and Vite includes it in the deployment. There is no runtime model CDN dependency. Normal network access is needed for `npm install`, and an initial app load is still required (no offline service worker).

The included example photograph is from [Unsplash's female portraits collection](https://unsplash.com/collections/2562991/female-portraits), image identifier `photo-1593203995707-dc5c9616baa8`, used under the [Unsplash License](https://unsplash.com/license). It is a static example only; its construction is inferred by the same detector used for uploads. MediaPipe is Apache-2.0; DM Sans and Manrope are distributed by Fontsource under OFL-1.1; Lucide icons are ISC.

## Tests

```sh
npm test
npm run build
# In a separate terminal while npm run dev is running:
npm run test:smoke
```

Geometry tests check circular frontal projection, face-derived scaling, roll, side-plane orientation and missing secondary landmarks. The Linux browser smoke test uses npm-distributed headless Chromium and checks actual model inference, progressive steps, visibility toggles, PNG/SVG file contents, adjustments, reset, upload, narrow-screen overflow, blank-image handling and a two-subject picker. It also asserts that the default session sends no requests to external origins. Browser screenshots are written to ignored `test-results/`.
