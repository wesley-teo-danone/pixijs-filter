import { Container } from 'pixi.js';
import { DetectorBar } from '../ui/detector-bar.js';

export class UiLayer {
  constructor() {
    this.container = new Container({ label: 'ui-layer' });
    this.detectorBar = new DetectorBar();
    this.container.addChild(this.detectorBar.container);
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
