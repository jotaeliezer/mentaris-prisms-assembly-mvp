const THRUST_KEYS = new Set(['KeyW', 'ArrowUp']);
const BRAKE_KEYS = new Set(['KeyS', 'ArrowDown']);
const STRAFE_LEFT = new Set(['KeyA', 'ArrowLeft']);
const STRAFE_RIGHT = new Set(['KeyD', 'ArrowRight']);

function isTextFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

/**
 * Keyboard + pointer input bound to a canvas (or Phaser canvas element).
 * Screen coords stay canvas-local; call prepareWorldPoints(cam.getWorldPoint) each fly frame.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ canCaptureKeys?: () => boolean }} [options]
 *   canCaptureKeys — false on title/pause/fab so seed typing never arms WASD
 */
export function createInput(canvas, options = {}) {
  const canCaptureKeys = options.canCaptureKeys || (() => true);
  const down = new Set();
  const mouse = {
    x: 0,
    y: 0,
    worldX: 0,
    worldY: 0,
    inside: false,
    touch: false,
    held: false,
  };
  const clicks = [];
  let wheel = 0;

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    mouse.inside = true;
    mouse.touch = event.pointerType === 'touch';
  }

  function onKeyDown(event) {
    // Never steal seed / form typing; only arm flight keys while fly is active.
    if (isTextFocused() || !canCaptureKeys()) return;
    down.add(event.code);
    if (
      event.code.startsWith('Arrow') ||
      event.code === 'Space' ||
      THRUST_KEYS.has(event.code) ||
      BRAKE_KEYS.has(event.code)
    ) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    down.delete(event.code);
  }

  function clearKeys() {
    down.clear();
    mouse.held = false;
  }

  function onBlur() {
    clearKeys();
  }

  function onPointerMove(event) {
    localPoint(event);
  }

  function onPointerDown(event) {
    localPoint(event);
    mouse.held = true;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    clicks.push({ x: mouse.x, y: mouse.y, touch: mouse.touch });
  }

  function onPointerUp(event) {
    localPoint(event);
    mouse.held = false;
  }

  function onPointerCancel() {
    mouse.held = false;
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  function onWheel(event) {
    wheel += event.deltaY || 0;
    event.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('contextmenu', onContextMenu);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return {
    down,
    mouse,
    clearKeys,
    /** Map canvas-local pointer + queued clicks through Phaser camera world projection. */
    prepareWorldPoints(getWorldPoint) {
      const aim = getWorldPoint(mouse.x, mouse.y);
      mouse.worldX = aim.x;
      mouse.worldY = aim.y;
      for (const click of clicks) {
        const world = getWorldPoint(click.x, click.y);
        click.worldX = world.x;
        click.worldY = world.y;
      }
    },
    thrust() {
      return [...THRUST_KEYS].some((code) => down.has(code));
    },
    brake() {
      return [...BRAKE_KEYS].some((code) => down.has(code));
    },
    strafe() {
      let s = 0;
      if ([...STRAFE_LEFT].some((code) => down.has(code))) s -= 1;
      if ([...STRAFE_RIGHT].some((code) => down.has(code))) s += 1;
      return s;
    },
    pressed(code) {
      return down.has(code);
    },
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
    /** 1 = wheel down (next slot), -1 = wheel up, 0 = none. One step per frame. */
    takeWheel() {
      const delta = wheel;
      wheel = 0;
      if (Math.abs(delta) < 1) return 0;
      return delta > 0 ? 1 : -1;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('wheel', onWheel);
      clearKeys();
    },
  };
}
