import { HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304';

import { BaseDetector } from './base-detector.js';
import { detectionModels } from '../models/detection-models.js';

class NailDetector extends BaseDetector {
  constructor() {
    super(5, 'nail');
    this._handLandmarkerModel = detectionModels.getHandLandmarker();
    this.backFrames = {
      Left: 0,
      Right: 0
    };
    this.stableFrames = {
      Left: 0,
      Right: 0
    };
    this.lastCentroid = {
      Left: null,
      Right: null
    };
    this.handReady = {
      Left: false,
      Right: false
    };
    this.backHoldMinFrames = 8; // tweak as you like (≈ ⅓ s at 24 fps)
    this.stableHoldMinFrames = 10; // must stay still ≥ 10 frames
    this.moveThresh = 0.015; // max allowed motion
  }

  isHandBack(label, hand) {
    const wx = hand[0].x,
      wy = hand[0].y; // wrist
    const ix = hand[5].x,
      iy = hand[5].y; // index
    const px = hand[17].x,
      py = hand[17].y; // pinky

    const crossZ = (ix - wx) * (py - wy) - (iy - wy) * (px - wx); // >0 = CCW, <0 = CW

    if (label === 'Left') return crossZ < 0; // CCW  PALM,  CW  BACK
    if (label === 'Right') return crossZ > 0; // CW   PALM,  CCW  BACK
    return false;
  }

  // Crops 6 nails (3 per hand) and returns array of crop rects
  crop(handResults, fingerScale = 1.3, margin = 2) {
    if (
      handResults === null ||
      handResults.landmarks === null ||
      handResults.landmarks.length === 0
    ) {
      return false;
    }

    const vw = this.videoEl.videoWidth,
      vh = this.videoEl.videoHeight;

    const FINGERS = [
      { tip: 8, joint: 7 }, // index
      { tip: 12, joint: 11 }, // middle
      { tip: 16, joint: 15 } // ring
    ];

    const left = [],
      right = [];

    handResults.landmarks.forEach((H, h) => {
      const isLeft = handResults.handedness?.[h]?.[0]?.categoryName === 'Left';
      const bucket = isLeft ? left : right;

      FINGERS.forEach(({ tip, joint }) => {
        const lmTip = H[tip];
        const lmJoint = H[joint];
        if (!lmTip || !lmJoint) return;

        const tx = lmTip.x * vw,
          ty = lmTip.y * vh;
        const jx = lmJoint.x * vw,
          jy = lmJoint.y * vh;

        const fingerWidth = Math.hypot(tx - jx, ty - jy);
        const side = fingerWidth * fingerScale + margin * 2;

        let sx = Math.round(tx - side / 2);
        let sy = Math.round(ty - side / 2);
        sx = Math.max(0, Math.min(sx, vw - side));
        sy = Math.max(0, Math.min(sy, vh - side));

        bucket.push({ x: sx, y: sy, w: side, h: side });
      });
    });

    if (left.length !== 3 || right.length !== 3) return null;
    return [...left, ...right];
  }

  predict(videoEl, now) {
    let valid = false;
    let handLandmarks = null;
    const handResults = this._handLandmarkerModel.detectForVideo(videoEl, now);
    if (handResults.landmarks?.length) {
      handLandmarks = handResults;
      /* loop over each detected hand */
      handResults.landmarks.forEach((hand, i) => {
        //Hand, index (0 for right, 1 for left)
        const label =
          handResults.handedness?.[i]?.[0]?.categoryName ?? 'Unknown';
        if (label !== 'Left' && label !== 'Right') return;
        const isBack = this.isHandBack(label, hand);

        this.backFrames[label] = isBack ? this.backFrames[label] + 1 : 0;

        /*  check if hand is still */
        const cx = hand[0].x;
        const cy = hand[0].y;

        if (this.lastCentroid[label]) {
          const dx = cx - this.lastCentroid[label].x;
          const dy = cy - this.lastCentroid[label].y;
          const dist = Math.hypot(dx, dy);

          this.stableFrames[label] =
            dist < this.moveThresh ? this.stableFrames[label] + 1 : 0;
        }
        this.lastCentroid[label] = { x: cx, y: cy };

        this.handReady[label] =
          this.backFrames[label] >= this.backHoldMinFrames &&
          this.stableFrames[label] >= this.stableHoldMinFrames;
      });
    }
    if (this.handReady.Left && this.handReady.Right) {
      valid = true;
      console.log('Nails detected');
    }
    return { handLandmarks, valid };
  }
}
export { NailDetector };
