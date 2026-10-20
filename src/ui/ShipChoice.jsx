import { useMemo, useState } from 'react';
import { DEFAULT_SHIP, SHIP_FILES } from '../game/assetsManifest.js';
import { multiplayer } from '../multiplayer/session.js';
import { SESSION_FULL_MESSAGE, previewShipOffer } from '../multiplayer/ships.js';
import { useMultiplayer } from './SessionControls.jsx';

function prettyShip(name) {
  return String(name || '').replace(/\.png$/i, '');
}

function shipSrc(name) {
  return '/assets/ships/' + encodeURIComponent(name);
}

export function shipPreviewActive() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('ship-preview') === '1';
}

function offerCopy(count) {
  if (count <= 1) return 'One ship is still free. Pick it before you fly.';
  if (count === 2) return 'Two ships are still free. Pick one before you fly.';
  return 'Three ships are free. Pick one before you fly. If someone else takes it first, you get a new trio.';
}

export default function ShipChoice({ bridge }) {
  const live = useMultiplayer();
  const preview = shipPreviewActive();
  const [highlight, setHighlight] = useState('');
  const previewOffer = useMemo(
    () => (preview ? previewShipOffer(SHIP_FILES, DEFAULT_SHIP) : []),
    [preview]
  );
  const offer = preview ? previewOffer : live.shipOffer || [];
  const full = !preview && live.sessionFull;
  const open = preview || live.needsShip || full;
  if (!open) return null;

  function pick(name) {
    if (preview) {
      setHighlight(name);
      return;
    }
    if (!multiplayer.chooseShip(name)) return;
    if (bridge) bridge.emit('setShip', name);
    const snap = bridge ? bridge.getSnapshot() : null;
    const now = multiplayer.getSnapshot();
    if (bridge && snap && snap.mode !== 'title' && now.seed && now.ship && snap.seed !== now.seed) {
      bridge.emit('startMission', {
        missionId: now.hostMission || snap.missionId || 'add',
        seed: now.seed,
      });
    }
  }

  return (
    <div className="overlay ship-choice" role="dialog" aria-modal="true" aria-labelledby="ship-choice-title">
      <div className="ship-choice-card">
        {full ? (
          <>
            <h2 id="ship-choice-title">Session full</h2>
            <p>{SESSION_FULL_MESSAGE}</p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                multiplayer.leave();
              }}
            >
              Leave session
            </button>
          </>
        ) : (
          <>
            <h2 id="ship-choice-title">Choose a ship</h2>
            <p>{offerCopy(offer.length)}</p>
            <div className="ship-choice-grid">
              {offer.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={highlight === name ? 'is-selected' : ''}
                  onClick={() => pick(name)}
                >
                  <img src={shipSrc(name)} alt="" />
                  <span>{prettyShip(name)}</span>
                </button>
              ))}
            </div>
            {!preview && (
              <button
                type="button"
                className="btn ship-choice-leave"
                onClick={() => {
                  multiplayer.leave();
                }}
              >
                Leave session
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
