import {
  LitElement,
  html,
  css
} from 'https://unpkg.com/lit@2.7.5/index.js?module';
import { OverlayLayer } from './layers/overlay-layer.js';
import { UiLayer } from './layers/ui-layer.js';

export class PixiOverlay extends LitElement {
  static styles = css`
    :host {
      position: absolute;
      inset: 0; /* fill parent */
      display: block;
      pointer-events: none; /* overlay doesn’t block clicks by default */
    }

    #mount {
      position: absolute;
      inset: 0;
    }

    /* Ensure the canvas fills the mount box */
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `;

  /** @type {PIXI.Application | null} */
  app = null;

  /** Optional: expose a layer you can add stuff to */
  overlayLayer = null;

  async firstUpdated() {
    const mount = this.renderRoot.querySelector('#mount');

    this.app = new PIXI.Application();
    await this.app.init({
      backgroundAlpha: 0,
      resizeTo: window, // your overlay div
      antialias: true
    });

    mount.appendChild(this.app.canvas);

    //We should split these layers into graphics layer and ui
    this.overlayLayer = new OverlayLayer();
    this.UiLayer = new UiLayer();
    this.app.stage.addChild(
      this.overlayLayer.container,
      this.UiLayer.container
    );

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
