export default function Hud({ bridge, snapshot }) {
  const hud = snapshot.hud || {};
  const hullPct = Number.isFinite(hud.hullPct) ? hud.hullPct : 100;
  const hullLow = hullPct <= 35;
  const hullCrit = hullPct <= 15;

  return (
    <div id="hud" className="hud">
      <div className="hud-top">
        <div className="brand">
          <span className="brand-mark">Mentaris</span>
          <span className="brand-sub" id="mission-readout">
            {hud.mission || 'Prisms of Assembly'}
          </span>
        </div>
        <div id="buffer" className={`buffer${hud.bufferBad ? ' bad' : ''}`}>
          <span id="question-readout">{hud.question || ''}</span>
          <strong id="buffer-value">{hud.buffer || ''}</strong>
        </div>
        <div className="hud-stats">
          <div id="solved-readout">
            <span>Rocks</span>
            <strong id="solved-value">{hud.rocks ?? '0'}</strong>
          </div>
          <div
            id="hull-readout"
            className={`hull-readout${hullLow ? ' low' : ''}${hullCrit ? ' crit' : ''}`}
          >
            <span>Hull</span>
            <strong id="hull-value">{hud.hull ?? '100'}</strong>
            <div
              className="hull-meter"
              role="meter"
              aria-label="Hull integrity"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={hullPct}
            >
              <div className="hull-meter-fill" style={{ width: `${hullPct}%` }} />
            </div>
          </div>
          <div id="cargo-readout">
            <span>Cargo</span>
            <strong id="cargo-value">{hud.cargo ?? '0'}</strong>
          </div>
          <div id="bank-readout">
            <span>Bank</span>
            <strong id="bank-value">{hud.bank ?? '0'}</strong>
          </div>
          <div id="speed-readout">
            <span>Speed</span>
            <strong id="speed-value">{hud.speed ?? '0'}</strong>
          </div>
          <button
            id="mute"
            className="btn"
            type="button"
            onClick={() => bridge.emit('toggleMute')}
          >
            {snapshot.muted ? 'Sound off' : 'Sound on'}
          </button>
        </div>
      </div>
      <p id="hint" className="hint">
        {hud.hint || ''}
      </p>
    </div>
  );
}
