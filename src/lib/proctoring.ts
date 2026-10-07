/**
 * Disha AI Proctoring Engine v3
 * Uses MediaPipe Face Mesh (via CDN) for:
 *  - Precise eye/gaze tracking → "looking outside screen"
 *  - Head pose estimation → looking left/right/up/down
 *  - Multiple face detection → unauthorized helper
 *
 * Uses COCO-SSD (via CDN) for:
 *  - Phone / cell-phone object detection
 *  - Unauthorized devices
 *
 * Canvas-based brightness scan → fallback phone screen detector
 *
 * All models load lazily from CDN on first interview start.
 * No npm packages required.
 */

export interface DetectedObject {
  bbox: [number, number, number, number];
  class: string;
  score: number;
  label: string;
  type: "phone" | "person" | "multiple_persons" | "unauthorized_item" | "face";
}

export interface ProctoringAnalysis {
  faceStatus: "detected" | "away" | "missing" | "initializing";
  lookingDirection: "center" | "left" | "right" | "up" | "down" | "missing";
  phoneDetected: boolean;
  multiplePersonsDetected: boolean;
  detectedObjects: DetectedObject[];
  threatLevel: "normal" | "warning" | "danger";
  summary: string;
}

/* ─── CDN Script Loader ─── */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") { resolve(); return; }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });
}

/* ─── Model Singletons ─── */
let cocoModel: any = null;
let facemeshModel: any = null;
let modelsLoading = false;
let modelsLoaded = false;

export async function loadProctoringModels(): Promise<void> {
  if (modelsLoaded || modelsLoading) return;
  modelsLoading = true;

  try {
    const w = window as any;

    // 1. Load TensorFlow.js
    if (!w.tf) {
      await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
      // wait for TF to initialize
      await new Promise(r => setTimeout(r, 300));
    }

    // 2. Load COCO-SSD (phone/object detection)
    if (!w.cocoSsd) {
      await loadScript(
        "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js"
      );
    }
    if (w.cocoSsd && !cocoModel) {
      cocoModel = await w.cocoSsd.load({ base: "mobilenet_v2" });
      console.log("[Proctor] COCO-SSD loaded ✓");
    }

    // 3. Load MediaPipe FaceMesh
    if (!w.facemesh) {
      await loadScript(
        "https://cdn.jsdelivr.net/npm/@tensorflow-models/face-landmarks-detection@1.0.6/dist/face-landmarks-detection.js"
      );
    }
    if (w.faceLandmarksDetection && !facemeshModel) {
      facemeshModel = await w.faceLandmarksDetection.createDetector(
        w.faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: "tfjs",
          refineLandmarks: true,
          maxFaces: 2,
        }
      );
      console.log("[Proctor] FaceMesh loaded ✓");
    }

    modelsLoaded = true;
  } catch (err) {
    console.warn("[Proctor] Model load warning (will use fallbacks):", err);
  } finally {
    modelsLoading = false;
  }
}

// Expose for warm-up
export function getObjectDetectionModel(): Promise<any> {
  return loadProctoringModels().then(() => cocoModel);
}

/* ─── Canvas Fallback Helpers ─── */
let _canvas: HTMLCanvasElement | null = null;
function getCanvas(): HTMLCanvasElement {
  if (!_canvas && typeof document !== "undefined") {
    _canvas = document.createElement("canvas");
    _canvas.width = 320;
    _canvas.height = 240;
  }
  return _canvas!;
}

/**
 * Canvas-based phone screen brightness heuristic.
 * Looks for a rectangular region significantly brighter and more
 * saturated than the surrounding area – characteristic of a lit phone screen.
 */
function detectPhoneScreenHeuristic(video: HTMLVideoElement): boolean {
  try {
    const canvas = getCanvas();
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Scan 8x6 blocks for "very bright saturated rectangle" (lit phone screen)
    const bW = Math.floor(width / 8);
    const bH = Math.floor(height / 6);
    let brightBlockCount = 0;

    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 8; col++) {
        let totalBrightness = 0;
        let totalSaturation = 0;
        let pixelCount = 0;

        for (let py = row * bH; py < (row + 1) * bH; py++) {
          for (let px = col * bW; px < (col + 1) * bW; px++) {
            const idx = (py * width + px) * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            totalBrightness += brightness;
            totalSaturation += saturation;
            pixelCount++;
          }
        }

        const avgBright = totalBrightness / pixelCount;
        const avgSat = totalSaturation / pixelCount;

        // A phone screen is typically very bright (>200) and moderately saturated
        if (avgBright > 200 && avgSat > 0.1) {
          brightBlockCount++;
        }
      }
    }

    // 4–18 bright blocks = phone screen size range (not the entire background)
    return brightBlockCount >= 4 && brightBlockCount <= 20;
  } catch {
    return false;
  }
}

/**
 * Canvas-based face presence & center estimation.
 * Uses YCbCr skin segmentation for broader skin tone coverage.
 */
