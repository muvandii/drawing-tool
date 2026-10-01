import type { FaceMesh, Results } from "@mediapipe/face_mesh";
import type { Point } from "./geometry";
let instance: Promise<FaceMesh> | undefined;
function getDetector() {
  if (!instance)
    instance = new Promise<FaceMesh>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/mediapipe/face_mesh.js";
      script.onload = async () => {
        try {
          const Ctor = (
            window as unknown as {
              FaceMesh: new (config: {
                locateFile: (file: string) => string;
              }) => FaceMesh;
            }
          ).FaceMesh;
          const mesh = new Ctor({ locateFile: (file) => `/mediapipe/${file}` });
          mesh.setOptions({
            maxNumFaces: 5,
            refineLandmarks: false,
            minDetectionConfidence: 0.45,
            minTrackingConfidence: 0.5,
            selfieMode: false,
          });
          await mesh.initialize();
          resolve(mesh);
        } catch (e) {
          instance = undefined;
          reject(e);
        }
      };
      script.onerror = () => {
        instance = undefined;
        reject(new Error("Could not load face detection."));
      };
      document.head.appendChild(script);
    });
  return instance;
}
// MediaPipe owns one callback and one WASM graph. Serialize images so a rapid
// replacement cannot route an earlier result to the new photo's callback.
let queue: Promise<unknown> = Promise.resolve();
export function detect(image: HTMLImageElement): Promise<Point[][]> {
  const task = queue.then(async () => {
    const mesh = await getDetector();
    mesh.reset(); // Independent photographs must not reuse video tracking state.
    return new Promise<Point[][]>((resolve, reject) => {
      mesh.onResults((results: Results) => {
        const faces = (results.multiFaceLandmarks || []).filter((points) =>
          [33, 263, 10, 152, 234, 454].every(
            (i) =>
              points[i] &&
              Number.isFinite(points[i].x) &&
              Number.isFinite(points[i].y),
          ),
        );
        resolve(faces);
      });
      mesh.send({ image }).catch(reject);
    });
  });
  queue = task.catch(() => undefined);
  return task;
}
