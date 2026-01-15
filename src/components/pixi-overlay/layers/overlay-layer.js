import { Container, Graphics, Text } from 'pixi.js';
import { FaceOverlays } from '../overlays/face-overlays';
import { HandOverlay } from '../overlays/hand-overlay.js';
import { FaceHybridOverlay } from '../overlays/face-hybrid-overlay';
import { detectorStore } from '../../../logic/state/detector-store.js';
import { TestModal } from '../ui/modals/test-modal';
import { ButtonContainer } from '@pixi/ui';

export class OverlayLayer {
  constructor() {
    this.container = new Container({ label: 'overlay-layer' });
    const snapshot = detectorStore.getSnapshot();

    // Default overlays keyed by detector id
    this.overlays = {
      tongue: new FaceOverlays(),
      nail: new HandOverlay(),
      eye: new FaceHybridOverlay(),
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

    // Add TestModal and open button
    this.testModal = new TestModal();
    this.container.addChild(this.testModal.container);

    const graphic = new Graphics();
    graphic.roundRect(0, 0, 50, 50, 12);
    graphic.fill({ color: 0x252530, alpha: 0.75 });
    graphic.stroke({ width: 2, color: 0xffffff, alpha: 0.2 });

    const openButton = new ButtonContainer(graphic);
    openButton.position.set(400, 0);
    openButton.eventMode = 'static';

    const label = new Text({
      text: 'open modal',
      style: {
        fill: 0xffffff,
        fontSize: 16,
        fontFamily: 'Arial',
      },
    });
    label.anchor.set(0.5);
    label.position.set(25, 25);
    openButton.addChild(label);
    // Keep your signal-style hook if ButtonContainer provides it
    openButton.onPress.connect(() => {
      this.testModal.show();
    });

    this.container.addChild(openButton);
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
