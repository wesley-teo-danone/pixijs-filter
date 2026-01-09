import { Container } from 'pixi.js';
import { FaceOverlays } from '../overlays/face-overlays';
import { FaceSecondOverlay } from '../overlays/face-second-overlay';
import { FaceHybridOverlay } from '../overlays/face-hybrid-overlay';

export class OverlayLayer {
  constructor({ initialFilter = 'primary' } = {}) {
    this.container = new Container({ label: 'overlay-layer' });

    // Default overlays
    this.overlays = {
      primary: new FaceOverlays(),
      secondary: new FaceSecondOverlay(),
      hybrid: new FaceHybridOverlay()
    };

    // Add all overlays to the container, hide them initially
    Object.entries(this.overlays).forEach(([_, overlay]) => {
      overlay.container.visible = false;
      this.container.addChild(overlay.container);
    });

    // Set the initial active overlay
    const overlayIds = Object.keys(this.overlays);
    this.activeOverlayId = overlayIds.includes(initialFilter)
      ? initialFilter
      : overlayIds[0];
    this.#setVisibility(this.activeOverlayId);
  }

  // Exposed method to change the active overlay
  setFilter(filterId) {
    if (!this.overlays[filterId] || this.activeOverlayId === filterId)
      return false;
    this.activeOverlayId = filterId;
    this.#setVisibility(filterId);
    return true;
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
    overlay?.update?.(landmarkSets, options);
  }

  clear() {
    this.container.removeChildren();
  }

  show() {
    this.container.visible = true;
  }
}
