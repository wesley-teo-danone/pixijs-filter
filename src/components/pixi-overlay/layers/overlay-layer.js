import { Container, Graphics } from 'pixi.js';
import { FaceOverlays } from '../overlays/face-overlays';
export class OverlayLayer {
  constructor() {
    this.container = new Container({ label: 'overlay-layer' });
    this.faceOverlay = new FaceOverlays();
    this.container.addChild(this.faceOverlay.container);
  }
  update(landmarks, options = {}) {
    // Delegate update to all overlays (for now, just faceOverlay)
    if (this.faceOverlay && typeof this.faceOverlay.update === 'function') {
      this.faceOverlay.update(landmarks, options);
    }
    // In the future, call update on other overlays here
  }
  clear() {
    this.container.removeChildren();
  }

  show() {
    this.container.visible = true;
  }

  hide() {
    this.container.visible = false;
  }
}
