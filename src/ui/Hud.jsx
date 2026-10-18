import { GearIcon } from './SettingsPanel.jsx';
import SessionControls from './SessionControls.jsx';

export default function Hud({ bridge, snapshot, showFlightGear, flightSettingsOpen, onFlightGear }) {
  const hud = snapshot.hud || {};
  const hullPct = Number.isFinite(hud.hullPct) ? hud.hullPct : 100;
  const hullLow = hullPct <= 35;
  const hullCrit = hullPct <= 15;
  const hotbar = hud.hotbar;
  const slots = hotbar && Array.isArray(hotbar.slots) ? hotbar.slots : [];

  return (
    <div id="hud" className="hud">
      <div className="hud-top">
        <div
          id="hull-readout"
          className={`hull-readout${hullLow ? ' low' : ''}${hullCrit ? ' crit' : ''}`}
        >
          <div
            className="hull-meter"
            role="meter"
            aria-label="Hull integrity"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={hullPct}
            aria-valuetext={hud.hull ?? '100'}
          >
            <div className="hull-meter-fill" style={{ width: `${hullPct}%` }} />
          </div>
        </div>
        <div className="flight-tools">
          {showFlightGear ? (
            <button
              type="button"
              className="flight-gear"
              aria-label="Settings"
              aria-haspopup="dialog"
              aria-expanded={flightSettingsOpen ? 'true' : 'false'}
              aria-controls="flight-settings"
              onClick={onFlightGear}
            >
              <GearIcon />
            </button>
          ) : null}
          <SessionControls
            bridge={bridge}
            variant="chip"
            inGame
            missionId={snapshot.missionId || 'add'}
          />
        </div>
      </div>
      <p id="hint" className={`hint${snapshot.mapUnlocked ? ' hint-beside-map' : ''}`}>
        {hud.hint || ''}
      </p>
      {slots.length > 0 && (
        <div
          id="hotbar"
          className={`hotbar${snapshot.mapUnlocked ? ' hotbar-clear-map' : ''}`}
          role="toolbar"
          aria-label="Ship tools"
        >
          <span className="hotbar-caption">{hotbar.label || 'Empty'}</span>
          {slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              className={`hotbar-slot${slot.selected ? ' selected' : ''}${slot.available ? '' : ' empty'}`}
              aria-pressed={slot.selected ? 'true' : 'false'}
              aria-label={
                slot.available
                  ? slot.label + ', slot ' + slot.key
                  : 'Empty slot ' + slot.key
              }
              onClick={() => bridge.emit('selectHotbar', slot.index)}
            >
              <span className="hotbar-key">{slot.key}</span>
              {slot.available && slot.icon ? (
                <img src={slot.icon} alt="" draggable={false} />
              ) : null}
              {slot.badge ? <span className="hotbar-badge">{slot.badge}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
