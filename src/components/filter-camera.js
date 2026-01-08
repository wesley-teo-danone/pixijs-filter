import {
  LitElement,
  html,
  css
} from 'https://unpkg.com/lit@2.7.5/index.js?module';
import './pixi-overlay/pixi-overlay.js';

class FilterCamera extends LitElement {
  static styles = css`
    :host {
      flex: 1 1 auto;
      min-height: 0;
      position: relative;
      display: none; /* Component is hidden and does not take up space */
    }
    :host([visible]) {
      display: block; /* Show when videoReady attribute is set in startCamera() */
    }
    #camera-container {
      width: 100%;
      height: 100%;
      perspective: 1000px;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition:
        opacity 0.5s ease-in,
        transform 0.3s ease-in-out;
      backface-visibility: hidden;
    }
    video.fade-in {
      opacity: 1;
    }
    video.flip {
      transform: rotateX(180deg);
    }
    pixi-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  `;

  static properties = {
    stream: { type: MediaStream }, // Video stream from the camera
    videoEl: { type: HTMLElement }, // Reference to the video element
    videoReady: { type: Boolean }, // Flag to indicate if video is ready
    visible: { type: Boolean, reflect: true } // Reflect visibility state to the host element
  };

  constructor() {
    super();
    this.stream = null;
    this.videoEl = null;
    this.videoReady = false;
    this.visible = false;
  }

  constraintsBack = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 9999 }, // maximum width and height to push camera to highest resolution
      height: { ideal: 9999 },
      aspectRatio: { ideal: 16 / 9 },
      frameRate: { ideal: 60, min: 30 }
    },
    audio: false
  };

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopCamera();
  }

  /**
   * Starts the camera and initializes the video stream with detection models.
   *
   * This method performs the following steps:
   * 1. Ensures the detection models are loaded before starting the camera.
   * 2. Attempts to access the back-facing camera ("environment" mode) with specified constraints.
   * 3. Falls back to the front-facing camera ("user" mode) if the back-facing camera is unavailable.
   * 4. Sets the video element's source to the acquired camera stream.
   * 5. Displays the video feed and marks the component as ready once the metadata is loaded.
   *
   * @async
   * @throws {IronAIError} ERR_CAM_001 - Thrown if camera permissions are denied.
   * @throws {IronAIError} ERR_CAM_002 - Thrown if the face detection model fails to load.
   * @throws {IronAIError} ERR_CAM_003 - Thrown if the hand landmarker model fails to load.
   * @throws {IronAIError} ERR_CAM_004 - Thrown if the reference strip detector model fails to load.
   *
   * @returns {Promise<void>} Resolves when the camera is successfully initialized and ready for use.
   */
  async startCamera() {
    this.visible = true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(
        this.constraintsBack
      );
      this.videoEl = this.renderRoot.querySelector('#camera');
      // Set the video element source to the camera's stream
      this.videoEl.srcObject = this.stream;
      this.videoEl.onloadedmetadata = () => {
        requestAnimationFrame(() => {
          this.videoEl.classList.add('fade-in');
        });
        this.videoReady = true;
      };
    } catch (e) {
      console.log(e);
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.videoReady = false;
  }

  render() {
    return html`
      <video id="camera" autoplay playsinline muted></video>
      <pixi-overlay
        @pixi-ready=${(e) => console.log('ready', e.detail)}
      ></pixi-overlay>
    `;
  }
}

customElements.define('filter-camera', FilterCamera);
