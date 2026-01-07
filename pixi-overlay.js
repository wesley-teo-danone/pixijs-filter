import {
  LitElement,
  html,
  css
} from 'https://unpkg.com/lit@2.7.5/index.js?module';

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

    // Create Pixi application and auto-resize to the mount element
    this.app = new PIXI.Application({
      backgroundAlpha: 0, // transparent
      antialias: true,
      resizeTo: mount // <-- key: keeps renderer size = mount box
    });
    // IMPORTANT: init is async in v8
    await this.app.init({
      backgroundAlpha: 0,
      resizeTo: mount, // your overlay div
      antialias: true
    });

    // v8 uses app.canvas (not app.view)
    mount.appendChild(this.app.canvas);

    // Example layer container
    this.overlayLayer = new PIXI.Container();
    this.app.stage.addChild(this.overlayLayer);

    // ---- draw something ----
    const g = new PIXI.Graphics();

    // green rectangle outline + filled circle to prove it works
    g.rect(30, 30, 180, 110);
    g.fill({ color: 0x00ff00, alpha: 0.25 });
    g.stroke({ width: 4, color: 0x00ff00, alpha: 1 });

    g.circle(280, 85, 35);
    g.fill({ color: 0xff00ff, alpha: 0.35 });
    g.stroke({ width: 4, color: 0xff00ff, alpha: 1 });

    this.overlayLayer.addChild(g);

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
      this.app.destroy({ removeView: true });
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
