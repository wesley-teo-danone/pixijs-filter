import { Container, Sprite, Assets } from 'pixi.js';

/**
 * Overlay that attaches a sticker to each detected hand (wrist landmark).
 */
export class FaceSecondOverlay {
  constructor() {
    this.container = new Container({ label: 'hand-overlays' });

    const texture = Assets.get('chopper');
    this.handSprites = Array.from({ length: 2 }, () => {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.scale.set(0.045);
      sprite.visible = false;
      this.container.addChild(sprite);
      return sprite;
    });
  }

  update(landmarkSets, { mirrored = false, width = 0, height = 0 } = {}) {
    const hands = landmarkSets?.hands ?? [];
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
