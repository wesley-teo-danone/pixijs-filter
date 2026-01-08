import { Container, Graphics } from 'pixi.js';

export class OverlayLayer {
  constructor() {
    this.container = new Container({ label: 'overlay-layer' });

    // ---- draw something ----
    const g = new Graphics();

    // green rectangle outline + filled circle to prove it works
    g.rect(30, 30, 180, 110);
    g.fill({ color: 0x00ffee, alpha: 0.25 });
    g.stroke({ width: 4, color: 0x00ffee, alpha: 1 });

    g.circle(280, 85, 35);
    g.fill({ color: 0xff00ee, alpha: 0.35 });
    g.stroke({ width: 4, color: 0xff00ee, alpha: 1 });

    this.container.addChild(g);
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
