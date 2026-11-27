// Keyboard and mouse input for Gobble Dash, kept apart from the game rules.
// One job: turn key presses and clicks into the intents the world reads each step.
export const KEY_JUMP = 'jump';
export const KEY_LEFT = 'left';
export const KEY_RIGHT = 'right';
export const KEY_HIDE = 'hide';
export const KEY_START = 'start';
export const KEY_PAUSE = 'pause';
export const KEY_MUTE = 'mute';

const KEY_BINDINGS = {
  Space: KEY_JUMP,
  ArrowUp: KEY_JUMP,
  KeyW: KEY_JUMP,
  ArrowLeft: KEY_LEFT,
  KeyA: KEY_LEFT,
  ArrowRight: KEY_RIGHT,
  KeyD: KEY_RIGHT,
  ArrowDown: KEY_HIDE,
  KeyS: KEY_HIDE,
  Enter: KEY_START,
  KeyP: KEY_PAUSE,
  KeyM: KEY_MUTE,
};

/** Reads the keyboard and the mouse; main.js asks it once per step and then clears the edges. */
export class InputReader {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseClicked = false;
  }

  attach(canvas) {
    window.addEventListener('keydown', (event) => {
      const intent = KEY_BINDINGS[event.code];
      if (!intent) return;
      event.preventDefault();
      if (!event.repeat) this.pressed.add(intent);
      this.held.add(intent);
    });
    window.addEventListener('keyup', (event) => {
      const intent = KEY_BINDINGS[event.code];
      if (intent) this.held.delete(intent);
    });
    canvas.addEventListener('pointerdown', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
      this.mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
      this.mouseClicked = true;
      this.pressed.add(KEY_JUMP);
      this.pressed.add(KEY_START);
    });
    window.addEventListener('blur', () => {
      this.held.clear();
    });
  }

  isHeld(intent) {
    return this.held.has(intent);
  }

  /** True once for a fresh press; the game loop clears edges after each step. */
  wasPressed(intent) {
    return this.pressed.has(intent);
  }

  /** A click counts as a jump and as a start/restart tap. */
  clickHappened() {
    return this.mouseClicked;
  }

  clearEdges() {
    this.pressed.clear();
    this.mouseClicked = false;
  }
}
