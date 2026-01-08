// assets.js
import { Assets } from 'pixi.js';
import stickerUrl from './sticker.png';

export async function addFiltersBundle() {
  Assets.addBundle('filters', {
    sticker: stickerUrl
  });
  await Assets.loadBundle('filters');
}
