filter-camera.ts: owns the DOM layout (video + overlay) and routes events between controller and overlay. (LIT component)

detection-controller.ts: owns the detection loop + model calls, publishes detect results. (Not Lit Component - Since it does not have a canvas element anymore)

pixi-overlay.ts: owns Pixi app lifecycle (init/mount/destroy), creates the stage “roots” (overlayLayer, uiLayer). (LIT Component - Mounts the app)

face-overlay.ts: a “scene graph module” — builds a container subtree and has update(faceResult) to redraw. (Not LIT Component)

filter-bar.ts: creates pixi-ui buttons inside uiLayer, emits filter-change upward. (Not LIT Component)

Layers never import features.
Features may be added to layers.

OverlayLayer should never import FilterBar
