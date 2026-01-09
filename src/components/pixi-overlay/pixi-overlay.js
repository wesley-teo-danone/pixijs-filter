import { LitElement, html, css } from 'lit';
import { Application, Graphics, Assets, Container, Sprite } from 'pixi.js';
import { OverlayLayer } from './layers/overlay-layer.js';
import { UiLayer } from './layers/ui-layer.js';
import { DetectionController } from '../../components/controller/detection-controller.js';
import { addFiltersBundle } from '../../assets/assets.js';
import { detectorStore } from '../../logic/state/detector-store.js';

export class PixiOverlay extends LitElement {
  static properties = {
    videoEl: { type: HTMLElement },
    mirrored: { type: Boolean }
  };
  static styles = css`
    :host {
      position: absolute;
      inset: 0; /* fill parent */
      display: block;
    }

    #mount {
      position: absolute;
      inset: 0;
    }
  `;

  constructor() {
    super();
    this.mirrored = false;
    const { currentDetector, detectorStates } = detectorStore.getSnapshot();
    console.log('Initial detector store snapshot:', {
      currentDetector,
      detectorStates
    });
    // metaData of current detector
    this.currentDetectorMeta = currentDetector;
    // id of current detector
    this.currentDetectorId = currentDetector.id;
    // all detector states
    this.detectorStates = detectorStates;

    this._unsubscribeStore = detectorStore.subscribe((state) => {
      this.detectorStates = state.detectorStates;
      const nextId = state.currentDetector?.id ?? null;
      if (nextId !== this.currentDetectorId) {
        this.currentDetectorId = nextId;
        this.currentDetectorMeta = state.currentDetector ?? null;
        console.log('Detector changed to:', this.currentDetectorId);
      }
    });
  }

  async firstUpdated() {
    const mount = this.renderRoot.querySelector('#mount');

    this.app = new Application();

    await this.app.init({
      backgroundAlpha: 0,
      resizeTo: mount, // your overlay div
      antialias: true
    });
    // For Chrome devtools debugging
    globalThis.__PIXI_APP__ = this.app;
    // Load assets
    await addFiltersBundle();

    mount.appendChild(this.app.canvas);

    this.overlayLayer = new OverlayLayer();
    this.uiLayer = new UiLayer();

    this.app.stage.addChild(
      this.overlayLayer.container,
      this.uiLayer.container
    );

    // create controller once you have the landmarker
    this.tracker = new DetectionController({
      detectEveryMs: 33
    });

    // --- PIXI Ticker for detection ---
    this.app.ticker.add(() => {
      if (!this.videoEl) return;
      const requirements = this.currentDetectorMeta?.requires ?? {
        face: true,
        hands: true
      };
      const detection =
        this.tracker.detect(this.videoEl, performance.now(), requirements) ??
        this.tracker.getLatest();
      if (!detection) return;

      const w = this.app.renderer.width;
      const h = this.app.renderer.height;

      this.overlayLayer.update(detection, {
        mirrored: this.mirrored,
        index: 1,
        width: w,
        height: h
      });
    });

    // Optional: dispatch event so parent knows Pixi is ready
    this.dispatchEvent(
      new CustomEvent('pixi-ready', {
        detail: { app: this.app, overlayLayer: this.overlayLayer },
        bubbles: true,
        composed: true
      })
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this._unsubscribeStore?.();
    this._unsubscribeStore = null;

    if (this.tracker) {
      this.tracker.destroy?.();
      this.tracker = null;
    }

    if (this.app) {
      this.app.destroy();
      this.app = null;
      this.overlayLayer = null;
    }
  }

  // Optional public method for your controller to call
  clear() {
    if (!this.overlayLayer) return;
    this.overlayLayer.clear();
  }

  render() {
    return html`<div id="mount"></div>`;
  }
}

customElements.define('pixi-overlay', PixiOverlay);
