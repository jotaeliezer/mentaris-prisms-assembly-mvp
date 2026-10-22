/**
 * Phaser.Sound bank aligned with Mentaris: The Arith Belt
 * (see docs/MENTARIS_ARITH_BELT_ASSETS.md). Keys = basename without .mp3.
 */
export function createAudio(scene) {
  let muted = false;
  let unlocked = false;
  let idleLoop = null;
  let advanceLoop = null;
  let motionMode = "off"; // off | idle | advance

  function has(key) {
    return !!(scene && scene.cache && scene.cache.audio && scene.cache.audio.exists(key));
  }

  function playKey(key, config) {
    if (muted || !unlocked || !scene || !scene.sound || !has(key)) return false;
    scene.sound.play(key, config || {});
    return true;
  }

  function playFirst(keys, config) {
    for (const key of keys) {
      if (playKey(key, config)) return true;
    }
    return false;
  }

  function syncMute() {
    if (scene && scene.sound) scene.sound.mute = muted;
    if (idleLoop) idleLoop.setMute(muted);
    if (advanceLoop) advanceLoop.setMute(muted);
  }

  function stopLoop(ref) {
    if (!ref) return;
    try {
      ref.stop();
    } catch (_) {
      /* ignore */
    }
  }

  function ensureLoop(key, volume) {
    if (!scene || !scene.sound || !has(key)) return null;
    const sound = scene.sound.add(key, { loop: true, volume: volume ?? 0.2 });
    sound.setMute(muted);
    return sound;
  }

  /**
   * Arith Belt: ship_idle while not thrusting (strafe/brake/coast in fly),
   * ship_advance while thrusting. Both are loops; no ship_whoosh.
   */
  function syncMotionLoops(thrusting, inFlight) {
    if (!unlocked || muted || !inFlight) {
      stopLoop(idleLoop);
      stopLoop(advanceLoop);
      motionMode = "off";
      return;
    }
    const next = thrusting ? "advance" : "idle";
    if (next === motionMode) return;
    if (next === "advance") {
      stopLoop(idleLoop);
      if (!advanceLoop) advanceLoop = ensureLoop("ship_advance", 0.25);
      if (advanceLoop && !advanceLoop.isPlaying) advanceLoop.play();
    } else {
      stopLoop(advanceLoop);
      if (!idleLoop) idleLoop = ensureLoop("ship_idle", 0.18);
      if (idleLoop && !idleLoop.isPlaying) idleLoop.play();
    }
    motionMode = next;
  }

  const api = {
    unlock() {
      if (scene && scene.sound && typeof scene.sound.unlock === "function") {
        scene.sound.unlock();
      }
      // Silent unlock gesture (Arith Belt plays gun1 at vol 0)
      if (!unlocked && has("gun1")) {
        scene.sound.play("gun1", { volume: 0 });
      }
      unlocked = true;
    },
    get muted() {
      return muted;
    },
    toggle() {
      muted = !muted;
      syncMute();
      if (muted) {
        stopLoop(idleLoop);
        stopLoop(advanceLoop);
        motionMode = "off";
      }
      return muted;
    },
    syncMotionLoops,
    /** @deprecated edge whoosh — prefer syncMotionLoops */
    playThrust() {
      /* no-op: thrust is a loop now */
    },
    menuBeep() {
      playKey("menu_beep", { volume: 0.55 });
    },
    correct() {
      playKey("correct");
    },
    wrong() {
      playFirst(["wrong_asteroid", "missed_answer"]);
    },
    pop() {
      playKey("powerup_emerges", { volume: 0.62 });
    },
    explode() {
      playKey("explosion", { volume: 0.7 });
    },
    pickup() {
      playKey("mineral_collected");
    },
    mineral() {
      api.pickup();
    },
    extractStart() {
      playFirst(["flares", "powerup_emerges"]);
    },
    extract_start() {
      api.extractStart();
    },
    launch() {
      playFirst(["session_start", "ship_advance"]);
      api.unlock();
    },
    dash() {
      playKey("dash", { volume: 0.72 });
    },
    lock() {
      playKey("menu_beep");
    },
    shot() {
      playFirst(["gun1", "shot_missile"]);
    },
    playShot(key) {
      if (key && playKey(key, { volume: 0.7 })) return true;
      return api.shot();
    },
    hit() {
      playFirst(["impact_thud", "impact", "crash"]);
    },
    damaged() {
      playKey("ship_damaged");
    },
    missionClear() {
      playKey("mission_cleared1");
    },
    destroy() {
      stopLoop(idleLoop);
      stopLoop(advanceLoop);
      idleLoop = null;
      advanceLoop = null;
      motionMode = "off";
    },
  };

  syncMute();
  return api;
}