function detectFaceHeuristic(video: HTMLVideoElement): { found: boolean; cx: number; cy: number; vW: number; vH: number } {
  const vW = video.videoWidth || 640;
  const vH = video.videoHeight || 480;
  try {
    const canvas = getCanvas();
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { found: false, cx: vW / 2, cy: vH / 2, vW, vH };

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let skinCount = 0;
    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < data.length; i += 8) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // YCbCr skin segmentation (more robust than RGB heuristic)
      const Y  =  0.299 * r + 0.587 * g + 0.114 * b;
      const Cb = -0.169 * r - 0.331 * g + 0.500 * b + 128;
      const Cr =  0.500 * r - 0.419 * g - 0.081 * b + 128;

      if (Y > 80 && Cb >= 77 && Cb <= 127 && Cr >= 133 && Cr <= 173) {
        const pixelIdx = (i / 4);
        const px = pixelIdx % width;
        const py = Math.floor(pixelIdx / width);
        skinCount++;
        sumX += px;
        sumY += py;
      }
    }

    if (skinCount > 60) {
      const cx = (sumX / skinCount) * (vW / canvas.width);
      const cy = (sumY / skinCount) * (vH / canvas.height);
      return { found: true, cx, cy, vW, vH };
    }
  } catch {/* ignore */}

  return { found: false, cx: vW / 2, cy: vH / 2, vW, vH };
}

/* ─── Gaze direction from FaceMesh landmarks ─── */
// Key landmark indices for MediaPipe FaceMesh 468 points:
// Left eye: 33, 133, 160, 159, 158, 144, 153, 145
// Right eye: 362, 263, 387, 386, 385, 373, 380, 374
// Left iris: 468 (refined), Right iris: 473 (refined)
// Nose tip: 1, Chin: 152, Left cheek: 234, Right cheek: 454

function computeGazeFromLandmarks(
  keypoints: Array<{ x: number; y: number; z?: number }>,
  vW: number,
  vH: number
): { direction: "center" | "left" | "right" | "up" | "down" } {

  try {
    if (keypoints.length < 200) return { direction: "center" };

    // Nose tip (landmark 1) — used as face-center anchor
    const nose = keypoints[1];
    // Left eye outer corner (33), right eye outer corner (263)
    const leftEyeOuter  = keypoints[33];
    const rightEyeOuter = keypoints[263];
    // Chin (152), forehead (10)
    const chin     = keypoints[152];
    const forehead = keypoints[10];

    if (!nose || !leftEyeOuter || !rightEyeOuter || !chin || !forehead) {
      return { direction: "center" };
    }

    // Normalize to [0,1]
    const nx  = nose.x / vW;
    const ny  = nose.y / vH;

    // Horizontal deviation: nose should be between eye centers
    const eyeCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2 / vW;
    const eyeCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2 / vH;

    // Face vertical center (nose to chin midpoint relative to forehead)
    const vertMid = (forehead.y + chin.y) / 2 / vH;

    // Check if eyes are too far left/right/up/down relative to whole face frame
    const horizDiff = nx - 0.5; // positive = face right in raw frame (= user looking left due to mirror)
    const vertDiff  = ny - 0.5;

    // Also check if the entire face center has drifted to an edge (user looking away)
    const faceEdge = nx < 0.15 || nx > 0.85 || ny < 0.10 || ny > 0.85;

    if (faceEdge || Math.abs(horizDiff) > 0.25) {
      return { direction: horizDiff < 0 ? "right" : "left" };
    }

    // Look up/down via nose Y position relative to eye-chin midpoint
    if (vertDiff < -0.18) return { direction: "up" };
    if (vertDiff >  0.22) return { direction: "down" };

    // Check eye-to-face-center offset for subtle gaze (iris landmarks if available)
    const leftIris  = keypoints[468];
    const rightIris = keypoints[473];
    if (leftIris && rightIris) {
      const irisCenter = (leftIris.x + rightIris.x) / 2 / vW;
      const irisDiff = irisCenter - eyeCenterX;
      // Note: video is mirrored, so right gaze shows as left iris shift
      if (irisDiff < -0.045) return { direction: "left" };
      if (irisDiff >  0.045) return { direction: "right" };

      const irisY = (leftIris.y + rightIris.y) / 2 / vH;
      const irisYDiff = irisY - eyeCenterY;
      if (irisYDiff > 0.035) return { direction: "down" };
      if (irisYDiff < -0.030) return { direction: "up" };
    }

    return { direction: "center" };
  } catch {
    return { direction: "center" };
  }
}

