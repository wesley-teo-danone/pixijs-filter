import { Container } from 'pixi.js';
import { FaceOverlays } from '../overlays/face-overlays';
import { HandOverlay } from '../overlays/hand-overlay.js';
import { FaceHybridOverlay } from '../overlays/face-hybrid-overlay';
import { detectorStore } from '../../../logic/state/detector-store.js';

export class OverlayLayer {
  constructor() {
    this.container = new Container({ label: 'overlay-layer' });
    const snapshot = detectorStore.getSnapshot();

    // Default overlays keyed by detector id
    this.overlays = {
      tongue: new FaceOverlays(),
      nail: new HandOverlay(),
      eye: new FaceHybridOverlay()
    };

    // Add all overlays to the container, hide them initially
    Object.entries(this.overlays).forEach(([_, overlay]) => {
      overlay.container.visible = false;
      this.container.addChild(overlay.container);
    });

    // Set and show the initial active overlay based on store snapshot
    this.activeOverlayId = snapshot.currentDetector?.id;
    this.#setVisibility(this.activeOverlayId);

    this._unsubscribeStore = detectorStore.subscribe((state) => {
      this.#syncWithStore(state.currentDetector?.id ?? null);
    });
  }

  destroy() {
    this._unsubscribeStore?.();
    this._unsubscribeStore = null;
    this.container.destroy({ children: true });
  }

  #syncWithStore(detectorId) {
    if (!detectorId || !this.overlays[detectorId]) return;
    if (this.activeOverlayId === detectorId) return;
    this.activeOverlayId = detectorId;
    this.#setVisibility(detectorId);
  }

  // Private method to set visibility of overlays
  #setVisibility(activeId) {
    Object.entries(this.overlays).forEach(([id, overlay]) => {
      overlay.container.visible = id === activeId;
    });
  }

  // Update method to forward landmark data to the active overlay
  update(landmarkSets, options = {}) {
    const overlay = this.overlays[this.activeOverlayId];
    overlay.update(landmarkSets, options);
  }

  clear() {
    this.container.removeChildren();
  }

  show() {
    this.container.visible = true;
  }
}
