import { useEffect, useRef } from 'react';

export const DEFAULT_SEED = 'belt-7';
export const DEFAULT_MISSION = 'add';

export const MISSIONS = [
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

const DEFAULT_NOTE =
  'The same seed builds the same belt. Launch uses the mission and seed chosen here.';

export function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.12.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.41 1.05.72 1.63.94l.36 2.54c.05.24.25.42.5.42h3.84c.25 0 .45-.18.5-.42l.36-2.54c.58-.22 1.12-.53 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
      />
    </svg>
  );
}

export default function SettingsPanel({
  id = 'home-settings',
  titleId = 'home-settings-title',
  seedInputId = 'seed',
  missionIdPrefix = 'mission',
  seed,
  mission,
  hidden = false,
  modal = false,
  note = DEFAULT_NOTE,
  closeRef: closeRefProp,
  onSeed,
  onMission,
  onClose,
}) {
  const localCloseRef = useRef(null);
  const closeRef = closeRefProp || localCloseRef;

  useEffect(() => {
    if (closeRefProp || hidden) return undefined;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [closeRefProp, hidden, closeRef]);

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
    onMission(next);
    document.getElementById(`${missionIdPrefix}-${next}`)?.focus();
  }

  return (
    <div
      id={id}
      className="home-settings"
      role="dialog"
      aria-modal={modal ? 'true' : 'false'}
      aria-labelledby={titleId}
      hidden={hidden}
    >
      <div className="home-settings-head">
        <div>
          <h2 id={titleId}>Settings</h2>
          <p className="home-settings-note">{note}</p>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="btn home-settings-close"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <label className="seed-field" htmlFor={seedInputId}>
        World seed
        <input
          id={seedInputId}
          value={seed}
          maxLength={24}
          autoComplete="off"
          spellCheck={false}
          aria-label="World seed"
          onChange={(event) => onSeed(event.target.value)}
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
              id={`${missionIdPrefix}-${item.id}`}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`btn home-mission${selected ? ' is-selected' : ''}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onMission(item.id)}
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
  );
}
