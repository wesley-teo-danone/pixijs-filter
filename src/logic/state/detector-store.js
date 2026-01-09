const DETECTOR_STATES = {
  INCOMPLETE: 'incomplete',
  ACTIVE: 'active'
};

const DETECTORS = [
  {
    id: 'tongue',
    label: 'Tongue',
    requires: { face: true }
  },
  {
    id: 'nail',
    label: 'Nails',
    requires: { hands: true }
  },
  {
    id: 'eye',
    label: 'Lower Eyelid',
    requires: { face: true, hands: true }
  }
];

class DetectorStore extends EventTarget {
  constructor() {
    super();
    // [id: string]: DetectorMeta
    this.detectors = new Map(DETECTORS.map((det) => [det.id, det]));
    // [id: string]: DETECTOR_STATES
    this.detectorStates = new Map();
    // currently active detector id [string]
    this.currentDetectorId = null;
  }

  init() {
    this.detectorStates.clear();

    this.detectors.forEach((detector) => {
      this.detectorStates.set(detector.id, DETECTOR_STATES.INCOMPLETE);
    });

    this.currentDetectorId = DETECTORS[0]?.id;
    this.detectorStates.set(DETECTORS[0]?.id, DETECTOR_STATES.ACTIVE);
    this.#emit();
  }

  setCurrent(detectorId) {
    if (!this.detectors.has(detectorId)) return false;
    if (this.currentDetectorId === detectorId) return false;

    if (this.currentDetectorId) {
      const prevState = this.detectorStates.get(this.currentDetectorId);
      if (prevState === DETECTOR_STATES.ACTIVE) {
        this.detectorStates.set(
          this.currentDetectorId,
          DETECTOR_STATES.INCOMPLETE
        );
      }
    }

    this.currentDetectorId = detectorId;
    this.detectorStates.set(detectorId, DETECTOR_STATES.ACTIVE);
    this.#emit();
    return true;
  }

  getSnapshot() {
    return {
      currentDetector: this.detectors.get(this.currentDetectorId), //DetectorMeta
      detectorStates: Object.fromEntries(this.detectorStates)
    };
  }

  subscribe(handler) {
    const listener = () => handler(this.getSnapshot());
    this.addEventListener('change', listener);
    handler(this.getSnapshot());
    return () => this.removeEventListener('change', listener);
  }

  #emit() {
    this.dispatchEvent(new Event('change'));
  }
}

export const detectorStore = new DetectorStore();
export { DETECTOR_STATES, DETECTORS };
