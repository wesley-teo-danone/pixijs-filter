import { LitElement, html, css } from 'lit';
import { Application, Graphics, Assets, Container, Sprite } from 'pixi.js';
import { OverlayLayer } from './layers/overlay-layer.js';
import { UiLayer } from './layers/ui-layer.js';
import { FilterBar } from './ui/filter-bar.js';
import { DetectionController } from '../../components/controller/detection-controller.js';
import { addFiltersBundle } from '../../assets/assets.js';

const FILTERS = [
  { id: 'primary', label: 'Classic', requires: { face: true } },
  { id: 'secondary', label: 'Hands', requires: { hands: true } },
  { id: 'hybrid', label: 'Hybrid', requires: { face: true, hands: true } }
];

const FILTER_LOOKUP = new Map(
  FILTERS.map((filter) => [filter.id, filter, filter.requires])
);

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
    this.currentFilterId = FILTERS[0].id;
    this.currentFilterMeta = FILTER_LOOKUP.get(this.currentFilterId);
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

    this.overlayLayer = new OverlayLayer({
      initialFilter: this.currentFilterId
    });
    this.uiLayer = new UiLayer();
    this.filterBar = new FilterBar({
      filters: FILTERS,
      onSelect: (filterId) => this.#handleFilterChange(filterId)
    });

    this.app.stage.addChild(
      this.overlayLayer.container,
      this.uiLayer.container
    );
    this.uiLayer.container.addChild(this.filterBar.container);

    // create controller once you have the landmarker
    this.tracker = new DetectionController({
      detectEveryMs: 33
    });

    // --- PIXI Ticker for detection ---
    this.app.ticker.add(() => {
      if (!this.videoEl) return;
      const requirements = this.currentFilterMeta.requires;
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

  #handleFilterChange(filterId) {
    if (this.overlayLayer?.setFilter(filterId)) {
      this.currentFilterId = filterId;
      this.currentFilterMeta = FILTER_LOOKUP.get(filterId);
      this.filterBar?.setActive(filterId);
    }
  }
}

customElements.define('pixi-overlay', PixiOverlay);
