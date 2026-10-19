import { useCallback, useEffect, useState } from 'react';
import '../styles/game.css';
import { cleanSeed } from '../game/state.js';
import Title from './Title.jsx';
import Hud from './Hud.jsx';
import Fab from './Fab.jsx';
import Pause from './Pause.jsx';
import Clear from './Clear.jsx';
import Extract from './Extract.jsx';
import SettingsPanel, { DEFAULT_MISSION, DEFAULT_SEED } from './SettingsPanel.jsx';
import { useMultiplayer } from './SessionControls.jsx';

const FLIGHT_SETTINGS_NOTE =
  'The same seed builds the same belt. Close resumes this flight. A changed seed or mission starts that flight.';

export default function App({ bridge }) {
  const [snapshot, setSnapshot] = useState(() => bridge.getSnapshot());
  const [flightSettingsOpen, setFlightSettingsOpen] = useState(false);
  const [flightSeed, setFlightSeed] = useState(DEFAULT_SEED);
  const [flightMission, setFlightMission] = useState(DEFAULT_MISSION);
  const live = useMultiplayer();

  useEffect(() => bridge.subscribe(setSnapshot), [bridge]);

  useEffect(() => {
    if (!flightSettingsOpen) return;
    if (live.code) setFlightSeed(live.code);
    if (live.role === 'join' && live.hostMission) setFlightMission(live.hostMission);
  }, [flightSettingsOpen, live.code, live.role, live.hostMission]);

  const closeFlightSettings = useCallback(() => {
    const snap = bridge.getSnapshot();
    const cleaned = cleanSeed(flightSeed);
    const seedNow = snap.seed || DEFAULT_SEED;
    const missionNow = snap.missionId || DEFAULT_MISSION;
    const changed = cleaned !== seedNow || flightMission !== missionNow;
    bridge.emit('uiBeep');
    setFlightSettingsOpen(false);
    if (changed) {
      bridge.emit('startMission', { missionId: flightMission, seed: cleaned });
      return;
    }
    if (snap.mode === 'paused') bridge.emit('setPaused', false);
  }, [bridge, flightSeed, flightMission]);

  const openFlightSettings = useCallback(() => {
    const snap = bridge.getSnapshot();
    if (snap.mode !== 'fly') return;
    setFlightSeed(snap.seed || DEFAULT_SEED);
    setFlightMission(snap.missionId || DEFAULT_MISSION);
    bridge.emit('uiBeep');
    bridge.emit('setPaused', true);
    setFlightSettingsOpen(true);
  }, [bridge]);

  function onFlightGear() {
    if (flightSettingsOpen) closeFlightSettings();
    else openFlightSettings();
  }

  function chooseFlightMission(id) {
    if (id === flightMission) return;
    bridge.emit('uiBeep');
    setFlightMission(id);
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (event.repeat) return;
      if (flightSettingsOpen) {
        if (event.code === 'Escape') {
          event.preventDefault();
          closeFlightSettings();
        }
        return;
      }
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const snap = bridge.getSnapshot();
      const mode = snap.mode;
      if (event.code === 'KeyP' && mode === 'fly') {
        bridge.emit('setPaused', true);
        return;
      }
      if (event.code === 'KeyP' && mode === 'paused') {
        bridge.emit('setPaused', false);
        return;
      }
      if (event.code === 'KeyF' && mode === 'fly') {
        bridge.emit('setFab', true);
        return;
      }
      if (event.code === 'KeyF' && mode === 'fab') {
        bridge.emit('setFab', false);
        return;
      }
      if (event.code === 'Escape' && mode === 'fab') {
        bridge.emit('setFab', false);
        return;
      }
      if (event.code === 'Escape' && mode === 'extract') {
        bridge.emit('cancelExtract');
        return;
      }
      if (event.code === 'Enter' && mode === 'extract') {
        bridge.emit('extractSubmit');
        return;
      }
      if (event.code === 'KeyM' && mode !== 'title') {
        bridge.emit('toggleMute');
      }
      if (event.code === 'Enter' && mode === 'clear') {
        bridge.emit('startMission', { missionId: 'add' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bridge, flightSettingsOpen, closeFlightSettings]);

  const mode = snapshot.mode;
  const showHud = mode !== 'title';
  const showExtractUi =
    mode === 'fly' || mode === 'extract' || snapshot.extractMode || snapshot.extractToast;

  return (
    <div id="ui-root" aria-label="Mentaris UI">
      {mode === 'title' && <Title bridge={bridge} />}
      {showHud && (
        <Hud
          bridge={bridge}
          snapshot={snapshot}
          showFlightGear={mode === 'fly' || flightSettingsOpen}
          flightSettingsOpen={flightSettingsOpen}
          onFlightGear={onFlightGear}
        />
      )}
      {flightSettingsOpen && (
        <div className="overlay flight-settings">
          <SettingsPanel
            id="flight-settings"
            titleId="flight-settings-title"
            seedInputId="flight-seed"
            missionIdPrefix="flight-mission"
            seed={flightSeed}
            mission={flightMission}
            modal
            bridge={bridge}
            inGame
            note={FLIGHT_SETTINGS_NOTE}
            onSeed={setFlightSeed}
            onMission={chooseFlightMission}
            onClose={closeFlightSettings}
          />
        </div>
      )}
      {showExtractUi && <Extract bridge={bridge} snapshot={snapshot} />}
      {mode === 'fab' && <Fab bridge={bridge} snapshot={snapshot} />}
      {mode === 'paused' && !flightSettingsOpen && <Pause bridge={bridge} />}
      {mode === 'clear' && <Clear bridge={bridge} snapshot={snapshot} />}
    </div>
  );
}
