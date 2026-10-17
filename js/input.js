const THRUST_KEYS = new Set(["KeyW", "ArrowUp"]);
const BRAKE_KEYS = new Set(["KeyS", "ArrowDown"]);
const STRAFE_LEFT = new Set(["KeyA", "ArrowLeft"]);
const STRAFE_RIGHT = new Set(["KeyD", "ArrowRight"]);

export function createInput(canvas) {
  const down = new Set();
  const mouse = {
    x: 0,
    y: 0,
    inside: false,
    touch: false,
    held: false,
  };
  const clicks = [];

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    mouse.inside = true;
    mouse.touch = event.pointerType === "touch";
  }

  window.addEventListener("keydown", (event) => {
    down.add(event.code);
    if (
      event.code.startsWith("Arrow") ||
      event.code === "Space" ||
      THRUST_KEYS.has(event.code) ||
      BRAKE_KEYS.has(event.code)
    ) {
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    down.delete(event.code);
  });

  window.addEventListener("blur", () => {
    down.clear();
    mouse.held = false;
  });

  canvas.addEventListener("pointermove", (event) => {
    localPoint(event);
  });

  canvas.addEventListener("pointerdown", (event) => {
    localPoint(event);
    mouse.held = true;
    canvas.setPointerCapture(event.pointerId);
    clicks.push({ x: mouse.x, y: mouse.y, touch: mouse.touch });
  });

  canvas.addEventListener("pointerup", (event) => {
    localPoint(event);
    mouse.held = false;
  });

  canvas.addEventListener("pointercancel", () => {
    mouse.held = false;
  });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  return {
    down,
    mouse,
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
  };
}
