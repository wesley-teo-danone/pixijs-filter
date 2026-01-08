// detection-controller.js
import { detectionModels } from '../../logic/models/detection-models.js';
export class DetectionController {
  constructor({ detectEveryMs = 33 } = {}) {
    this.faceLandmarkerModel = detectionModels.getFaceLandmarker();
    this.handLandmarkerModel = detectionModels.getHandLandmarker();
    this.detectEveryMs = detectEveryMs;
    this._lastDetect = 0;
    this._latest = null;
  }

  detect(videoEl, nowMs) {
    if (!videoEl || videoEl.readyState < 2) return; // wait for current frame
    if (nowMs - this._lastDetect < this.detectEveryMs) return;

    this._lastDetect = nowMs;

    const result = this.faceLandmarkerModel.detectForVideo(videoEl, nowMs);
    this._latest = result?.faceLandmarks?.[0] ?? null;
  }

  getLatest() {
    return this._latest;
  }
}
