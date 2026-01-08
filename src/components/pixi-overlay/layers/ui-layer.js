export class UiLayer {
  constructor() {
    this.container = new PIXI.Container({ label: 'ui-layer' });
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
