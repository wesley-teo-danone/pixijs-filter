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

  detect(videoEl, nowMs, { face = false, hands = false } = {}) {
    if (!videoEl || videoEl.readyState < 2) return; // wait for current frame
    if (nowMs - this._lastDetect < this.detectEveryMs) return;
    this._lastDetect = nowMs;
    console.log('hands', hands, 'face', face);
    const faceResult = face
      ? this.faceLandmarkerModel.detectForVideo(videoEl, nowMs)
      : null;
    const handResult = hands
      ? this.handLandmarkerModel.detectForVideo(videoEl, nowMs)
      : null;
    this._latest = {
      face: faceResult?.faceLandmarks?.[0] ?? null,
      faces: faceResult?.faceLandmarks ?? [],
      faceBlendShapes: faceResult?.faceBlendShapes ?? [],
      hands: handResult?.landmarks ?? [],
      handedness: handResult?.handedness ?? [],
      timestamp: nowMs
    };
    return this._latest;
  }

  getLatest() {
    return this._latest;
  }
}
