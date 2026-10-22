import { useEffect, useRef, useState } from 'react';
import { readPilotName, writePilotName } from '../game/pilot.js';
import { cleanSeed } from '../game/state.js';
import { freshFlightSeed, generateSessionCode } from '../multiplayer/sessionCode.js';
import {
  ASSEMBLY_LIMIT,
  cloudConfigured,
  createAccount,
  createAssembly,
  deleteAssembly,
  listAssemblies,
  loadProgress,
  playOnThisBrowser,
  readPilot,
  signInAccount,
  signOutPilot,
} from '../save/cloud.js';
import { deleteLocalFlight, listLocalFlights } from '../save/local.js';
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
  const [pilot, setPilot] = useState(readPilotName);
  const [seed, setSeed] = useState(freshFlightSeed);
  const [mission, setMission] = useState(DEFAULT_MISSION);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assemblies, setAssemblies] = useState([]);
  const [localFlights, setLocalFlights] = useState([]);
  const [cloudOn, setCloudOn] = useState(false);
  const [account, setAccount] = useState(null);
  const [authMode, setAuthMode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cloudNote, setCloudNote] = useState('');
  const [assemblyName, setAssemblyName] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const live = useMultiplayer();
  const gearRef = useRef(null);
  const closeRef = useRef(null);
  const openedOnce = useRef(false);

  function launchFresh() {
    if (live.needsShip || live.sessionFull) return;
    bridge.emit('uiBeep');
    const liveSeed = live.connected && live.seed ? live.seed : seed.trim() || DEFAULT_SEED;
    bridge.emit('startMission', {
      missionId: mission,
      seed: liveSeed,
    });
  }

  async function refreshHome() {
    setLocalFlights(listLocalFlights());
    if (!cloudConfigured()) {
      setCloudOn(false);
      setAccount(null);
      setAssemblies([]);
      return;
    }
    const pilot = await readPilot();
    setCloudOn(true);
    setAccount(pilot);
    if (!pilot.signedIn) {
      setAssemblies([]);
      return;
    }
    const result = await listAssemblies();
    if (result.error) setCloudNote(result.error);
    setAssemblies(result.assemblies || []);
  }

  async function useThisBrowser() {
    if (busy) return;
    setBusy(true);
    bridge.emit('uiBeep');
    writePilotName(pilot);
    const result = await playOnThisBrowser();
    setBusy(false);
    if (!result.ok) {
      setCloudNote(result.error || 'Could not save on this browser. Starting this belt without an assembly.');
      launchFresh();
      return;
    }
    setAccount({
      signedIn: true,
      anonymous: result.anonymous !== false,
      email: result.email || '',
    });
    setCloudNote('');
    setAuthMode('');
    const listed = await listAssemblies();
    if (listed.error) setCloudNote(listed.error);
    setAssemblies(listed.assemblies || []);
  }

  async function submitAccount(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    bridge.emit('uiBeep');
    const result =
      authMode === 'signin' ? await signInAccount(email, password) : await createAccount(email, password);
    setBusy(false);
    if (!result.ok) {
      setCloudNote(result.error || 'Could not sign in.');
      return;
    }
    setPassword('');
    setAuthMode('');
    if (result.pending) {
      setCloudNote('Check that email to finish. Then sign in. This pilot keeps the same assemblies once the account is confirmed.');
    } else {
      setCloudNote('');
    }
    refreshHome();
  }

  async function leaveAccount() {
    if (busy) return;
    setBusy(true);
    bridge.emit('uiBeep');
    const result = await signOutPilot();
    setBusy(false);
    setAuthMode('');
    setPassword('');
    if (!result.ok) {
      setCloudNote(result.error || 'Could not sign out.');
      return;
    }
    setCloudNote('');
    refreshHome();
  }

  function continueLocal(row) {
    if (busy || live.needsShip || live.sessionFull || !row || !row.progress) return;
    bridge.emit('uiBeep');
    bridge.emit('startMission', {
      missionId: row.missionId,
      seed: row.seed,
      progress: row.progress,
    });
  }

  function removeLocal(id) {
    if (confirmDelete !== 'local:' + id) {
      setConfirmDelete('local:' + id);
      return;
    }
    deleteLocalFlight(id);
    setConfirmDelete('');
    setLocalFlights(listLocalFlights());
  }

  async function beginAssembly(row) {
    if (busy || live.needsShip || live.sessionFull) return;
    setBusy(true);
    bridge.emit('uiBeep');
    const loaded = await loadProgress(row.id);
    setBusy(false);
    if (!loaded.ok) {
      setCloudNote(loaded.error || 'Could not open that assembly.');
      return;
    }
    if (loaded.progress) {
      bridge.emit('startMission', {
        missionId: row.missionId,
        seed: row.seed,
        assemblyId: row.id,
        progress: loaded.progress,
      });
      return;
    }
    bridge.emit('startMission', {
      missionId: row.missionId || mission,
      seed: row.seed,
      assemblyId: row.id,
    });
  }

  async function makeAssembly() {
    if (busy || assemblies.length >= ASSEMBLY_LIMIT) return;
    const title = assemblyName.trim();
    if (!title) {
      setCloudNote('Name the assembly first.');
      return;
    }
    setBusy(true);
    bridge.emit('uiBeep');
    const created = await createAssembly({
      name: title,
      seed: cleanSeed(generateSessionCode()),
      missionId: mission,
    });
    setBusy(false);
    if (!created.ok || !created.assembly) {
      setCloudNote(created.error || 'Could not create the assembly.');
      return;
    }
    setAssemblyName('');
    setCloudNote('');
    bridge.emit('startMission', {
      missionId: created.assembly.missionId,
      seed: created.assembly.seed,
      assemblyId: created.assembly.id,
    });
  }

  async function removeAssembly(id) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setBusy(true);
    const result = await deleteAssembly(id);
    setBusy(false);
    setConfirmDelete('');
    if (!result.ok) {
      setCloudNote(result.error || 'Could not delete that assembly.');
      return;
    }
    refreshHome();
  }

  function launch() {
    launchFresh();
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
    refreshHome();
  }, []);

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
      if (event.code !== 'Enter' || settingsOpen || cloudOn) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A' || tag === 'SELECT') {
        return;
      }
      launch();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen, mission, seed, bridge, live.connected, live.seed, live.needsShip, live.sessionFull, cloudOn]);

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
          <label className="pilot-field" htmlFor="pilot-name">
            Pilot name
            <input
              id="pilot-name"
              value={pilot}
              maxLength={28}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                const next = event.target.value;
                setPilot(next);
                writePilotName(next);
              }}
              onBlur={() => setPilot(writePilotName(pilot))}
            />
          </label>
          {localFlights.length ? (
            <div className="assembly-board">
              <p className="assembly-label">Saved on this browser</p>
              <ul className="assembly-list">
                {localFlights.map((row) => (
                  <li key={row.id} className="assembly-row">
                    <div className="assembly-copy">
                      <strong>{row.name}</strong>
                      <span>
                        Layer {row.layer} · {row.solved} solved · {row.seed}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn assembly-continue"
                      disabled={busy || live.needsShip || live.sessionFull}
                      onClick={() => continueLocal(row)}
                    >
                      Continue
                    </button>
                    <button
                      type="button"
                      className="assembly-delete"
                      disabled={busy}
                      onClick={() => removeLocal(row.id)}
                    >
                      {confirmDelete === 'local:' + row.id ? 'Confirm' : 'Delete'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {cloudOn && account && !account.signedIn ? (
            <div className="assembly-board">
              <p className="assembly-label">Save</p>
              <p className="assembly-empty">
                An account keeps assemblies with you. A flight can also be saved from the pause menu on this browser, with no sign-in, and launched from the list above.
              </p>
              <div className="auth-actions">
                <button className="btn btn-primary" type="button" disabled={busy} onClick={useThisBrowser}>
                  Play on this browser
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    bridge.emit('uiBeep');
                    setAuthMode('signin');
                  }}
                >
                  Sign in
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    bridge.emit('uiBeep');
                    setAuthMode('create');
                  }}
                >
                  Create account
                </button>
              </div>
              {authMode ? (
                <form className="auth-form" onSubmit={submitAccount}>
                  <input
                    type="email"
                    value={email}
                    autoComplete="email"
                    placeholder="Email"
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <input
                    type="password"
                    value={password}
                    autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                    placeholder="Password"
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    {authMode === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                </form>
              ) : null}
              {cloudNote ? <p className="assembly-note">{cloudNote}</p> : null}
              <button
                id="launch"
                className="btn auth-launch"
                type="button"
                disabled={live.needsShip || live.sessionFull}
                onClick={launch}
              >
                Launch without saving
              </button>
            </div>
          ) : null}
          {cloudOn && account && account.signedIn ? (
            <div className="assembly-board">
              {account.anonymous ? (
                <div className="save-banner is-browser" role="status">
                  <strong>Saved on this browser only.</strong>
                  <span>These assemblies stay in this browser. They do not follow an account.</span>
                  <div className="auth-actions">
                    <button
                      className="btn"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        bridge.emit('uiBeep');
                        setAuthMode(authMode === 'create' ? '' : 'create');
                      }}
                    >
                      Add an account
                    </button>
                    <button
                      className="btn"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        bridge.emit('uiBeep');
                        setAuthMode(authMode === 'signin' ? '' : 'signin');
                      }}
                    >
                      Sign in
                    </button>
                    <button className="assembly-delete" type="button" disabled={busy} onClick={leaveAccount}>
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="save-banner is-account" role="status">
                  <strong>Signed in{account.email ? ' as ' + account.email : ''}.</strong>
                  <span>These assemblies follow this account.</span>
                  <button className="assembly-delete" type="button" disabled={busy} onClick={leaveAccount}>
                    Sign out
                  </button>
                </div>
              )}
              {authMode === 'create' && account.anonymous ? (
                <form className="auth-form" onSubmit={submitAccount}>
                  <p className="assembly-empty">
                    Adding an account keeps the assemblies you already made on this browser.
                  </p>
                  <input
                    type="email"
                    value={email}
                    autoComplete="email"
                    placeholder="Email"
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <input
                    type="password"
                    value={password}
                    autoComplete="new-password"
                    placeholder="Password"
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    Add an account
                  </button>
                </form>
              ) : null}
              {authMode === 'signin' && account.anonymous ? (
                <form className="auth-form" onSubmit={submitAccount}>
                  <p className="assembly-empty">
                    Signing in to an existing account leaves this browser's assemblies behind.
                  </p>
                  <input
                    type="email"
                    value={email}
                    autoComplete="email"
                    placeholder="Email"
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <input
                    type="password"
                    value={password}
                    autoComplete="current-password"
                    placeholder="Password"
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    Sign in
                  </button>
                </form>
              ) : null}
              <p className="assembly-label">Assemblies</p>
              {assemblies.length === 0 ? (
                <p className="assembly-empty">No assemblies yet. Name one to start a belt.</p>
              ) : (
                <ul className="assembly-list">
                  {assemblies.map((row) => (
                    <li key={row.id} className="assembly-row">
                      <div className="assembly-copy">
                        <strong>{row.name}</strong>
                        <span>
                          {row.started
                            ? 'Layer ' + row.layer + ' · ' + row.score + ' solved'
                            : 'Not started'}
                          {' · '}
                          {row.seed}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn assembly-continue"
                        disabled={busy || live.needsShip || live.sessionFull}
                        onClick={() => beginAssembly(row)}
                      >
                        {row.started ? 'Continue' : 'Launch'}
                      </button>
                      <button
                        type="button"
                        className="assembly-delete"
                        disabled={busy}
                        onClick={() => removeAssembly(row.id)}
                      >
                        {confirmDelete === row.id ? 'Confirm' : 'Delete'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {assemblies.length < ASSEMBLY_LIMIT ? (
                <form
                  className="assembly-create"
                  onSubmit={(event) => {
                    event.preventDefault();
                    makeAssembly();
                  }}
                >
                  <input
                    id="assembly-name"
                    value={assemblyName}
                    maxLength={24}
                    placeholder="Assembly name"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => setAssemblyName(event.target.value)}
                  />
                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    New assembly
                  </button>
                </form>
              ) : (
                <p className="assembly-empty">Five assemblies is the limit. Delete one to make another.</p>
              )}
              {cloudNote ? <p className="assembly-note">{cloudNote}</p> : null}
            </div>
          ) : null}
          {!cloudOn ? (
            <div className="home-launch-row">
              <button
                id="launch"
                className="btn btn-primary home-launch"
                type="button"
                disabled={live.needsShip || live.sessionFull}
                onClick={launch}
              >
                Launch
              </button>
              {cloudNote ? <p className="assembly-note">{cloudNote}</p> : null}
            </div>
          ) : null}
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
