import { GearIcon } from './SettingsPanel.jsx';
import SessionControls from './SessionControls.jsx';

export default function Hud({ bridge, snapshot, showFlightGear, flightSettingsOpen, onFlightGear }) {
  const hud = snapshot.hud || {};
  const hullPct = Number.isFinite(hud.hullPct) ? hud.hullPct : 100;
  const hullLow = hullPct <= 35;
  const hullCrit = hullPct <= 15;
  const hotbar = hud.hotbar;
  const slots = hotbar && Array.isArray(hotbar.slots) ? hotbar.slots : [];
  const cargo = snapshot.cargoHold;
  const cargoSlots = cargo && Array.isArray(cargo.slots) ? cargo.slots : [];
  const cargoOpen = !!snapshot.cargoOpen;

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
          className={`hotbar-dock${snapshot.mapUnlocked ? ' hotbar-clear-map' : ''}`}
        >
          {cargoOpen && (
            <div id="cargo" className="cargo-drawer" role="dialog" aria-label="Cargo">
              <p className="cargo-title">Cargo</p>
              <div className="cargo-grid">
                {cargoSlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    className={`hotbar-slot cargo-slot${slot.available ? '' : ' empty'}`}
                    aria-label={slot.available ? slot.label : 'Empty cargo'}
                    onClick={() => bridge.emit('cargoToHotbar', { cargoIndex: slot.index })}
                  >
                    {slot.available ? (
                      <span className="hotbar-swatch" style={{ background: slot.color }}>
                        {slot.mark}
                      </span>
                    ) : null}
                    {slot.badge ? <span className="hotbar-badge">{slot.badge}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div id="hotbar" className="hotbar" role="toolbar" aria-label="Ship tools">
            {slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className={`hotbar-slot${slot.selected ? ' selected' : ''}${slot.available ? '' : ' empty'}`}
                aria-pressed={slot.selected ? 'true' : 'false'}
                aria-label={
                  slot.available ? slot.label + ', slot ' + slot.key : 'Empty slot ' + slot.key
                }
                onClick={() => bridge.emit('selectHotbar', slot.index)}
                onDoubleClick={() => {
                  if (!cargoOpen || !slot.available) return;
                  bridge.emit('hotbarToCargo', { index: slot.index });
                }}
              >
                <span className="hotbar-key">{slot.key}</span>
                {slot.available ? (
                  <span className="hotbar-swatch" style={{ background: slot.color }}>
                    {slot.mark}
                  </span>
                ) : null}
                {slot.badge ? <span className="hotbar-badge">{slot.badge}</span> : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
