import { Container, Graphics, Text } from 'pixi.js';
import { ButtonContainer } from '@pixi/ui';

export class FilterBar {
  constructor({ filters, onSelect } = {}) {
    this.container = new Container({ label: 'filter-bar' });
    this.container.position.set(24, 24);

    this.onSelect = onSelect;
    this.buttons = new Map();

    const buttonWidth = 120;
    const buttonHeight = 48;
    const gap = 12;

    filters.forEach((filter, index) => {
      const graphic = new Graphics();
      graphic.roundRect(0, 0, buttonWidth, buttonHeight, 12);
      graphic.fill({ color: 0x252525, alpha: 0.75 });
      graphic.stroke({ width: 2, color: 0xffffff, alpha: 0.2 });

      const button = new ButtonContainer(graphic);
      button.position.set(index * (buttonWidth + gap), 0);
      button.eventMode = 'static';

      const label = new Text({
        text: filter.label,
        style: {
          fill: 0xffffff,
          fontSize: 16,
          fontFamily: 'Arial'
        }
      });
      label.anchor.set(0.5);
      label.position.set(buttonWidth / 2, buttonHeight / 2);
      button.addChild(label);

      // Handle button press
      button.onPress.connect(() => {
        this.setActive(filter.id);
        this.onSelect?.(filter.id);
      });

      this.container.addChild(button);
      this.buttons.set(filter.id, { button, label });
    });

    const first = filters[0];
    if (first) {
      this.setActive(first.id);
    }
  }

  setActive(filterId) {
    if (this.activeFilter === filterId || !this.buttons.has(filterId)) return;
    this.activeFilter = filterId;
    this.buttons.forEach(({ button }, id) => {
      button.alpha = id === filterId ? 1 : 0.55;
    });
  }

  /** Optional helpers */
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
