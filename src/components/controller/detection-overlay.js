import { DrawingUtils } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304';
import * as litcontext from 'https://esm.run/@lit/context';
import {
  LitElement,
  html,
  css
} from 'https://unpkg.com/lit@2.7.5/index.js?module';

import './incomplete-results-dialog.js';
import './ironai-toolbar.js';
import './processing-overlay.js';
import './introduction-overlay.js';
import './toggle-camera-button.js';
import './detector-instructions.js';
import './results-overlay.js';
import { CAPTURE_SEQUENCE } from '../constants.js';
import { LowerEyelidDetector } from '../logic/detectors/lower-eyelid-detector.js';
import { LowerLipDetector } from '../logic/detectors/lower-lip-detector.js';
import { NailDetector } from '../logic/detectors/nail-detector.js';
import { ReferenceStripDetector } from '../logic/detectors/reference-strip-detector.js';
import { TongueDetector } from '../logic/detectors/tongue-detector.js';
import { IronAIWrapper } from '../logic/ironai-wrapper.js';
import { finishedDetectionsContext } from '../utils/context.js';
import { setScale, scale } from '../utils/scale-utils.js';

class CameraOverlay extends LitElement {
  static styles = css`
    .wrapper {
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      align-items: center;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
    introduction-overlay {
      position: absolute;
      width: 100%;
      height: 100%;
    }
    results-overlay {
      position: absolute;
      width: 100%;
      height: 100%;
    }
    .dark-overlay {
      position: absolute;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
    }
    .camera-overlay {
      height: 60%;
      width: 80%;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      border: 2px solid white;
      border-radius: 12px;
    }

    .skip-button::part(base) {
      font-family: 'Rethink Sans', sans-serif;
      font-weight: 500;
      font-size: 1rem;
      text-align: center;
      color: #ffffff;
    }
    .skip-button-container {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      padding-top: 1rem;
      padding-right: 1rem;
    }
  `;
  static properties = {
    videoEl: { type: HTMLElement },
    canvasCtx: { type: Object }, // Context for the canvas used for drawing detections
    drawingUtils: { type: Object }, // Utility for drawing on the canvas
    _isDetectionActive: { type: Boolean }, // Flag to control detection loop
    _processingOverlayOpen: { type: Boolean },
    _resultsOverlayOpen: { type: Boolean },
    snapshots: { type: Array }, // Array to hold captured snapshots for each feature
    currentDetector: { type: Object }, // Current active detector
    framesToCapture: { type: Number }
  };

