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
    { mirrored = false, index = 1, width = 0, height = 0 } = {},
  ) {
    const faceLandmarks = landmarkSets?.faceLandmarks;
    if (!faceLandmarks || !faceLandmarks[index]) {
      this.faceSprite.visible = false;
    } else {
      this.faceSprite.visible = true;
      const p = faceLandmarks[index];
      const xNorm = mirrored ? 1 - p.x : p.x;
      this.faceSprite.position.set(xNorm * width, p.y * height);
    }

    const handData = landmarkSets?.handLandmarks ?? null;
    const hands = handData?.landmarks ?? [];
    this.handSprites.forEach((sprite, idx) => {
      const hand = hands[idx];
      const wrist = hand?.[0];
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
