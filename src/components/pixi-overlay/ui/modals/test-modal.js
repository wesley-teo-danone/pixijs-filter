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

    // Countdown state
    this._countdownTimer = null;
    this._remaining = 0;

    // Subscribe to screen size changes
    this.unsubscribe = detectorStore.subscribe((snapshot) => {
      this.onResize(snapshot.screen.width, snapshot.screen.height);
    });

    // Modal background (dim overlay)
    const background = new Graphics()
      .rect(0, 0, detectorStore.width, detectorStore.height)
      .fill('red')
      .stroke({ width: 2, color: 0xffffff, alpha: 0.2 });
    background.alpha = 0.75;
    this.background = background;
    this.container.addChild(background);

    // Modal box (tilted chamfer rect)
    this.box = new Graphics();
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

    // Title
    this.title = new Text({
      text: 'Dummy Modal',
      fontSize: 24,
      fill: 0x222222,
    });
    this.title.x = this.box.x + 30;
    this.title.y = this.box.y + 40;
    this.container.addChild(this.title);

    // Description
    this.desc = new Text({
      text: 'This is a dummy modal container.',
      fontSize: 16,
      fill: 0x444444,
    });
    this.desc.x = this.box.x + 30;
    this.desc.y = this.box.y + 80;
    this.container.addChild(this.desc);

    // NEW: Countdown text (big, centered over the box)
    this.countdownText = new Text({
      text: '',
      fontSize: 120,
      fill: 0x111111,
      fontWeight: '800',
      align: 'center',
    });
    // We’ll position it in onResize() to stay centered
    this.container.addChild(this.countdownText);

    // Initial layout
    this.onResize(detectorStore.width, detectorStore.height);
  }

  async show() {
    this.container.visible = true;
    this.container.alpha = 0;
    await this.fadeTo(this.container, 1, 300); // fade in
    // Start a 3-second countdown after it’s visible
    this.startCountdown(3);
  }

  async hide() {
    // Stop countdown if running
    this.stopCountdown();

    await this.fadeTo(this.container, 0, 300); // fade out
    this.container.visible = false;
  }

  // Smooth alpha animation
  fadeTo(target, alphaTo, duration = 300) {
    return new Promise((resolve) => {
      const start = performance.now();
      const alphaFrom = target.alpha;

      const update = () => {
        const now = performance.now();
        const t = Math.min(1, (now - start) / duration);
        target.alpha = alphaFrom + (alphaTo - alphaFrom) * t;

        if (t < 1) requestAnimationFrame(update);
        else resolve();
      };

      requestAnimationFrame(update);
    });
  }

  // NEW: Start 3→2→1 countdown then auto-exit
  startCountdown(seconds = 3) {
    // Ensure any prior timer is cleared
    this.stopCountdown();

    this._remaining = Math.max(0, Math.floor(seconds));
    this._renderCountdown();

    if (this._remaining === 0) {
      // If asked to start at 0, hide immediately
      this.hide();
      return;
    }

    this._countdownTimer = setInterval(() => {
      this._remaining -= 1;
      this._renderCountdown();

      if (this._remaining <= 0) {
        this.stopCountdown();
        this.hide(); // Auto-close
      }
    }, 1000);
  }

  // NEW: Clear timer safely
  stopCountdown() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  }

  // NEW: Update the countdownText content and keep it centered on the box
  _renderCountdown() {
    this.countdownText.text =
      this._remaining > 0 ? String(this._remaining) : '';
    // Center the text anchored over the modal box
    // Measure the box’s bounds (using its local position as you drew with fixed coords)
    const boxBounds = this.box.getBounds(); // global bounds
    // If you prefer local layout, you could convert or rely on container coords.
    const centerX = boxBounds.x + boxBounds.width / 2;
    const centerY = boxBounds.y + boxBounds.height / 2;

    // Use pivot for centering based on current text metrics
    const metrics = this.countdownText.getLocalBounds();
    this.countdownText.pivot.set(metrics.width / 2, metrics.height / 2);
    this.countdownText.position.set(centerX, centerY);
  }

  // Keep everything responsive
  onResize(width, height) {
    // Update dims
    this.container.width = width;
    this.container.height = height;
    // this._renderCountdown();
  }

  // Optional: call this when destroying the modal to avoid leaks
  destroy(options) {
    this.stopCountdown();
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.container.destroy(options);
  }
}
