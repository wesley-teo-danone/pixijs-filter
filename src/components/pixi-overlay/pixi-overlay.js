import { LitElement, html, css } from 'lit';
import { Application, Graphics, Assets, Container, Sprite } from 'pixi.js';
import { Button } from '@pixi/ui';
import { OverlayLayer } from './layers/overlay-layer.js';
import { UiLayer } from './layers/ui-layer.js';
import { FilterBar } from './ui/filter-bar.js';

export class PixiOverlay extends LitElement {
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

    /* Ensure the canvas fills the mount box */
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `;

  async firstUpdated() {
    const mount = this.renderRoot.querySelector('#mount');

    this.app = new Application();
    await this.app.init({
      backgroundAlpha: 0,
      resizeTo: window, // your overlay div
      antialias: true
    });
    // For Chrome devtools debugging
    globalThis.__PIXI_APP__ = this.app;

    mount.appendChild(this.app.canvas);

    //We should split these layers into graphics layer and ui
    this.overlayLayer = new OverlayLayer();
    this.uiLayer = new UiLayer();
    this.filterBar = new FilterBar();

    this.app.stage.addChild(
      this.overlayLayer.container,
      this.uiLayer.container,
      this.filterBar.container
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
