import { LitElement, html, css } from 'lit';
import { Application, Graphics, Assets, Container, Sprite } from 'pixi.js';
import { Button } from '@pixi/ui';
import { OverlayLayer } from './layers/overlay-layer.js';
import { UiLayer } from './layers/ui-layer.js';
import { FilterBar } from './ui/filter-bar.js';
import { DetectionController } from '../../components/controller/detection-controller.js';
import stickerUrl from '../../assets/sticker.png';
export class PixiOverlay extends LitElement {
  static properties = {
    videoEl: { type: HTMLElement }
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

    mount.appendChild(this.app.canvas);

    this.overlayLayer = new OverlayLayer();
    this.uiLayer = new UiLayer();
    this.filterBar = new FilterBar();

    this.app.stage.addChild(
      this.overlayLayer.container,
      this.uiLayer.container
      // this.filterBar.container
    );

    // example sprite
    const texture = await Assets.load(stickerUrl);
    this.sticker = Sprite.from(texture);
    console.log(this.sticker);

    this.sticker.anchor.set(0.5, 0.5);
    this.sticker.scale.set(0.05);
    this.overlayLayer.container.addChild(this.sticker);

    // create controller once you have the landmarker
    this.tracker = new DetectionController({
      detectEveryMs: 33
    });

    // --- PIXI Ticker for detection ---
    this.app.ticker.add(() => {
      // Assume you have a video element reference
      if (this.videoEl) {
        this.tracker.detect(this.videoEl, performance.now());
        const lm = this.tracker.getLatest();
        if (!lm) return;

        const w = this.app.renderer.width;
        const h = this.app.renderer.height;

        // pick a landmark index you want (example: 1)
        const p = lm[1];
        // const xNorm = this.mirrored ? 1 - p.x : p.x;
        const xNorm = false ? 1 - p.x : p.x;

        this.sticker.position.set(xNorm * w, p.y * h);
      }
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

    if (this.app) {
      this.app.destroy();
      this.app = null;
      this.overlayLayer = null;
    }
  }

  // Optional public method for your controller to call
  clear() {
    if (!this.overlayLayer) return;
    this.overlayLayer.removeChildren();
  }

  render() {
    return html`<div id="mount"></div>`;
  }
}

customElements.define('pixi-overlay', PixiOverlay);
