import { useEffect, useRef, useState } from 'react';
import SettingsPanel, { DEFAULT_MISSION, DEFAULT_SEED, GearIcon } from './SettingsPanel.jsx';
import { useMultiplayer } from './SessionControls.jsx';

const ASTEROIDS = [1, 2, 3, 4, 6].map((n) => `/assets/asteroids/asteroid${n}.png`);

const FLOATERS = [
  { i: 0, sx: '2%', sy: '6%', sz: 150, dx: 40, dy: -24, dur: 30, spin: 46, fade: 24, d1: -4, d2: -9, d3: -2, rot: 360, peak: 0.24 },
  { i: 1, sx: '78%', sy: '4%', sz: 120, dx: -32, dy: 20, dur: 34, spin: 52, fade: 26, d1: -8, d2: -3, d3: -6, rot: -360, peak: 0.2 },
  { i: 2, sx: '88%', sy: '62%', sz: 180, dx: -48, dy: -18, dur: 38, spin: 40, fade: 28, d1: -12, d2: -7, d3: -1, rot: 360, peak: 0.22 },
  { i: 3, sx: '-2%', sy: '58%', sz: 160, dx: 36, dy: 22, dur: 36, spin: 58, fade: 22, d1: -2, d2: -14, d3: -8, rot: -360, peak: 0.2 },
  { i: 4, sx: '18%', sy: '78%', sz: 96, dx: 18, dy: -30, dur: 28, spin: 44, fade: 20, d1: -10, d2: -5, d3: -12, rot: 360, peak: 0.18 },
  { i: 0, sx: '64%', sy: '76%', sz: 130, dx: -22, dy: -26, dur: 33, spin: 50, fade: 25, d1: -6, d2: -11, d3: -4, rot: -360, peak: 0.2 },
  { i: 2, sx: '42%', sy: '-4%', sz: 88, dx: 16, dy: 18, dur: 26, spin: 36, fade: 21, d1: -15, d2: -2, d3: -9, rot: 360, peak: 0.16 },
  { i: 3, sx: '92%', sy: '28%', sz: 72, dx: -14, dy: 16, dur: 24, spin: 32, fade: 19, d1: -1, d2: -8, d3: -5, rot: -360, peak: 0.18 },
];

export default function Title({ bridge }) {
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [mission, setMission] = useState(DEFAULT_MISSION);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const live = useMultiplayer();
  const gearRef = useRef(null);
  const closeRef = useRef(null);
  const openedOnce = useRef(false);

  function launch() {
    bridge.emit('uiBeep');
    const liveSeed = live.connected && live.seed ? live.seed : seed.trim() || DEFAULT_SEED;
    bridge.emit('startMission', {
      missionId: mission,
      seed: liveSeed,
    });
  }

  function toggleSettings() {
    bridge.emit('uiBeep');
    setSettingsOpen((open) => !open);
  }

  function closeSettings() {
    bridge.emit('uiBeep');
    setSettingsOpen(false);
  }

  function chooseMission(id) {
    if (id === mission) return;
    bridge.emit('uiBeep');
    setMission(id);
  }

  useEffect(() => {
    if (settingsOpen) {
      openedOnce.current = true;
      const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    if (openedOnce.current) gearRef.current?.focus();
    return undefined;
  }, [settingsOpen]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.repeat) return;
      if (event.code === 'Escape' && settingsOpen) {
        event.preventDefault();
        bridge.emit('uiBeep');
        setSettingsOpen(false);
        return;
      }
      if (event.code !== 'Enter' || settingsOpen) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A' || tag === 'SELECT') {
        return;
      }
      launch();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen, mission, seed, bridge, live.connected, live.seed]);

  useEffect(() => {
    if (live.code) setSeed(live.code);
    if (live.role === 'join' && live.hostMission) setMission(live.hostMission);
  }, [live.code, live.role, live.hostMission]);

  return (
    <div id="title" className="overlay home-menu">
      <div className="starDrift" aria-hidden="true" />
      <div className="shipFloaters" aria-hidden="true">
        {FLOATERS.map((rock, index) => (
          <img
            key={index}
            className="shipFloat"
            src={ASTEROIDS[rock.i]}
            alt=""
            style={{
              '--sx': rock.sx,
              '--sy': rock.sy,
              '--sz': `${rock.sz}px`,
              '--dx': `${rock.dx}px`,
              '--dy': `${rock.dy}px`,
              '--dur': `${rock.dur}s`,
              '--spin': `${rock.spin}s`,
              '--fade': `${rock.fade}s`,
              '--d1': `${rock.d1}s`,
              '--d2': `${rock.d2}s`,
              '--d3': `${rock.d3}s`,
              '--rotTarget': `${rock.rot}deg`,
              '--peakOpacity': String(rock.peak),
            }}
          />
        ))}
      </div>

      <div className="home-stage">
        <section className="heroPanel" aria-label="Mentaris">
          <h1 className="menuTitle">
            <span className="menuTitleMain">Mentaris</span>
            <span className="menuTitleSub">Prisms of Assembly</span>
          </h1>
          <div className="home-launch-row">
            <button id="launch" className="btn btn-primary home-launch" type="button" onClick={launch}>
              Launch
            </button>
          </div>
          <button
            ref={gearRef}
            type="button"
            className="home-gear"
            aria-label="Settings"
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-controls="home-settings"
            onClick={toggleSettings}
          >
            <GearIcon />
          </button>
        </section>

        <SettingsPanel
          bridge={bridge}
          seed={seed}
          mission={mission}
          hidden={!settingsOpen}
          closeRef={closeRef}
          onSeed={setSeed}
          onMission={chooseMission}
          onClose={closeSettings}
        />
      </div>
    </div>
  );
}
