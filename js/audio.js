export function createAudio() {
  let ctx = null;
  let muted = false;

  function context() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain) {
    const ac = context();
    if (!ac || muted) return;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    amp.gain.value = gain;
    amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  }

  return {
    unlock() {
      context();
    },
    get muted() {
      return muted;
    },
    toggle() {
      muted = !muted;
      return muted;
    },
    launch() {
      tone(440, 0.12, "triangle", 0.05);
      tone(660, 0.18, "sine", 0.04);
    },
    lock() {
      tone(660, 0.07, "sine", 0.04);
    },
    shot() {
      tone(280, 0.09, "triangle", 0.05);
      tone(520, 0.06, "sine", 0.03);
    },
    correct() {
      tone(523, 0.08, "sine", 0.05);
      tone(784, 0.14, "triangle", 0.04);
    },
    wrong() {
      tone(128, 0.16, "square", 0.03);
    },
  };
}
