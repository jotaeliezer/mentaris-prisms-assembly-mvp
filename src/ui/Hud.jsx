export default function Hud({ snapshot }) {
  const hud = snapshot.hud || {};
  const hullPct = Number.isFinite(hud.hullPct) ? hud.hullPct : 100;
  const hullLow = hullPct <= 35;
  const hullCrit = hullPct <= 15;

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
      </div>
      <p id="hint" className="hint">
        {hud.hint || ''}
      </p>
    </div>
  );
}
