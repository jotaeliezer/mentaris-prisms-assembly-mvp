import { useEffect, useRef, useState } from 'react';
import { readPilotName } from '../game/pilot.js';
import { multiplayer } from '../multiplayer/session.js';
import { useMultiplayer } from './SessionControls.jsx';

export default function SessionChat({ open, onClose }) {
  const live = useMultiplayer();
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const lines = Array.isArray(live.chats) ? live.chats : [];

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  if (!open) return null;

  function send(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (!live.connected) return;
    multiplayer.publishChat(text, readPilotName());
    setDraft('');
  }

  return (
    <form className="session-chat" onSubmit={send}>
      <div className="session-chat-head">
        <span>Session chat</span>
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="session-chat-log" aria-live="polite">
        {live.connected ? null : <p>Host or join a session before chatting.</p>}
        {lines.map((line) => (
          <p key={line.id + ':' + line.t}>
            <strong>{line.pilot}</strong> {line.text}
          </p>
        ))}
      </div>
      <input
        ref={inputRef}
        value={draft}
        maxLength={140}
        placeholder={live.connected ? 'Message' : 'Not in a session'}
        disabled={!live.connected}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.code === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
      />
    </form>
  );
}
