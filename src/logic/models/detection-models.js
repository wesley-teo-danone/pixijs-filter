import {
  FilesetResolver,
  FaceLandmarker,
  HandLandmarker
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304';

class DetectionModels {
  visionInstance = null;
  faceLandmarker = null;
  handLandmarker = null;
  referenceStripDetector = null;
  isLoading = false;
  loadingPromise = null; // Promise to track the loading state

  async loadModels() {
    // Models already loaded
    if (
      this.handLandmarker &&
      this.faceLandmarker &&
      this.referenceStripDetector
    ) {
      return;
    }
    // If models are currently loading, return the existing promise
    if (this.isLoading) {
      return this.loadingPromise;
    }
    // If models are not loaded, start loading them
    this.isLoading = true;
    this.loadingPromise = this._loadModelsInternal()
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        this.isLoading = false;
      });
    return this.loadingPromise; // Return the loading promise
  }

  async _loadModelsInternal() {
    const referenceStripDetectorModelUrl = new URL(
      './iron_reference_strip_detection_V6.1.tflite',
      import.meta.url
    );
    const handLandmarkerModelUrl = new URL(
      './hand_landmarker.task',
      import.meta.url
    );
    const faceLandmarkerModelUrl = new URL(
      './face_landmarker.task',
      import.meta.url
    );

    // Load the MediaPipe Vision instance from a CDN (Not locally as node_modules not loaded into s3 bucket)
    this.visionInstance = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
    );

    const faceLandmarkerPromise = FaceLandmarker.createFromOptions(
      this.visionInstance,
      {
        baseOptions: {
          modelAssetPath: faceLandmarkerModelUrl
        },
        // outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      }
    )
      .then((landmarker) => {
        this.faceLandmarker = landmarker;
      })
      .catch(() => {
        throw ERR_CAM_002;
      });

    const handLandmarkerPromise = HandLandmarker.createFromOptions(
      this.visionInstance,
      {
        baseOptions: {
          modelAssetPath: handLandmarkerModelUrl
        },
        runningMode: 'VIDEO',
        numHands: 2
      }
    )
      .then((landmarker) => {
        this.handLandmarker = landmarker;
      })
      .catch(() => {
        throw ERR_CAM_003;
      });

    await Promise.all([faceLandmarkerPromise, handLandmarkerPromise]);
  }

  getFaceLandmarker() {
    if (!this.faceLandmarker) {
      throw ERR_CAM_002;
    }
    return this.faceLandmarker;
  }

  getHandLandmarker() {
    if (!this.handLandmarker) {
      throw ERR_CAM_003;
    }
    return this.handLandmarker;
  }
}

export const detectionModels = new DetectionModels();
