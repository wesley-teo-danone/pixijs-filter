import { BaseDetector } from './base-detector.js'; // Fix the import
import { detectionModels } from '../models/detection-models.js';

const pullMinFrames = 10;
const holdThresholdFrames = 5;

class LowerEyelidDetector extends BaseDetector {
  constructor() {
    super(10, 'eye');
    this._faceDetectorModel = detectionModels.getFaceLandmarker();
    this._handDetectorModel = detectionModels.getHandLandmarker();
    this.pullFrameCount = 0; // count frames with finger pull
    this.lastPulledEye = null;
    this.fingerNearStart = false; // flag to indicate if finger is near the start position
    this.fingerHoldCounter = 0; // counter for finger hold frames
    this.fingerStartDist = 0; // initial distance when finger is near start
    this.OVERLAY_COLOURS = {
      idle: {
        // red
        fill: 'rgba(255, 59, 48, 0.22)',
        stroke: '#FF3B30'
      },
      near: {
        // yellow
        fill: 'rgba(255, 204, 0, 0.22)',
        stroke: '#FFCC00'
      },
      good: {
        // green
        fill: 'rgba(48, 209, 88, 0.24)',
        stroke: '#30D158'
      }
    };
  }

  roundedRectPath(ctx, x, y, w, h, r = 10) {
    const rr = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  drawDimmedWithHole(ctx, x, y, w, h, r = 10, dim = 0.2) {
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${dim})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Carve out a hole where the overlay box will be
    ctx.globalCompositeOperation = 'destination-out';
    this.roundedRectPath(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();
  }

  drawOverlayBox(ctx, x, y, w, h, state = 'idle') {
    const { fill, stroke } =
      this.OVERLAY_COLOURS[state] || this.OVERLAY_COLOURS.idle;

    // Dim BG except the overlay square
    const corner = Math.min(w, h) * 0.2;
    this.drawDimmedWithHole(ctx, x, y, w, h, corner, 0.2);

    // Colored glass + soft glow stroke
    ctx.save();
    this.roundedRectPath(ctx, x, y, w, h, corner);
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.shadowColor = stroke;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.restore();
  }

  eyeBoxFromLandmarks(L, indices, W, H, padPx = 0) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const i of indices) {
      const x = L[i].x * W,
        y = L[i].y * H;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    let x = Math.max(0, minX - padPx);
    let y = Math.max(0, minY - padPx * 0.6); // less pad top
    let w = maxX - minX + padPx * 2;
    let h = maxY - minY + padPx * 1.7; // more height to include lower lid

    // Clamp to canvas
    w = Math.min(w, W - x);
    h = Math.min(h, H - y);
    return { x, y, w, h };
  }

  squareFromBox(box, W, H) {
    const side = Math.max(box.w, box.h);
    let cx = box.x + box.w / 2;
    let cy = box.y + box.h / 2;
    let x = Math.round(cx - side / 2);
    let y = Math.round(cy - side / 2);
    let w = Math.round(side);
    let h = Math.round(side);

    // Clamp inside canvas
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x + w > W) x = Math.max(0, W - w);
    if (y + h > H) y = Math.max(0, H - h);

    // If side > canvas in any dimension, shrink
    if (w > W) {
      w = W;
      x = 0;
    }
    if (h > H) {
      h = H;
      y = 0;
    }

