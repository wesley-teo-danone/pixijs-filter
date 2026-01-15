// detection-controller.js
import { LowerEyelidDetector } from '../../logic/detectors/lower-eyelid-detector.js';
import { LowerLipDetector } from '../../logic/detectors/lower-lip-detector.js';
import { NailDetector } from '../../logic/detectors/nail-detector.js';
import { TongueDetector } from '../../logic/detectors/tongue-detector.js';
import { detectionModels } from '../../logic/models/detection-models.js';
import { detectorStore } from '../../logic/state/detector-store.js';
export class DetectionController {
  constructor({ videoEl, detectEveryMs = 33 } = {}) {
    this.videoEl = videoEl;
    this.detectEveryMs = detectEveryMs;
    this.faceLandmarkerModel = detectionModels.getFaceLandmarker();
    this.handLandmarkerModel = detectionModels.getHandLandmarker();
    this.eyeDetector = new LowerEyelidDetector();
    this.tongueDetector = new TongueDetector();
    this.nailDetector = new NailDetector();
    this.lipDetector = new LowerLipDetector();
    this.detectorMap = {
      eye: this.eyeDetector,
      tongue: this.tongueDetector,
      nail: this.nailDetector,
      lip: this.lipDetector,
    };
    this._lastDetect = 0;
    this._latest = null;
  }
  detect(nowMs) {
    if (
      this.videoEl.readyState < 2 ||
      nowMs - this._lastDetect < this.detectEveryMs
    )
      return; // wait for current frame
    this._lastDetect = nowMs;
    const currentDetector = detectorStore.getSnapshot().currentDetector.id;
    const landmarks = this.detectorMap[currentDetector].predict(
      this.videoEl,
      nowMs,
    );
    this._latest = {
      faceLandmarks: landmarks?.faceLandmarks ?? null,
      handLandmarks: landmarks?.handLandmarks ?? null,
      eyeside: landmarks?.eyeside ?? null,
      valid: landmarks?.valid ?? false,
      timestamp: nowMs,
    };
    return this._latest;
  }

  getLatest() {
    return this._latest;
  }
}