/* ─── Main Frame Analyzer ─── */
export async function analyzeVideoFrame(
  video: HTMLVideoElement,
  _modelUnused: any,      // kept for API compat
  _canvasUnused: HTMLCanvasElement | null
): Promise<ProctoringAnalysis> {

  const result: ProctoringAnalysis = {
    faceStatus: "initializing",
    lookingDirection: "center",
    phoneDetected: false,
    multiplePersonsDetected: false,
    detectedObjects: [],
    threatLevel: "normal",
    summary: "Proctoring active",
  };

  if (!video || video.readyState < 2 || video.videoWidth === 0) {
    return result;
  }

  const vW = video.videoWidth || 640;
  const vH = video.videoHeight || 480;

  /* ── STEP 1: Object Detection (phone / multiple people) ── */
  if (cocoModel) {
    try {
      const preds: any[] = await cocoModel.detect(video);
      let personCount = 0;

      for (const p of preds) {
        const cls   = (p.class as string).toLowerCase();
        const score = p.score as number;
        const [x, y, w, h] = p.bbox as number[];

        if (score < 0.35) continue;

        if (cls === "cell phone" || cls === "remote") {
          result.phoneDetected = true;
          result.detectedObjects.push({
            bbox: [x, y, w, h],
            class: p.class,
            score,
            label: `PHONE (${Math.round(score * 100)}%)`,
            type: "phone",
          });
        } else if (cls === "person") {
          personCount++;
          result.detectedObjects.push({
            bbox: [x, y, w, h],
            class: p.class,
            score,
            label: personCount === 1 ? "You" : "EXTRA PERSON",
            type: personCount === 1 ? "person" : "multiple_persons",
          });
        } else if (["laptop", "tablet"].includes(cls)) {
          result.detectedObjects.push({
            bbox: [x, y, w, h],
            class: p.class,
            score,
            label: `DEVICE: ${p.class}`,
            type: "unauthorized_item",
          });
        }
      }

      if (personCount > 1) result.multiplePersonsDetected = true;
    } catch (e) {
      console.warn("[Proctor] COCO detect error:", e);
    }
  }

  /* ── STEP 1b: Canvas phone-screen heuristic (always runs as backup) ── */
  if (!result.phoneDetected) {
    const phoneLikeScreen = detectPhoneScreenHeuristic(video);
    if (phoneLikeScreen) {
      result.phoneDetected = true;
      result.detectedObjects.push({
        bbox: [0, 0, vW * 0.3, vH * 0.5],
        class: "phone_screen",
        score: 0.7,
        label: "PHONE SCREEN DETECTED",
        type: "phone",
      });
    }
  }

  /* ── STEP 2: FaceMesh gaze & presence detection ── */
  let faceFound  = false;
  let faceDirection: "center" | "left" | "right" | "up" | "down" = "center";
  let faceCount  = 0;

  if (facemeshModel) {
    try {
      const faces: any[] = await facemeshModel.estimateFaces(video);
      faceCount = faces.length;

      if (faceCount === 0) {
        faceFound = false;
      } else {
        faceFound = true;
        const face = faces[0];
        const kps: Array<{ x: number; y: number; z?: number }> = face.keypoints ?? face.scaledMesh ?? [];

        if (kps.length > 0) {
          const { direction } = computeGazeFromLandmarks(kps, vW, vH);
          faceDirection = direction;

          // Show face bounding box
          if (face.box) {
            result.detectedObjects.push({
              bbox: [face.box.xMin, face.box.yMin, face.box.width, face.box.height],
              class: "face",
              score: 1.0,
              label: "Face ✓",
              type: "face",
            });
          }
        }

        if (faceCount > 1) result.multiplePersonsDetected = true;
      }
    } catch (e) {
      console.warn("[Proctor] FaceMesh error:", e);
    }
  }

  /* ── STEP 2b: Fallback heuristic face detection ── */
  if (!facemeshModel || !faceFound) {
    const h = detectFaceHeuristic(video);
    if (h.found) {
      faceFound = true;
      // Estimate direction from face centroid position
      const nx = h.cx / vW;
      const ny = h.cy / vH;

      if      (nx < 0.18) faceDirection = "right";  // mirrored
      else if (nx > 0.82) faceDirection = "left";
      else if (ny < 0.15) faceDirection = "up";
      else if (ny > 0.75) faceDirection = "down";
      else                faceDirection = "center";
    }
  }

  /* ── STEP 3: Populate face status ── */
  if (!faceFound) {
    result.faceStatus       = "missing";
    result.lookingDirection = "missing";
    result.summary          = "No face detected in camera frame";
  } else if (faceDirection !== "center") {
    result.faceStatus       = "away";
    result.lookingDirection = faceDirection;
    const dirLabel = {
      left:  "Looking LEFT (outside screen)",
      right: "Looking RIGHT (outside screen)",
      up:    "Looking UP (away from screen)",
      down:  "Looking DOWN (notes/phone/lap)",
    }[faceDirection] ?? "Looking away";
    result.summary = dirLabel;
  } else {
    result.faceStatus       = "detected";
    result.lookingDirection = "center";
    result.summary          = "Eyes on screen ✓";
  }

  /* ── STEP 4: Threat level ── */
  if (result.phoneDetected || result.multiplePersonsDetected) {
    result.threatLevel = "danger";
  } else if (result.faceStatus === "away" || result.faceStatus === "missing") {
    result.threatLevel = "warning";
  } else {
    result.threatLevel = "normal";
  }

  return result;
}
