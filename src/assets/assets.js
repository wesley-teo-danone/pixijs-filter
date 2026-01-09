// assets.js
import { Assets } from 'pixi.js';
import stickerUrl from './sticker.png';
import chopperUrl from './chopper.png';

export async function addFiltersBundle() {
  Assets.addBundle('filters', {
    sticker: stickerUrl,
    chopper: chopperUrl
  });
  await Assets.loadBundle('filters');
}
