import { Container, Sprite, Assets } from 'pixi.js';

/**
 * Overlay that combines a face sticker and one per hand.
 */
export class FaceHybridOverlay {
  constructor() {
    this.container = new Container({ label: 'face-hand-overlay' });
    const texture = Assets.get('sticker');

    this.faceSprite = new Sprite(texture);
    this.faceSprite.anchor.set(0.5);
    this.faceSprite.scale.set(0.06);
    this.faceSprite.visible = false;
    this.container.addChild(this.faceSprite);

    this.handSprites = Array.from({ length: 2 }, () => {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.scale.set(0.04);
      sprite.visible = false;
      sprite.tint = 0xffc107;
      this.container.addChild(sprite);
      return sprite;
    });
  }

  update(
    landmarkSets,
    { mirrored = false, index = 1, width = 0, height = 0 } = {}
  ) {
    const face = landmarkSets?.face ?? landmarkSets?.faces?.[0];
    if (face && face[index]) {
      const nose = face[index];
      const xNorm = mirrored ? 1 - nose.x : nose.x;
      this.faceSprite.visible = true;
      this.faceSprite.position.set(xNorm * width, nose.y * height);
    } else {
      this.faceSprite.visible = false;
    }

    const hands = landmarkSets?.hands ?? [];
    this.handSprites.forEach((sprite, idx) => {
      const wrist = hands[idx]?.[0];
      if (!wrist) {
        sprite.visible = false;
        return;
      }
      const xNorm = mirrored ? 1 - wrist.x : wrist.x;
      sprite.visible = true;
      sprite.position.set(xNorm * width, wrist.y * height);
    });
  }
}
