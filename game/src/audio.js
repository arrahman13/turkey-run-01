// Gobble Dash: every sound, synthesised live with WebAudio. No audio files, no network.
// One job: small named sounds the game calls when things happen.
export class SoundBank {
  constructor() {
    this.context = null;
    this.muted = false;
  }

  /** Create the audio context on a real user gesture; safe to call any time. */
  ensure() {
    try {
      if (!this.context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.context = new AudioContextClass();
      }
      if (this.context.state === 'suspended') void this.context.resume();
    } catch {
      this.context = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(frequency, duration, type, volume, slideTo) {
    if (!this.context || this.muted) return;
    try {
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    } catch {
      // Sound is garnish: a failed note never stops the game.
    }
  }

  /** A jump: a quick rising chirp. */
  playJump() {
    this.tone(320, 0.16, 'sine', 0.16, 640);
  }

  /** A gobble: three fast low clucks. */
  playGobble() {
    if (!this.context || this.muted) return;
    [0, 0.09, 0.18].forEach((delay, index) => {
      window.setTimeout(() => this.tone(index === 2 ? 180 : 240, 0.09, 'square', 0.1, 140), delay * 1000);
    });
  }

  /** Corn collected: a bright two-note pluck. */
  playCollected() {
    this.tone(660, 0.09, 'triangle', 0.16);
    window.setTimeout(() => this.tone(880, 0.12, 'triangle', 0.16), 70);
  }

  /** Golden feather: a little rising arpeggio. */
  playFeather() {
    [523, 659, 784, 1047].forEach((frequency, index) => {
      window.setTimeout(() => this.tone(frequency, 0.12, 'triangle', 0.15), index * 70);
    });
  }

  /** Spotted: the farmer's alarm, two sharp honks. */
  playSpotted() {
    this.tone(220, 0.14, 'sawtooth', 0.16, 180);
    window.setTimeout(() => this.tone(220, 0.14, 'sawtooth', 0.16, 180), 170);
  }

  /** Hurt: a dull thud downwards. */
  playHit() {
    this.tone(160, 0.22, 'sawtooth', 0.2, 60);
  }

  /** Caught: a sad descending slide. */
  playCaught() {
    this.tone(392, 0.5, 'triangle', 0.2, 98);
  }

  /** Escaped: a short happy fanfare. */
  playEscaped() {
    [523, 659, 784, 1047, 1319].forEach((frequency, index) => {
      window.setTimeout(() => this.tone(frequency, 0.16, 'triangle', 0.16), index * 90);
    });
  }

  /** A menu tap. */
  playClick() {
    this.tone(520, 0.06, 'sine', 0.12);
  }
}
