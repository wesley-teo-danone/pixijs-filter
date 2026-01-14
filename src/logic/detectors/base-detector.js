/**
 * Abstract base class for all region detectors.
 *
 * Subclasses must implement the following methods:
 *   - predict(): Performs detection and returns landmark results for the current frame.
 *   - crop(): Returns crop coordinates relative to the canvas size.
 *
 * Properties:
 *   - framesRequired: Number of frames to capture for this detector.
 *   - id: Unique identifier for the detector type.
 *
 * Throws:
 *   - Error if instantiated directly (must be subclassed).
 *   - Error if framesRequired is not set by subclass.
 */
export class BaseDetector {
  /**
   * @param {number} framesRequired - Number of frames to capture for this detector.
   * @param {string} id - Unique identifier for the detector.
   */
  constructor(framesRequired, id) {
    this.framesRequired = framesRequired;
    this.id = id;

    // Throw error if instantiated directly
    if (this.constructor === BaseDetector) {
      throw new Error(
        'Detector is abstract and cannot be instantiated directly'
      );
    }
    // Validate that subclass sets framesRequired property
    if (this.framesRequired === undefined || this.framesRequired === null) {
      throw new Error(
        'framesRequired property must be set by subclass constructor'
      );
    }
  }

  /**
   * Abstract method to perform detection.
   * Must be implemented by subclass.
   * @throws {Error}
   */
  predict(videoEl) {
    throw new Error('predict() must be implemented by subclass');
  }

  /**
   * Abstract method to return crop coordinates relative to the canvas size.
   * Must be implemented by subclass.
   * @throws {Error}
   */
  crop() {
    throw new Error('crop() must be implemented by subclass');
  }

  /**
   * Returns the number of frames required for this detector.
   * @returns {number}
   */
  getFramesRequired() {
    return this.framesRequired;
  }

  /**
   * Returns the unique identifier for this detector.
   * @returns {string}
   */
  getId() {
    return this.id;
  }
}
