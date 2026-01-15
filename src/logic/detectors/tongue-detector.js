import { BaseDetector } from './base-detector.js';
import { detectionModels } from '../models/detection-models.js';

const gapRatioTH = 0.25; // lip-gap / mouth-width threshold
const tongueHoldMinFrames = 20; // frames to hold before success
const innerLipIds = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324];
class TongueDetector extends BaseDetector {
  constructor() {
    super(10, 'tongue');
    this._faceDetectorModel = detectionModels.getFaceLandmarker();
    this.tongueFrameCount = 0; // count frames with tongue out
  }

  crop(landmarks, margin = 10) {
    if (!landmarks) return null;
    /* indices outlining lips + chin line */
    const MOUTH_IDX = [
      61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 61, 146, 91, 181, 84, 17,
      314, 405, 321, 375, 291, 0, 17, 13, 14, 152, 175, 199, 200, 18,
    ];

    const w = this.videoEl.videoWidth;
    const h = this.videoEl.videoHeight;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    MOUTH_IDX.forEach((i) => {
      const pt = landmarks[i];
      if (!pt) return;
      const x = pt.x * w,
        y = pt.y * h;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const side = Math.max(maxX - minX, maxY - minY) + margin * 2;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    let sx = Math.round(cx - side / 2);
    let sy = Math.round(cy - side / 2);

    sx = Math.max(0, Math.min(sx, w - side));
    sy = Math.max(0, Math.min(sy, h - side));

    //return crop dimensions
    return [{ x: sx, y: sy, w: side, h: side }];
  }

  predict(videoEl, now) {
    let valid = false;
    let faceLandmarks = null;
    const faceResults = this._faceDetectorModel.detectForVideo(videoEl, now);
    if (faceResults.faceLandmarks?.length) {
      for (const L of faceResults.faceLandmarks) {
        faceLandmarks = L;
        const mouthWidth = Math.hypot(L[61].x - L[291].x, L[61].y - L[291].y);
        const lipGap = Math.hypot(L[13].x - L[14].x, L[13].y - L[14].y);
        const gapRatio = lipGap / mouthWidth;

        this.tongueFrameCount =
          gapRatio > gapRatioTH ? this.tongueFrameCount + 1 : 0;

        if (this.tongueFrameCount >= tongueHoldMinFrames) {
          valid = true;
          console.log('Tongue detected');
          break;
        }
      }
    }
    return { faceLandmarks, valid };
  }
}

export { TongueDetector };
