import { Container, Graphics } from 'pixi.js';
import { ButtonContainer } from '@pixi/ui';

export class FilterBar {
  constructor() {
    // Root container for this UI module
    this.container = new Container({ label: 'filter-bar' });
    console.log(this.container);

    // Create a Graphics object
    const g = new Graphics();
    g.rect(130, 130, 180, 110);
    g.fill({ color: 0xfc2c03, alpha: 0.25 });
    g.stroke({ width: 4, color: 0xfc2c03, alpha: 1 });

    const button = new ButtonContainer(g);

    button.onPress.connect(() => {
      console.log(`Filter button clicked`);
    });
    this.container.addChild(button);

    // this._buttons = [];

    // const buttonWidth = 80;
    // const buttonHeight = 40;
    // const gap = 10;

    // for (let i = 0; i < 4; i++) {
    //   const button = new PIXI.UI.Button({
    //     width: buttonWidth,
    //     height: buttonHeight,
    //     text: `F${i + 1}`
    //   });

    //   // Position buttons horizontally at the top
    //   button.position.set(padding + i * (buttonWidth + gap), padding);

    //   // Click handler
    //   button.onPress.connect(() => {
    //     console.log(`Filter button ${i + 1} clicked`);
    //   });

    //   this.container.addChild(button);
    //   this._buttons.push(button);
    // }
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