    return { x, y, w, h };
  }

  crop(landmarksObj, margin = 10) {
    const { landmarks, eyeside } = landmarksObj;

    if (!landmarks || !eyeside) return null;

    const IDX_RIGHT = [
      33, 133, 160, 159, 158, 157, 173, 144, 145, 153, 154, 155, 246
    ];
    const IDX_LEFT = [
      263, 362, 387, 386, 385, 384, 398, 373, 374, 380, 381, 382, 466
    ];
    const IDX = eyeside === 'left' ? IDX_LEFT : IDX_RIGHT;

    const w = this.videoEl.videoWidth;
    const h = this.videoEl.videoHeight;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    IDX.forEach((i) => {
      const x = landmarks[i].x * w;
      const y = landmarks[i].y * h;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    /* source square, padded */
    const side = Math.max(maxX - minX, maxY - minY) + margin * 2;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    let sx = cx - side / 2;
    let sy = cy - side / 2;

    /* clamp so the box stays inside the frame */
    sx = Math.max(0, Math.min(sx, w - side));
    sy = Math.max(0, Math.min(sy, h - side));
    //return crop dimensions
    return [{ x: sx, y: sy, w: side, h: side }];
  }

  predict() {
    const w = this.canvasCtx.canvas.width,
      h = this.canvasCtx.canvas.height;
    let ready = null;
    const now = performance.now();
    const faceResults = this._faceDetectorModel.detectForVideo(
      this.videoEl,
      now
    );
    const handResults = this._handDetectorModel.detectForVideo(
      this.videoEl,
      now
    );
    /*  FACE LOOP  */
    if (faceResults.faceLandmarks?.length) {
      for (const L of faceResults.faceLandmarks) {
        const eyeSpan = Math.hypot(L[33].x - L[263].x, L[33].y - L[263].y);

        // MediaPipe FaceMesh eye polygons
        const EYE_POLY_RIGHT = [33, 7, 163, 144, 145, 153, 154, 155, 133];
        const EYE_POLY_LEFT = [263, 249, 390, 373, 374, 380, 381, 382, 362];

        // Your arrow/lower-lid reference indices
        const eyes = [
          { lidIdx: 145, arrowIdx: 230, poly: EYE_POLY_RIGHT, side: 'right' }, // right eye
          { lidIdx: 374, arrowIdx: 450, poly: EYE_POLY_LEFT, side: 'left' } // left eye
        ];

        // Find closest fingertip to either eye (index/middle/thumb)
        let best = null;
        if (handResults.landmarks?.length) {
          for (const H of handResults.landmarks) {
            const fingerIds = [12, 8, 4];
            for (const fId of fingerIds) {
              const f = H[fId];
              for (const eye of eyes) {
                const e = L[eye.lidIdx];
                const d = Math.hypot(f.x - e.x, f.y - e.y) / (eyeSpan || 1e-6);

                if (!best || d < best.dist) {
                  best = { dist: d, handPt: f, eye };
                }
              }
            }
          }
        }

        // Defaults
        let state = 'idle'; // red
        let fx, fy, ex, ey;

        if (best) {
          fx = best.handPt.x * w;
          fy = best.handPt.y * h;
          ex = L[best.eye.arrowIdx].x * w;
          ey = L[best.eye.arrowIdx].y * h;

          if (!this.fingerNearStart) {
            if (best.dist < 0.35) {
              this.fingerHoldCounter++;
              if (this.fingerHoldCounter === holdThresholdFrames) {
                this.fingerNearStart = true;
                this.fingerStartDist = best.dist;
                this.pullFrameCount = 0;
              }
            } else {
              this.fingerHoldCounter = 0;
              // guidance arrow while idle
              // if (typeof drawDottedArrow === "function") {
              //   drawDottedArrow(canvasCtx, fx, fy, ex, ey);
              // }
            }
          } else {
            if (best.dist > 0.65) {
              // finger pulled away: reset
              this.fingerNearStart = false;
              this.fingerHoldCounter = 0;
              this.pullFrameCount = 0;
              // if (typeof drawDottedArrow === "function") {
              //   drawDottedArrow(canvasCtx, fx, fy, ex, ey);
              // }
            } else {
              const delta = best.dist - this.fingerStartDist;
              // Calibrate here if needed (you noted 0.040–0.070 earlier)
              this.pullFrameCount = delta > 0.03 ? this.pullFrameCount + 1 : 0;

              if (this.pullFrameCount >= pullMinFrames) {
                state = 'good'; // green
                this.lastPulledEye = best.eye.lidIdx === 145 ? 'right' : 'left';
                ready = { landmarks: L, eyeside: this.lastPulledEye };
              } else {
                state = 'near'; // yellow
              }
            }
          }
        }
        break;
      }
    }
    return { faceLandmarks: ready.landmarks, eyeside: ready.eyeside };
  }
}

export { LowerEyelidDetector };
