import { Container, Graphics, Text, Matrix } from 'pixi.js';
import { detectorStore } from '../../../../logic/state/detector-store';

export class TestModal {
  constructor() {
    this.visible = false;
    this.container = new Container({
      label: 'test-modal',
      width: detectorStore.width / 2,
      height: detectorStore.height / 2,
    });
    this.container.visible = false;
    // Subscribe to screen size changes
    this.unsubscribe = detectorStore.subscribe((snapshot) => {
      this.onResize(snapshot.screen.width, snapshot.screen.height);
    });
    // Modal background
    const background = new Graphics()
      .rect(0, 0, detectorStore.width, detectorStore.height)
      .fill('red')
      .stroke({ width: 2, color: 0xffffff, alpha: 0.2 });
    background.alpha = 0.75;
    this.container.addChild(background);
    // Modal box
    this.box = new Graphics();

    // Add transform and stroke
    const transform = new Matrix().rotate(Math.PI / 4); // 45 degrees

    this.box
      .chamferRect(200, 50, 100, 80, 20, transform)
      .fill({ color: 'pink' })
      .stroke({ width: 2, color: 'pink' });
    this.container.addChild(this.box);

    // Exit button
    this.exitButton = new Text({
      text: '×',
      fontSize: 32,
      fill: 0x333333,
      fontWeight: 'bold',
    });
    this.exitButton.interactive = true;
    this.exitButton.buttonMode = true;
    this.exitButton.x = detectorStore.width - 40;

    this.exitButton.y = this.box.y + 10;
    this.exitButton.on('pointerdown', () => this.hide());
    this.container.addChild(this.exitButton);

    // Modal text
    const title = new Text({
      text: 'Dummy Modal',
      fontSize: 24,
      fill: 0x222222,
    });
    title.x = this.box.x + 30;
    title.y = this.box.y + 40;
    this.container.addChild(title);

    const desc = new Text({
      text: 'This is a dummy modal container.',
      fontSize: 16,
      fill: 0x444444,
    });
    desc.x = this.box.x + 30;
    desc.y = this.box.y + 80;
    this.container.addChild(desc);
  }

  async show() {
    this.container.visible = true;
    this.container.alpha = 0;
    await this.fadeTo(this.container, 1, 300); // fade in
  }

  async hide() {
    await this.fadeTo(this.container, 0, 300); // fade out
    this.container.visible = false;
  }

  fadeTo(target, alphaTo, duration = 300) {
    return new Promise((resolve) => {
      const start = performance.now();
      const alphaFrom = target.alpha;

      function update() {
        const now = performance.now();
        const t = Math.min(1, (now - start) / duration);
        target.alpha = alphaFrom + (alphaTo - alphaFrom) * t;

        if (t < 1) requestAnimationFrame(update);
        else resolve();
      }

      requestAnimationFrame(update);
    });
  }
  onResize(width, height) {
    // Update modal dimensions
    this.container.width = width;
    this.container.height = height;
  }
}
