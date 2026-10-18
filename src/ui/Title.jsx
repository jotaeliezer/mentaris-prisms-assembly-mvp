import { useEffect, useRef, useState } from 'react';

const DEFAULT_SEED = 'belt-7';
const DEFAULT_MISSION = 'add';

const MISSIONS = [
  {
    id: 'add',
    name: 'Addition Drift',
    detail: 'Five addition rocks. The wormhole stays locked until the quota is met.',
  },
  {
    id: 'sub',
    name: 'Subtraction Rift',
    detail: 'Five subtraction rocks, then the same locked wormhole.',
  },
  {
    id: 'roam',
    name: 'Open belt',
    detail: 'Practice with both operations. No quota and no wormhole.',
  },
];

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

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.12.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.41 1.05.72 1.63.94l.36 2.54c.05.24.25.42.5.42h3.84c.25 0 .45-.18.5-.42l.36-2.54c.58-.22 1.12-.53 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
      />
    </svg>
  );
}

export default function Title({ bridge }) {
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [mission, setMission] = useState(DEFAULT_MISSION);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const gearRef = useRef(null);
  const closeRef = useRef(null);
  const openedOnce = useRef(false);

  function launch() {
    bridge.emit('uiBeep');
    bridge.emit('startMission', {
      missionId: mission,
      seed: seed.trim() || DEFAULT_SEED,
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
  }, [settingsOpen, mission, seed, bridge]);

  function onMissionKeyDown(event) {
    const ids = MISSIONS.map((item) => item.id);
    const index = ids.indexOf(mission);
    let next = null;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      next = ids[(index + 1) % ids.length];
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      next = ids[(index - 1 + ids.length) % ids.length];
    }
    if (!next) return;
    event.preventDefault();
    chooseMission(next);
    document.getElementById(`mission-${next}`)?.focus();
  }

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
            <span className="menuTitleMain">MENTARIS</span>
            <span className="menuTitleSub">The Arith Belt</span>
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

        <div
          id="home-settings"
          className="home-settings"
          role="dialog"
          aria-modal="false"
          aria-labelledby="home-settings-title"
          hidden={!settingsOpen}
        >
          <div className="home-settings-head">
            <div>
              <h2 id="home-settings-title">Settings</h2>
              <p className="home-settings-note">
                The same seed builds the same belt. Launch uses the mission and seed chosen here.
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              className="btn home-settings-close"
              onClick={closeSettings}
            >
              Close
            </button>
          </div>

          <label className="seed-field" htmlFor="seed">
            World seed
            <input
              id="seed"
              value={seed}
              maxLength={24}
              autoComplete="off"
              spellCheck={false}
              aria-label="World seed"
              onChange={(event) => setSeed(event.target.value)}
            />
          </label>

          <div
            className="home-missions"
            role="radiogroup"
            aria-label="Mission"
            onKeyDown={onMissionKeyDown}
          >
            {MISSIONS.map((item) => {
              const selected = mission === item.id;
              return (
                <button
                  key={item.id}
                  id={`mission-${item.id}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`btn home-mission${selected ? ' is-selected' : ''}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => chooseMission(item.id)}
                >
                  {item.name}
                  <span>{item.detail}</span>
                </button>
              );
            })}
          </div>

          <ul className="keys">
            <li>
              <kbd>W</kbd> thrust
            </li>
            <li>
              <kbd>A</kbd>
              <kbd>D</kbd> strafe
            </li>
            <li>
              <kbd>S</kbd> brake/reverse
            </li>
            <li>Mouse aims the nose</li>
            <li>
              <kbd>Q</kbd> lower layer
            </li>
            <li>
              <kbd>E</kbd> higher layer
            </li>
            <li>Click an asteroid to target</li>
            <li>Digits type the answer</li>
            <li>
              <kbd>⌫</kbd> erase
            </li>
            <li>
              <kbd>F</kbd> fabrication
            </li>
            <li>
              <kbd>P</kbd> pause
            </li>
            <li>
              <kbd>M</kbd> mute
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
