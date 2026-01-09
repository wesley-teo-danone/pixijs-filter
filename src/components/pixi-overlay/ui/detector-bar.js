import { Container, Graphics, Text } from 'pixi.js';
import { ButtonContainer } from '@pixi/ui';
import { detectorStore } from '../../../logic/state/detector-store.js';

export class DetectorBar {
  constructor() {
    this.container = new Container({ label: 'detector-bar' });
    this.container.position.set(24, 24);

    this.buttons = new Map();

    const buttonWidth = 120;
    const buttonHeight = 48;
    const gap = 12;
    const detectorList = Array.from(detectorStore.detectors.values());
    detectorList.forEach((detector, index) => {
      const graphic = new Graphics();
      graphic.roundRect(0, 0, buttonWidth, buttonHeight, 12);
      graphic.fill({ color: 0x252525, alpha: 0.75 });
      graphic.stroke({ width: 2, color: 0xffffff, alpha: 0.2 });

      const button = new ButtonContainer(graphic);
      button.position.set(index * (buttonWidth + gap), 0);
      button.eventMode = 'static';

      const label = new Text({
        text: detector.label,
        style: {
          fill: 0xffffff,
          fontSize: 16,
          fontFamily: 'Arial'
        }
      });
      label.anchor.set(0.5);
      label.position.set(buttonWidth / 2, buttonHeight / 2);
      button.addChild(label);

      button.onPress.connect(() => {
        this.setActive(detector.id);
        detectorStore.setCurrent(detector.id);
      });

      this.container.addChild(button);
      this.buttons.set(detector.id, { button, label });
    });

    const firstDetector = detectorList[0];
    if (firstDetector) {
      this.setActive(firstDetector.id);
    }
  }

  setActive(detectorId) {
    if (this.activeDetector === detectorId || !this.buttons.has(detectorId)) {
      return;
    }
    this.activeDetector = detectorId;
    this.buttons.forEach(({ button }, id) => {
      button.alpha = id === detectorId ? 1 : 0.55;
    });
  }

  show() {
    this.container.visible = true;
  }

  hide() {
    this.container.visible = false;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
