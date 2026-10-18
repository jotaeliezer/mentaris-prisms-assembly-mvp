import { useEffect, useState } from 'react';
import '../styles/game.css';
import Title from './Title.jsx';
import Hud from './Hud.jsx';
import Fab from './Fab.jsx';
import Pause from './Pause.jsx';
import Clear from './Clear.jsx';
import Extract from './Extract.jsx';

export default function App({ bridge }) {
  const [snapshot, setSnapshot] = useState(() => bridge.getSnapshot());

  useEffect(() => bridge.subscribe(setSnapshot), [bridge]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.repeat) return;
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
      if (event.code === 'KeyE' && mode === 'fly' && snap.extractAvailable != null) {
        bridge.emit('openExtract', { rockId: snap.extractAvailable });
        return;
      }
      if (event.code === 'Enter' && mode === 'extract') {
        bridge.emit('extractSubmit');
        return;
      }
      if (event.code === 'KeyM' && mode !== 'title') {
        bridge.emit('toggleMute');
      }
      if (event.code === 'Enter' && (mode === 'title' || mode === 'clear')) {
        bridge.emit('startMission', { missionId: 'add' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bridge]);

  const mode = snapshot.mode;
  const showHud = mode !== 'title';
  const showExtractUi =
    mode === 'fly' || mode === 'extract' || snapshot.extractMode || snapshot.extractToast;

  return (
    <div id="ui-root" aria-label="Mentaris UI">
      {mode === 'title' && <Title bridge={bridge} />}
      {showHud && <Hud bridge={bridge} snapshot={snapshot} />}
      {showExtractUi && <Extract bridge={bridge} snapshot={snapshot} />}
      {mode === 'fab' && <Fab bridge={bridge} snapshot={snapshot} />}
      {mode === 'paused' && <Pause bridge={bridge} />}
      {mode === 'clear' && <Clear bridge={bridge} snapshot={snapshot} />}
    </div>
  );
}
