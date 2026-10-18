import { useEffect, useState } from 'react';
import { multiplayer } from '../multiplayer/session.js';
import { normalizeSessionCode, sessionCodeError } from '../multiplayer/sessionCode.js';

export function useMultiplayer() {
  const [snap, setSnap] = useState(() => multiplayer.getSnapshot());
  useEffect(() => multiplayer.subscribe(setSnap), []);
  return snap;
}

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

function playerLabel(count) {
  if (count === 1) return '1 player';
  return count + ' players';
}

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the selection copy */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function SessionControls({
  bridge,
  variant,
  inGame = false,
  missionId = 'add',
  onSeed,
  onMission,
}) {
  const mp = useMultiplayer();
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState('');
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mp.status !== 'connecting') setBusy(false);
  }, [mp.status]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (variant !== 'hud' || !open) return undefined;
    function onKeyDown(event) {
      if (event.code !== 'Escape') return;
      setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, variant]);

  if (variant === 'hud' && !mp.available) return null;

  async function onHost() {
    if (busy || !mp.available) return;
    setBusy(true);
    setLocalError('');
    if (bridge) bridge.emit('uiBeep');
    const { code, done } = multiplayer.host();
    if (onSeed) onSeed(code);
    const ok = await done;
    setBusy(false);
    if (!ok) return;
    if (inGame && bridge) {
      bridge.emit('startMission', { missionId: missionId || 'add', seed: code });
    }
    setOpen(false);
  }

  async function onJoin(event) {
    event.preventDefault();
    const code = normalizeSessionCode(draft);
    const error = sessionCodeError(code);
    if (error) {
      setLocalError(error);
      return;
    }
    if (busy || !mp.available) return;
    setBusy(true);
    setLocalError('');
    if (bridge) bridge.emit('uiBeep');
    if (onSeed) onSeed(code);
    const ok = await multiplayer.join(code);
    setBusy(false);
    if (!ok) return;
    const snap = multiplayer.getSnapshot();
    if (onMission && snap.hostMission) onMission(snap.hostMission);
    if (inGame && bridge) {
      bridge.emit('startMission', {
        missionId: snap.hostMission || missionId || 'add',
        seed: code,
      });
    }
    setOpen(false);
  }

  async function onReconnect() {
    if (busy || !mp.available) return;
    setBusy(true);
    setLocalError('');
    if (bridge) bridge.emit('uiBeep');
    const ok = await multiplayer.reconnect();
    setBusy(false);
    if (!ok) return;
    const snap = multiplayer.getSnapshot();
    if (onSeed && snap.code) onSeed(snap.code);
    if (onMission && snap.hostMission) onMission(snap.hostMission);
    if (inGame && bridge && snap.code) {
      bridge.emit('startMission', {
        missionId: snap.hostMission || missionId || 'add',
        seed: snap.code,
      });
    }
  }

  async function onLeave() {
    if (bridge) bridge.emit('uiBeep');
    await multiplayer.leave();
    setDraft('');
    setLocalError('');
  }

  async function onCopy() {
    if (!mp.code) return;
    const ok = await copyText(mp.code);
    if (ok) setCopied(true);
  }

  const message = localError || (mp.status === 'error' || mp.status === 'unavailable' ? mp.message : '');
  const pending = !localError && mp.status === 'connecting' ? mp.message : '';
  const showJoin = !mp.connected;
  const countText = mp.connected ? playerLabel(mp.playerCount) : mp.status === 'connecting' ? 'Connecting' : 'Offline';

  const body = (
    <div className="session-body">
      <p className="session-note">
        Host a code or join one. That code is the world seed, so everyone gets the same belt.
        Pick the same mission as the host. Rocks, missiles, and ore stay on your ship.
      </p>
      {mp.connected && (
        <p className="session-status">
          You are {mp.selfTag || 'in the session'}
          {mp.playerCount ? ' · ' + playerLabel(mp.playerCount) : ''}. Ships on your layer show up live.
        </p>
      )}
      {pending ? <p className="session-status">{pending}</p> : null}
      {message ? <p className="session-error">{message}</p> : null}
      {showJoin && (
        <>
          <div className="session-actions">
            <button
              id={variant === 'home' ? 'session-host' : 'hud-session-host'}
              type="button"
              className="btn btn-primary"
              disabled={!mp.available || busy}
              onClick={onHost}
            >
              {busy ? 'Connecting…' : 'Host'}
            </button>
            {mp.status === 'error' && mp.code ? (
              <button type="button" className="btn" disabled={busy} onClick={onReconnect}>
                Reconnect
              </button>
            ) : null}
          </div>
          <form className="session-join" onSubmit={onJoin}>
            <label className="session-join-label" htmlFor={variant === 'home' ? 'session-join-code' : 'hud-session-join-code'}>
              Join with a code
              <input
                id={variant === 'home' ? 'session-join-code' : 'hud-session-join-code'}
                value={draft}
                maxLength={8}
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="characters"
                placeholder="AB12CD"
                aria-label="Session code"
                disabled={!mp.available || busy}
                onChange={(event) => {
                  setDraft(normalizeSessionCode(event.target.value));
                  setLocalError('');
                }}
              />
            </label>
            <button
              id={variant === 'home' ? 'session-join' : 'hud-session-join'}
              type="submit"
              className="btn"
              disabled={!mp.available || busy}
            >
              Join
            </button>
          </form>
        </>
      )}
      {mp.connected && (
        <button type="button" className="btn" onClick={onLeave}>
          Leave session
        </button>
      )}
    </div>
  );

  const chip = mp.code ? (
    <div className="session-chip">
      <span className="session-code" id={variant === 'hud' ? 'hud-session-code' : 'session-code'}>
        {mp.code}
      </span>
      <button
        type="button"
        className="btn session-copy"
        id={variant === 'hud' ? 'hud-session-copy' : 'session-copy'}
        onClick={onCopy}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span className="session-count" aria-live="polite">
        {countText}
      </span>
    </div>
  ) : null;

  if (variant === 'chip') {
    if (!mp.available) return null;
    return chip;
  }

  if (variant === 'hud') {
    return (
      <div className="hud-session">
        <button
          type="button"
          className="hud-gear"
          aria-label="Session settings"
          aria-expanded={open}
          aria-controls="hud-session-panel"
          onClick={() => {
            if (bridge) bridge.emit('uiBeep');
            setOpen((value) => !value);
          }}
        >
          <GearIcon />
        </button>
        {chip}
        {open && (
          <div id="hud-session-panel" className="session-pop" role="dialog" aria-label="Live session">
            <h2>Live session</h2>
            {body}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="session-panel" aria-label="Live session">
      <h3>Live session</h3>
      {chip}
      {body}
    </section>
  );
}