  constructor() {
    super();
    this.canvasCtx = null;
    this.drawingUtils = null;
    this.detectionLoop = this.detectionLoop.bind(this); // Binds detectionLoop method to current instance.
    this.adjustCanvasSize = this.adjustCanvasSize.bind(this);
    this._isDetectionActive = false;
    this.framesToCapture = 0;
    this.snapshots = {
      eye: [],
      tongue: [],
      lip: [],
      nail: []
    };
    this._processingOverlayOpen = false;
    this._resultsOverlayOpen = false;
    this.currentDetector = null;
    this._finishedDetectionsContextProvider = new litcontext.ContextProvider(
      this,
      finishedDetectionsContext,
      { finishedDetections: new Set(), skip: false }
    );
    // Throttle control: how often to run heavy work (ms)
    this.detectionIntervalMs = 100; // change this value to control frequency (e.g. 100, 250, 500)
    this._lastPredictionTime = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('resize', this.adjustCanvasSize);
    this.guest = this.getRootNode().host.guest;
    this.base_api_url = this.getRootNode().host.base_api_url;
    this.dapm_key = this.getRootNode().host.dapm_key;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.adjustCanvasSize);
    this.stopDetectionLoop(); // Stops any active detection loops
  }
  firstUpdated() {
    const canvas = this.renderRoot.querySelector('canvas');
    this.canvasCtx = canvas.getContext('2d');
    this.drawingUtils = new DrawingUtils(this.canvasCtx);
    this.nailDetector = new NailDetector(
      this.videoEl,
      this.canvasCtx,
      this.drawingUtils
    );
    this.tongueDetector = new TongueDetector(this.videoEl, this.canvasCtx);
    this.lowerLipDetector = new LowerLipDetector(this.videoEl, this.canvasCtx);
    this.lowerEyeLidDetector = new LowerEyelidDetector(
      this.videoEl,
      this.canvasCtx,
      this.drawingUtils
    );
    this.referenceStripDetector = new ReferenceStripDetector(
      this.videoEl,
      this.canvasCtx,
      this.drawingUtils
    );
    this.detectorMap = {
      nail: this.nailDetector,
      tongue: this.tongueDetector,
      lip: this.lowerLipDetector,
      eye: this.lowerEyeLidDetector
    };
    this.adjustCanvasSize();
  }

  adjustCanvasSize() {
    const canvas = this.renderRoot.querySelector('canvas');
    this.canvasCtx = canvas.getContext('2d');
    this.drawingUtils = new DrawingUtils(this.canvasCtx);
    setScale(canvas, this.videoEl);
  }

  //Handle detection starts the countdown, and crops and shows the overlay.
  processDetectionResult(landmarks) {
    console.log(landmarks ? true : false);
    if (landmarks) {
      this.currentLandmarks = landmarks;
      // Crop and show overlay for the current detector
      // const crop = await this.currentDetector.crop(landmarks);
      // if (crop) {
      //   this.showCaptureOverlay(crop);
      this.framesToCapture = this.currentDetector.getFramesRequired();
      const updatedFinishedDetections =
        this._finishedDetectionsContextProvider.value.finishedDetections.add(
          this.currentDetector.getId()
        );
      this._finishedDetectionsContextProvider.setValue({
        finishedDetections: new Set(updatedFinishedDetections),
        retake: false
      });
    }
  }

  detectionLoop() {
    this.canvasCtx.clearRect(
      0,
      0,
      this.canvasCtx.canvas.width,
      this.canvasCtx.canvas.height
    );
    if (this._isDetectionActive == false) {
      return;
    }

    requestAnimationFrame(this.detectionLoop);
    const now = performance.now();
    // Always run reference strip detection in the background. Shows overlay internally
    // const referenceStripBbox = this.referenceStripDetector.predict();

    // If frames to capture is set, capture frames for the current detector
    if (this.framesToCapture > 0) {
      console.log('Capturing frame number: ', this.framesToCapture);
      // let referenceStripCanvas = null;
      // if (referenceStripBbox) {
      //   const { x, y, w, h } = referenceStripBbox;
      //   referenceStripCanvas = document.createElement("canvas");
      //   referenceStripCanvas.width = w;
      //   referenceStripCanvas.height = h;
      //   const referenceStripCtx = referenceStripCanvas.getContext("2d");

      //   referenceStripCtx.drawImage(
      //     this.videoEl,
      //     x,
      //     y,
      //     w,
      //     h, // Source region (scaled to match the video source dimensions)
      //     0,
      //     0,
      //     w,
      //     h // Destination region (remains in client dimensions)
      //   );
      // }
      //Crop the frames based on the current detector
      const frames = this.currentDetector.crop(this.currentLandmarks);

      // Create a canvas for each frame and push to snapshots
      for (const frame of frames) {
        const { x, y, w, h } = frame;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(this.videoEl, x, y, w, h, 0, 0, w, h);
        // if (referenceStripCanvas) {
        //   this.snapshots[this.currentDetector.getId()].push({
        //     canvas,
        //     referenceStripCanvas,
        //     timestamp: Date.now()
        //   });
        // } else {
        this.snapshots[this.currentDetector.getId()].push({
          canvas,
          timestamp: Date.now()
        });
        // }
      }
      this.framesToCapture--;
      if (this.framesToCapture === 0) {
        this.showResultsOverlay();
        this._isDetectionActive = false;
      }
      // update lastPredictionTime so immediate subsequent logic is aware
      this._lastPredictionTime = now;
      return;
    }

    // Throttle predictions to detectionIntervalMs
    if (now - (this._lastPredictionTime || 0) < this.detectionIntervalMs) {
      return;
    }

    this._lastPredictionTime = now;
    // If capture frames is not requested, continue with the detection
    const landmarks = this.currentDetector.predict();
    this.processDetectionResult(landmarks);
  }

  startDetectionLoop() {
    if (this.currentDetector != null) {
      this._isDetectionActive = true;
      this.detectionLoop();
    }
  }

  stopDetectionLoop() {
    this._isDetectionActive = false;
  }

  async onStartDetection(e) {
    this.stopDetectionLoop(); // Ensure any previous loop is stopped
    // Wait one animation frame to ensure loop has stopped
    await new Promise((resolve) => requestAnimationFrame(resolve));
    this.currentDetector = this.detectorMap[e.detail.detector];
    console.log('Starting detection for:', this.currentDetector);
    this.startDetectionLoop();
  }

  // showCaptureOverlay(boxes) {
  //   boxes.forEach((b) => {
  //     // Coordinates are normalised to the canvas size

  //     const { x, y, w, h } = b;
  //     this.canvasCtx.save();
  //     this.canvasCtx.strokeStyle = "#00FF00";
  //     // this.canvasCtx.lineWidth = 2;
  //     this.canvasCtx.strokeRect(x, y, w, h);
  //     this.canvasCtx.restore();
  //   });
  // }

  showProcessingOverlay() {
    this._processingOverlayOpen = true;
  }
  hideProcessingOverlay() {
    this._processingOverlayOpen = false;
  }

  onShowResults() {
    this.hideResultsOverlay();
    this.processSnapshots();
  }
  showResultsOverlay() {
    this._resultsOverlayOpen = true;
  }
  hideResultsOverlay() {
    this._resultsOverlayOpen = false;
  }

  onIntroductionComplete() {
    this.currentDetector = this.detectorMap[CAPTURE_SEQUENCE[0]];
  }

  onSkipDetection() {
    const currentIndex = CAPTURE_SEQUENCE.indexOf(this.currentDetector.getId());
    // Not the final detector
    if (currentIndex + 1 < CAPTURE_SEQUENCE.length) {
      for (let i = currentIndex + 1; i < CAPTURE_SEQUENCE.length; i++) {
        const name = CAPTURE_SEQUENCE[i];
        if (
          this._finishedDetectionsContextProvider.value.finishedDetections.has(
            name
          )
        ) {
          continue;
        }
        this.currentDetector = this.detectorMap[CAPTURE_SEQUENCE[i]];
        console.log('Skipping to next detector:', this.currentDetector);
        break;
      }
    } else if (
      this._finishedDetectionsContextProvider.value.finishedDetections.size > 0
    ) {
      this.processSnapshots();
    } else {
      this.renderRoot.querySelector('incomplete-results-dialog').show();
    }
  }

  onRetakeDetection() {
    // Clear the snapshots for the current detector
    if (this.currentDetector) {
      const detectorId = this.currentDetector.getId();
      if (this.snapshots[detectorId]) {
        this.snapshots[detectorId] = []; // Clear the snapshots array
      }

      setTimeout(() => {
        this.startDetectionLoop();
      }, 2000);
    }
    // Remove detector from finished detections context
    const updatedFinishedDetections =
      this._finishedDetectionsContextProvider.value.finishedDetections;
    updatedFinishedDetections.delete(this.currentDetector.getId());
    this._finishedDetectionsContextProvider.setValue({
      finishedDetections: new Set(updatedFinishedDetections),
      retake: true
    });
    console.log('onretakeDetection called');
    this.hideResultsOverlay();
    // Reset the detection state
    this._isDetectionActive = true;
  }
  render() {
    return html`
      <div class="wrapper">
        <div
          class="skip-button-container"
          style="visibility: ${this._isDetectionActive ? 'visible' : 'hidden'};"
        >
          <sl-button
            variant="text"
            size="small"
            class="skip-button"
            @click=${this.onSkipDetection}
            ><strong>Skip</strong></sl-button
          >
        </div>
        <ironai-toolbar
          @start-detection=${(e) => this.onStartDetection(e)}
          style="visibility: ${this._isDetectionActive ? 'visible' : 'hidden'};"
          .currentDetector=${this.currentDetector?.getId()}
        ></ironai-toolbar>
        <detector-instructions
          style="visibility: ${this._isDetectionActive ? 'visible' : 'hidden'};"
          .detectorId=${this._isDetectionActive
            ? this.currentDetector?.getId()
            : null}
        ></detector-instructions>
        <canvas
          class="camera-overlay"
          style="visibility: ${this._isDetectionActive ? 'visible' : 'hidden'};"
        ></canvas>
        <toggle-camera-button
          style="visibility: ${this._isDetectionActive ? 'visible' : 'hidden'};"
        ></toggle-camera-button>

        <div
          class="dark-overlay"
          style="display: ${this._isDetectionActive ? 'none' : 'block'};"
        ></div>
        <introduction-overlay
          @introduction-complete=${this.onIntroductionComplete}
        ></introduction-overlay>
        ${this._resultsOverlayOpen
          ? html`<results-overlay
              .detectorId=${this.currentDetector.getId()}
              .crop=${this.snapshots[this.currentDetector.getId()][0].canvas}
              @retake-detection=${this.onRetakeDetection}
              @show-results=${this.onShowResults}
              @next-detection=${(e) => {
                this.currentDetector = e.detail.detector
                  ? this.detectorMap[e.detail.detector]
                  : null;
                this.hideResultsOverlay();
              }}
            ></results-overlay>`
          : null}
        <processing-overlay
          .open=${this._processingOverlayOpen}
        ></processing-overlay>
        <incomplete-results-dialog></incomplete-results-dialog>
      </div>
    `;
  }

  async processSnapshots() {
    this._isDetectionActive = false;
    this.showProcessingOverlay();
    const ironAIWrapper = new IronAIWrapper(
      this.dapm_key,
      this.guest,
      this.base_api_url
    );
    const childProfile = localStorage.getItem('childProfile');

    try {
      const res = await ironAIWrapper.callIronAI(childProfile, this.snapshots);

      // For testing to visualize cropped regions
      const snapshotsFirstCanvas = Object.fromEntries(
        Object.entries(this.snapshots).map(([region, arr]) => [
          region,
          {
            base64Url:
              arr && arr.length > 0 && arr[0].canvas
                ? arr[0].canvas.toDataURL('image/png')
                : null,
            referenceStripBase64Url:
              arr && arr.length > 0 && arr[0].referenceStripCanvas
                ? arr[0].referenceStripCanvas.toDataURL('image/png')
                : null
          }
        ])
      );

      this.dispatchEvent(
        new CustomEvent('process-snapshots', {
          detail: {
            results: res,
            snapshots: snapshotsFirstCanvas
          },
          bubbles: true,
          composed: true
        })
      );
    } catch (error) {
      console.error('Error processing snapshots:', error);
      alert('An error occurred while processing the images. Please try again.');
      for (const key of Object.keys(this.snapshots)) {
        this.snapshots[key] = [];
      }
      this._finishedDetectionsContextProvider.setValue({
        finishedDetections: new Set(),
        retake: false
      });
      this.currentDetector = this.detectorMap[CAPTURE_SEQUENCE[0]];
    } finally {
      this.hideProcessingOverlay();
    }
  }
}
customElements.define('detection-controller', DetectionController);
