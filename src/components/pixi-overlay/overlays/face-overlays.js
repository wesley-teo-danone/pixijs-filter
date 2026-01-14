import { Container, Sprite, Assets } from 'pixi.js';
export class FaceOverlays {
  constructor() {
    // Root container for this UI module
    this.container = new Container({ label: 'face-overlays' });
    this.sticker = Sprite.from(Assets.get('sticker'));

    this.sticker.anchor.set(0.5, 0.5);
    this.sticker.scale.set(0.05);
    this.sticker.anchor.set(0.5);
    this.container.addChild(this.sticker);
  }

  update(
    landmarkSets,
    { mirrored = false, index = 1, width = 0, height = 0 } = {}
  ) {
    const landmarks = landmarkSets?.faceLandmarks;
    if (!landmarks || !landmarks[index]) {
      this.sticker.visible = false;
      return;
    }
    this.sticker.visible = true;
    const p = landmarks[index];
    const xNorm = mirrored ? 1 - p.x : p.x;
    this.sticker.position.set(xNorm * width, p.y * height);
  }
}
